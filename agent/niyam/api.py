"""Niyam public API.

Run:  uvicorn niyam.api:app --host 0.0.0.0 --port 8000

Read endpoints work without a key at a low rate limit, so anyone (and every
judge) can try them. Starting agent jobs (bring your own document) needs a key
or uses the small anonymous daily allowance. Errors are JSON with a code,
a plain-English message and a link to the docs.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import re
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import db, keys, orchestrator, rulebook
from .config import REPO_DIR, settings
from .sources import watcher

DOCS = "https://github.com/usv240/niyam#api"
DISCLAIMER = "Information only. Final eligibility is decided by the government department."
ID_LIKE = re.compile(r"^(\d{4}\s?\d{4}\s?\d{4}|[6-9]\d{9}|\+91\d{10})$")  # Aadhaar or phone numbers

app = FastAPI(title="Niyam API", version="1.0", description="Welfare eligibility rules that stay in sync with the law.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], expose_headers=["*"])


# ------------------------------------------------------------------ rulebook
class _RB:
    """The rulebook engine, loaded in-process from the main checkout and reloaded when main changes."""

    def __init__(self) -> None:
        self._sha = None
        self._rb = None
        self._lock = threading.Lock()

    def get(self):
        sha = rulebook.git("rev-parse", "HEAD", cwd=rulebook.main_path(), check=False)
        with self._lock:
            if self._rb is None or sha != self._sha:
                if str(rulebook.main_path()) not in sys.path:
                    sys.path.insert(0, str(rulebook.main_path()))
                from niyam_rulebook.engine import Rulebook  # noqa: WPS433
                self._rb, self._sha = Rulebook(rulebook.main_path()), sha
        return self._rb, self._sha


RB = _RB()


def error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message, "docs_url": DOCS})


@app.exception_handler(HTTPException)
async def _http_error(_req: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "error", "message": str(exc.detail), "docs_url": DOCS}
    return JSONResponse(status_code=exc.status_code, content={"error": detail}, headers=getattr(exc, "headers", None))


def client_ident(request: Request, authorization: str | None) -> tuple[dict | None, str, str]:
    key = None
    if authorization and authorization.lower().startswith("bearer "):
        key = keys.lookup(authorization.split(" ", 1)[1])
        if key is None:
            raise error(401, "invalid_key", "That API key is not valid or has been revoked.")
    tier = key["tier"] if key else "anonymous"
    ident = key["id"] if key else (request.client.host if request.client else "unknown")
    return key, ident, tier


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if not request.url.path.startswith("/api/v1") or request.url.path.endswith("/events"):
        return await call_next(request)
    try:
        key, ident, tier = client_ident(request, request.headers.get("authorization"))
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    per_min = keys.TIERS[tier][0]
    ok, remaining, reset = keys.limiter.allow(ident, per_min)
    if not ok:
        return JSONResponse(status_code=429, headers={"Retry-After": str(int(reset) + 1)},
                            content={"error": {"code": "rate_limited", "docs_url": DOCS,
                                               "message": f"Too many requests. Try again in {int(reset) + 1} seconds, or use an API key for higher limits."}})
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(per_min)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    if key:
        keys.record_usage(key["id"])
    return response


# ------------------------------------------------------------------ models
class Person(BaseModel):
    age: int | None = Field(None, description="Age in completed years")
    gender: str | None = None
    state: str | None = "MH"
    marital_status: str | None = None
    other_unmarried_beneficiary_in_family: bool | None = None
    annual_family_income: float | None = None
    family_income_tax_payer: bool | None = None
    family_govt_job: str | None = None
    has_bank_account: bool | None = None
    other_scheme_monthly_inr: float | None = None
    family_mp_mla: bool | None = None
    family_govt_board_office: bool | None = None
    family_farm_land_acres: float | None = None
    family_four_wheeler: bool | None = None
    ration_card: str | None = None
    date: str | None = Field(None, description="Assess on this date (YYYY-MM-DD). Default: today")

    model_config = {"extra": "allow"}


def _checkpoints_by_doc() -> dict[str, dict[str, Any]]:
    """Map source document code -> the job, PR and Entire checkpoint that encoded it."""
    out = {}
    for j in db.rows("SELECT j.id, j.pr_url, j.commit_sha, j.checkpoint_id, j.trace_id, d.code FROM jobs j "
                     "JOIN documents d ON d.id = j.document_id WHERE j.commit_sha IS NOT NULL AND j.is_byod = 0 "
                     "AND j.eval_case IS NULL ORDER BY j.updated_at"):
        if j["code"]:
            out[j["code"]] = {"job_id": j["id"], "pr_url": j["pr_url"], "commit_sha": j["commit_sha"],
                              "checkpoint_id": j["checkpoint_id"], "trace_id": j["trace_id"],
                              "checkpoint_url": f"https://entire.io/gh/{settings.rulebook_repo}/commit/{j['commit_sha']}"}
    return out


def _enrich(source: dict[str, Any], rb, provenance: dict[str, dict]) -> dict[str, Any]:
    doc = rb.sources.get(source.get("doc", ""), {})
    code = str(doc.get("code", ""))
    return {**source, "document": {"title_en": doc.get("title_en"), "title_mr": doc.get("title_mr"), "date": str(doc.get("date")),
                                   "url": doc.get("url"), "code": code}, "provenance": provenance.get(code)}


# ------------------------------------------------------------------ routes
@app.get("/api/v1/health")
def health():
    _rb, sha = RB.get()
    return {"ok": True, "rulebook_version": sha[:7] if sha else None, "time": dt.datetime.now(dt.timezone.utc).isoformat()}


@app.get("/api/v1/schemes")
def schemes():
    rb, sha = RB.get()
    out = []
    for sid, s in rb.schemes.items():
        changes = sorted({str(v.start) for p in s.params.values() for v in p.values} | {str(c.valid_from) for c in s.conditions})
        out.append({"id": sid, "name": s.name, "name_mr": s.data.get("name_mr"), "summary": s.data.get("summary"),
                    "department": s.data.get("department"), "launched": str(s.data.get("launched")),
                    "last_changed": changes[-1] if changes else None, "conditions": len([c for c in s.conditions if c.active(dt.date.today())]),
                    "apply_url": s.data.get("apply_url")})
    return {"rulebook_version": sha[:7], "schemes": out}


@app.get("/api/v1/schemes/{scheme_id}/rules")
def scheme_rules(scheme_id: str, at: str | None = None):
    rb, sha = RB.get()
    if scheme_id not in rb.schemes:
        raise error(404, "unknown_scheme", f"No scheme with id {scheme_id}. See /api/v1/schemes.")
    try:
        r = rb.rules_at(scheme_id, at)
    except ValueError:
        raise error(400, "bad_date", "Use a date like 2024-07-10.")
    prov = _checkpoints_by_doc()
    for c in r["conditions"]:
        c["source"] = _enrich(c["source"], rb, prov)
    for p in r["parameters"].values():
        p["reference"] = _enrich(p["reference"], rb, prov)
    return {"rulebook_version": sha[:7], **r, "disclaimer": DISCLAIMER}


@app.get("/api/v1/schemes/{scheme_id}/history")
def scheme_history(scheme_id: str):
    rb, sha = RB.get()
    s = rb.schemes.get(scheme_id)
    if not s:
        raise error(404, "unknown_scheme", f"No scheme with id {scheme_id}.")
    prov = _checkpoints_by_doc()
    events = []
    for name, p in s.params.items():
        prev = None
        for v in p.values:
            events.append({"date": str(v.start), "kind": "parameter", "name": name, "description": p.description,
                           "from": prev, "to": v.value, "source": _enrich(v.reference, rb, prov)})
            prev = v.value
    for c in s.conditions:
        events.append({"date": str(c.valid_from), "kind": "condition_start", "name": c.id, "text": c.text, "source": _enrich(c.source, rb, prov)})
        if c.valid_until:
            events.append({"date": str(c.valid_until + dt.timedelta(days=1)), "kind": "condition_end", "name": c.id, "text": c.text,
                           "source": _enrich(c.source, rb, prov)})
    events.sort(key=lambda e: e["date"])
    return {"rulebook_version": sha[:7], "scheme": scheme_id, "events": events}


@app.post("/api/v1/eligibility")
def eligibility(person: Person):
    rb, sha = RB.get()
    data = person.model_dump(exclude_none=True)
    on = data.pop("date", None)
    for k, v in data.items():
        if isinstance(v, str) and ID_LIKE.match(v.strip()):
            raise error(400, "personal_data_rejected", f"Field {k} looks like an ID or phone number. Niyam never needs personal identifiers.")
    try:
        results = rb.evaluate(data, on)
    except ValueError as e:
        raise error(400, "invalid_person", str(e))
    prov = _checkpoints_by_doc()
    out = []
    for sid, r in results.items():
        s = rb.schemes[sid]
        out.append({"scheme_id": sid, "name": s.name, "name_mr": s.data.get("name_mr"), "eligible": r["eligible"],
                    "in_force": r["in_force"], "monthly_benefit_inr": r["monthly_inr"], "apply_url": s.data.get("apply_url"),
                    "reasons": [{"rule": x["text"], "met": x["met"], "id": x["id"], "source": _enrich(x["source"], rb, prov)} for x in r["reasons"]]})
    return {"as_of": on or dt.date.today().isoformat(), "rulebook_version": sha[:7], "results": out, "disclaimer": DISCLAIMER}


def _job_public(j: dict[str, Any]) -> dict[str, Any]:
    doc = db.row("SELECT title, code, source, source_url, published_at FROM documents WHERE id = ?", j["document_id"]) or {}
    cs = j.get("changeset") or {}
    verdict = j.get("verdict") or {}
    res = j.get("resolution") or {}
    return {
        "id": j["id"], "state": j["state"], "document": doc, "is_byod": bool(j.get("is_byod")), "is_chaos": bool(j.get("is_chaos")),
        "eval_case": j.get("eval_case"), "version": j.get("version"),
        "triage": j.get("triage"), "changes": cs.get("changes", []), "ambiguities": cs.get("ambiguities", []),
        "skipped": cs.get("skipped", []), "title_en": cs.get("title_en"),
        "verdict": {k: verdict.get(k) for k in ("cases_valid", "cases_agree", "cases_disagree", "agreement_rate", "verdict")} if verdict else None,
        "verifier_cases": verdict.get("cases", []) if verdict else [],
        "resolutions": res.get("resolutions", []), "reasons": res.get("reasons", []),
        "encode": {k: (res.get("encode") or {}).get(k) for k in ("attempts", "files", "tests", "rounds")},
        "confidence": j.get("confidence"), "decision": j.get("autonomy_decision"), "pr_url": j.get("pr_url"),
        "commit_sha": j.get("commit_sha"), "checkpoint_id": j.get("checkpoint_id"),
        "checkpoint_url": f"https://entire.io/gh/{settings.rulebook_repo}/commit/{j['commit_sha']}" if j.get("commit_sha") else None,
        "trace_id": j.get("trace_id"), "cost_usd": round(j.get("cost_usd") or 0, 4),
        "started_at": j.get("started_at"), "finished_at": j.get("finished_at"), "error": j.get("error"),
    }


@app.get("/api/v1/jobs")
def jobs(limit: int = 20, include_evals: bool = False):
    q = "SELECT id FROM jobs " + ("" if include_evals else "WHERE eval_case IS NULL ") + "ORDER BY started_at DESC LIMIT ?"
    return {"jobs": [_job_public(db.job(r["id"])) for r in db.rows(q, min(limit, 100))]}


@app.get("/api/v1/jobs/{job_id}")
def job_detail(job_id: str):
    j = db.job(job_id)
    if not j:
        raise error(404, "unknown_job", "No job with that id.")
    out = _job_public(j)
    out["events"] = db.rows("SELECT id, ts, type, stage, message, payload_json FROM job_events WHERE job_id = ? ORDER BY id", job_id)
    return out


@app.get("/api/v1/jobs/{job_id}/events")
async def job_events(job_id: str, after: int = 0):
    if not db.job(job_id):
        raise error(404, "unknown_job", "No job with that id.")

    async def stream():
        last = after
        idle = 0
        while idle < 1800:
            evs = db.rows("SELECT id, ts, type, stage, message, payload_json FROM job_events WHERE job_id = ? AND id > ? ORDER BY id", job_id, last)
            for e in evs:
                last = e["id"]
                yield f"id: {e['id']}\nevent: niyam\ndata: {json.dumps(e, ensure_ascii=False)}\n\n"
            state = (db.row("SELECT state FROM jobs WHERE id = ?", job_id) or {}).get("state")
            if state in orchestrator.TERMINAL and not evs:
                yield f"event: done\ndata: {json.dumps({'state': state})}\n\n"
                return
            idle = 0 if evs else idle + 1
            await asyncio.sleep(1)

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/v1/changes")
def changes(limit: int = 30):
    out = []
    for r in db.rows("SELECT id FROM jobs WHERE commit_sha IS NOT NULL AND eval_case IS NULL AND is_byod = 0 ORDER BY finished_at DESC LIMIT ?", limit):
        j = _job_public(db.job(r["id"]))
        out.append({k: j[k] for k in ("id", "state", "document", "title_en", "changes", "confidence", "decision", "pr_url", "checkpoint_url", "finished_at")})
    return {"changes": out}


def _start_job_thread(job_id: str) -> None:
    threading.Thread(target=orchestrator.run_job, args=(job_id,), daemon=True, name=f"job-{job_id}").start()


@app.post("/api/v1/documents", status_code=202)
async def submit_document(request: Request, file: UploadFile | None = File(None), url: str | None = Form(None),
                          authorization: str | None = Header(None)):
    key, ident, tier = client_ident(request, authorization)
    if key and "run" not in key["scopes"].split(","):
        raise error(403, "missing_scope", "This key does not have the run scope.")
    daily = keys.TIERS[tier][1]
    owner = key["id"] if key else f"ip:{ident}"
    used = db.row("SELECT COUNT(*) AS n FROM jobs WHERE owner_key_id = ? AND started_at > ?", owner, time.time() - 86400)["n"]
    if used >= daily:
        raise error(429, "daily_limit", f"You have used {used} of {daily} document runs today. Create a free API key for more.")
    if file is None and not url:
        raise error(400, "missing_document", "Upload a PDF as 'file' or give a 'url'.")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        if file is not None:
            data = await file.read()
        else:
            if not re.match(r"^https://", url or ""):
                raise error(400, "bad_url", "Only https links are accepted.")
            async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers={"User-Agent": watcher.UA}) as c:
                resp = await c.get(url)
            data = resp.content
        if len(data) > 10 * 1024 * 1024:
            raise error(413, "too_large", "PDFs up to 10 MB are accepted.")
        if not data.startswith(b"%PDF"):
            raise error(415, "not_pdf", "That file is not a PDF.")
        tmp.write(data)
        path = Path(tmp.name)
    try:
        from .pdftext import read_pdf
        if read_pdf(path).page_count > 30:
            raise error(413, "too_many_pages", "Documents up to 30 pages are accepted.")
        doc_id = orchestrator.add_document(path, "byod", {"title": file.filename if file else url, "source_url": url}, dedup=False)
    finally:
        path.unlink(missing_ok=True)
    job_id = orchestrator.create_job(doc_id, is_byod=True, owner_key_id=owner)
    if key:
        keys.record_usage(key["id"], calls=0, jobs=1)
    _start_job_thread(job_id)
    return {"job_id": job_id, "state": "NEW", "events_url": f"/api/v1/jobs/{job_id}/events",
            "note": "Runs on a sandbox branch of the rulebook. Nothing official changes, and it is never merged automatically."}


class KeyRequest(BaseModel):
    name: str = Field(..., max_length=80, description="What you will use the key for")
    contact: str | None = Field(None, max_length=120, description="Optional, so we can reach you about changes")


_key_creations: dict[str, list[float]] = {}


@app.post("/api/v1/keys", status_code=201)
def create_key(req: KeyRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    recent = [t for t in _key_creations.get(ip, []) if t > time.time() - 3600]
    if len(recent) >= 5:
        raise error(429, "too_many_keys", "Too many keys created from this address in the last hour.")
    _key_creations[ip] = recent + [time.time()]
    k = keys.create(req.name.strip(), req.contact or f"ip:{ip}")
    return {**k, "message": "Copy this key now. It will not be shown again."}


@app.get("/api/v1/usage")
def usage(request: Request, authorization: str | None = Header(None)):
    key, _ident, _tier = client_ident(request, authorization)
    if not key:
        raise error(401, "key_required", "Send your key as 'Authorization: Bearer niyam_live_...'.")
    return {"key": {"id": key["id"], "name": key["name"], "last4": key["last4"], "tier": key["tier"], "scopes": key["scopes"].split(",")},
            "days": db.rows("SELECT day, calls, jobs, cost_usd FROM usage WHERE key_id = ? ORDER BY day DESC LIMIT 30", key["id"])}


@app.get("/api/v1/status")
def status():
    last = db.row("SELECT id, state, finished_at FROM jobs WHERE eval_case IS NULL ORDER BY started_at DESC LIMIT 1")
    running = db.row("SELECT COUNT(*) AS n FROM jobs WHERE state NOT IN (%s)" % ",".join("?" * len(orchestrator.TERMINAL)), *orchestrator.TERMINAL)["n"]
    return {"sources": watcher.source_status(), "running_jobs": running, "last_job": last,
            "tracing": __import__("niyam.llm", fromlist=["x"]).tracing_enabled()}


@app.get("/api/v1/evals")
def evals():
    out = []
    for p in sorted((REPO_DIR / "evals" / "results").glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        out.append({"version": d["version"], "note": d.get("note"), "ran_at": d.get("ran_at"), "summary": d["summary"], "results": d["results"]})
    return {"versions": out}
