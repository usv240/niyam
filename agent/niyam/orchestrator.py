"""The Niyam agent loop: one job per document, moved through a persisted state machine.

NEW -> TRIAGED -> EXTRACTED -> ENCODED -> VERIFIED -> PUBLISHED
            \\-> CLOSED_IRRELEVANT        \\-> (RESOLVE -> ENCODE again, up to 3 times)
Any state -> FAILED, AWAITING_HUMAN or NEEDS_HUMAN, always with a reason.

Every state is saved before the next step starts, so a crash resumes from the
last completed step. Every run is one neatlogs trace with a span per stage.
"""

from __future__ import annotations

import datetime as dt
import json
import re
import shutil
import time
import traceback
from pathlib import Path
from typing import Any

from . import db, llm, rulebook
from .confidence import decide, score
from .config import settings
from .models import ChangeSet, Triage
from .pdftext import find_gr_code, read_pdf
from .stages import encode, extract, publish, resolve, triage, verify

TERMINAL = {"PUBLISHED", "AUTO_MERGED", "READY_TO_MERGE", "AWAITING_HUMAN", "NEEDS_HUMAN", "CLOSED_IRRELEVANT", "FAILED", "NO_CHANGES"}


# --------------------------------------------------------------------------- intake
def add_document(pdf_path: Path, source: str, meta: dict[str, Any] | None = None, dedup: bool = True) -> str:
    """Store a document and return its id. With dedup, the same file returns the same document."""
    meta = dict(meta or {})
    doc = read_pdf(pdf_path)
    existing = db.row("SELECT id FROM documents WHERE sha256 = ?", doc.sha256)
    if existing and dedup:
        return existing["id"]
    sha_key = doc.sha256 if not existing else f"{doc.sha256}#{db.new_id('copy')}"
    doc_id = db.new_id("doc")
    store = settings.corpus_dir / "documents"
    store.mkdir(parents=True, exist_ok=True)
    local = store / f"{doc.sha256[:16]}.pdf"
    if not local.exists():
        shutil.copyfile(pdf_path, local)
    code = meta.get("code") or find_gr_code(doc.joined())
    with db.tx() as c:
        c.execute(
            "INSERT INTO documents (id, source, source_url, sha256, title, code, language, published_at, fetched_at, local_path, meta_json)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (doc_id, source, meta.get("source_url"), sha_key, meta.get("title"), code, meta.get("language", "mr"),
             meta.get("published_at"), dt.datetime.now(dt.timezone.utc).isoformat(), str(local),
             json.dumps(meta, ensure_ascii=False)),
        )
    return doc_id


def create_job(document_id: str, *, is_byod: bool = False, eval_case: str | None = None,
               version: str | None = None, owner_key_id: str | None = None) -> str:
    job_id = db.new_id("job")
    with db.tx() as c:
        c.execute(
            "INSERT INTO jobs (id, document_id, state, started_at, updated_at, is_chaos, is_byod, eval_case, version, owner_key_id)"
            " VALUES (?,?,?,?,?,?,?,?,?,?)",
            (job_id, document_id, "NEW", time.time(), time.time(), int(bool(settings.chaos)), int(is_byod),
             eval_case, version, owner_key_id),
        )
    db.add_event(job_id, "job.created", "Job created", payload={"chaos": sorted(settings.chaos)})
    return job_id


# --------------------------------------------------------------------------- run
class Run:
    def __init__(self, job_id: str):
        self.id = job_id
        self.job = db.job(job_id)
        if not self.job:
            raise KeyError(job_id)
        self.doc = db.row("SELECT * FROM documents WHERE id = ?", self.job["document_id"])
        self.meta = json.loads(self.doc.get("meta_json") or "{}")
        self.pdf = Path(self.doc["local_path"])
        self.state_data: dict[str, Any] = self.job.get("resolution") or {}
        self.usage = llm.Usage(cost_usd=self.job.get("cost_usd") or 0.0)

    # helpers -------------------------------------------------------------
    def event(self, kind: str, message: str, stage: str | None = None, payload: dict[str, Any] | None = None) -> None:
        db.add_event(self.id, kind, message, stage=stage, payload=payload)
        print(f"[{self.id}] {kind}: {message}")

    def save(self, state: str, **fields: Any) -> None:
        fields["resolution_json"] = self.state_data
        fields["cost_usd"] = round(self.usage.cost_usd, 6)
        fields["tokens_in"] = self.usage.tokens_in
        fields["tokens_out"] = self.usage.tokens_out
        db.update_job(self.id, state=state, **fields)
        self.job["state"] = state
        self.event("state", f"State is now {state}", payload={"state": state})

    @property
    def state(self) -> str:
        return self.job["state"]

    # main ----------------------------------------------------------------
    def execute(self) -> dict[str, Any]:
        token_usage = llm.current_usage.set(self.usage)
        token_chaos = llm.chaos_used.set(set())
        token_sink = llm._event_sink.set(lambda kind, msg: self.event(kind, msg))
        try:
            with llm.span(f"niyam.job {self.doc.get('title') or self.doc.get('code') or self.id}", kind="WORKFLOW") as root:
                trace_id = llm.current_trace_id()
                for key, value in {"niyam.job_id": self.id, "niyam.document_code": self.doc.get("code"),
                                   "niyam.eval_case": self.job.get("eval_case"), "niyam.version": self.job.get("version"),
                                   "niyam.chaos": ",".join(sorted(settings.chaos)), "niyam.byod": bool(self.job.get("is_byod")),
                                   "niyam.resumed_from": self.state}.items():
                    llm.set_attr(root, key, value or "")
                if trace_id and not self.job.get("trace_id"):
                    db.update_job(self.id, trace_id=trace_id)
                if self.state != "NEW":
                    self.event("orchestrator.resume", f"Resuming from state {self.state}")
                self._loop()
                llm.set_attr(root, "niyam.final_state", self.state)
                llm.set_attr(root, "niyam.cost_usd", round(self.usage.cost_usd, 4))
        except llm.ProviderLimitError as e:
            # Not the agent's fault and not worth retrying now: keep the saved state so `niyam run` resumes later.
            self.event("job.paused", "Paused: the model provider's usage limit is reached. Resume once it is raised.")
            self.save("FAILED", error_class="ProviderLimitError", error=str(e)[:500], finished_at=time.time())
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
            self.state_data["traceback"] = traceback.format_exc()[-4000:]
            self.event("job.failed", err)
            self.save("FAILED", error_class=type(e).__name__, error=err[:2000], finished_at=time.time())
        finally:
            llm.current_usage.reset(token_usage)
            llm.chaos_used.reset(token_chaos)
            llm._event_sink.reset(token_sink)
            llm.flush()
        return db.job(self.id)

    def _loop(self) -> None:
        while self.state not in TERMINAL:
            if self.usage.cost_usd > settings.job_budget_usd:
                self.event("budget.exceeded", f"Job cost ${self.usage.cost_usd:.2f} exceeds the ${settings.job_budget_usd:.2f} budget; asking a human")
                self.save("NEEDS_HUMAN", autonomy_decision="needs_human", finished_at=time.time())
                return
            step = {"NEW": self._triage, "TRIAGED": self._extract, "EXTRACTED": self._encode,
                    "ENCODED": self._verify, "VERIFIED": self._publish, "RESOLVING": self._resolve}[self.state]
            before = self.usage.cost_usd
            step()
            costs = self.state_data.setdefault("stage_costs", {})
            costs[step.__name__.strip("_")] = round(costs.get(step.__name__.strip("_"), 0) + self.usage.cost_usd - before, 5)
            db.update_job(self.id, resolution_json=self.state_data)

    # stages --------------------------------------------------------------
    def _triage(self) -> None:
        with llm.span("stage.triage", kind="AGENT") as s:
            self.event("stage.start", "Reading the opening pages to see if this document matters", stage="triage")
            doc = read_pdf(self.pdf)
            t = triage.run(doc, self.pdf, self.doc.get("title") or "", root=self._base())
            known = set(rulebook.scheme_ids(self._base()))
            t.scheme_ids = [x for x in t.scheme_ids if x in known]
            onboard = self.meta.get("onboard")
            if onboard and onboard not in known:
                # Coverage is a human decision: an operator asked to add this scheme from this order.
                t.relevant, t.document_kind, t.new_scheme_id, t.scheme_ids = True, "new_scheme", onboard, [onboard]
                t.reason = f"Operator asked to onboard {onboard} from this order. " + t.reason
                self.event("triage.onboard", f"Onboarding {onboard} on an operator's request", stage="triage")
            elif (t.relevant and t.document_kind == "new_scheme" and t.new_scheme_id and t.new_scheme_id not in known
                    and re.fullmatch(r"mh\.[a-z0-9_]{3,40}", t.new_scheme_id)):
                t.scheme_ids.append(t.new_scheme_id)
                self.event("triage.new_scheme", f"This order creates a scheme the rulebook does not have yet: {t.new_scheme_id}", stage="triage")
            llm.set_attr(s, "niyam.relevant", t.relevant)
            llm.set_attr(s, "niyam.schemes", ",".join(t.scheme_ids))
        self.event("stage.done", f"{'Relevant' if t.relevant else 'Not relevant'}: {t.reason}", stage="triage",
                   payload=t.model_dump())
        if not t.relevant or not t.scheme_ids:
            self.save("CLOSED_IRRELEVANT", triage_json=t.model_dump(), finished_at=time.time())
            return
        self.save("TRIAGED", triage_json=t.model_dump())

    def _extract(self) -> None:
        t = Triage(**self.job["triage"]) if isinstance(self.job.get("triage"), dict) else Triage(**db.job(self.id)["triage"])
        with llm.span("stage.extract", kind="AGENT") as s:
            self.event("stage.start", "Finding and quoting the clauses that change eligibility", stage="extract")
            doc = read_pdf(self.pdf)
            doc_date = t.document_date or self.meta.get("published_at")
            cs, _pages, rejected = extract.run(doc, self.pdf, t.scheme_ids, doc_date,
                                               lambda kind, msg: self.event(kind, msg, stage="extract"),
                                               rules_root=self._base())
            if not cs.document_code:
                cs.document_code = self.doc.get("code")
            llm.set_attr(s, "niyam.changes", len(cs.changes))
            llm.set_attr(s, "niyam.ambiguities", len(cs.ambiguities))
            llm.set_attr(s, "niyam.rejected_quotes", len(rejected))
        self.state_data["rejected_quotes"] = rejected
        self.event("stage.done", f"Found {len(cs.changes)} change(s), {len(cs.ambiguities)} ambiguity(ies), skipped {len(cs.skipped)} procedural topic(s)",
                   stage="extract", payload=json.loads(cs.model_dump_json()))
        if not cs.changes:
            self.save("NO_CHANGES", changeset_json=json.loads(cs.model_dump_json()), finished_at=time.time())
            return
        self.save("EXTRACTED", changeset_json=json.loads(cs.model_dump_json()))

    def _changeset(self) -> ChangeSet:
        return ChangeSet(**db.job(self.id)["changeset"])

    def _base(self) -> Path:
        """Clean checkout of the rules before this document (pinned at the first stage that needs it)."""
        ref = self.state_data.get("base_sha") or self.meta.get("base_ref", "main")
        path = rulebook.base_checkout(ref)
        self.state_data["base_sha"] = rulebook.git("rev-parse", "HEAD", cwd=path)
        return path

    def _worktree(self) -> tuple[Path, str]:
        base = self.state_data.get("base_sha") or self.meta.get("base_ref", "main")
        return rulebook.create_worktree(self.id, base=base)

    def _encode(self, fix_instruction: str | None = None) -> None:
        cs = self._changeset()
        wt, branch = self._worktree()
        enc_state = self.state_data.get("encode", {})
        with llm.span("stage.encode", kind="AGENT") as s:
            self.event("stage.start", "Coding agent is updating the rulebook and writing tests", stage="encode")
            result = encode.run(wt, cs, self.pdf, {**self.meta, "code": self.doc.get("code"), "source_url": self.doc.get("source_url")},
                                lambda kind, msg: self.event(kind, msg, stage="encode"),
                                session_id=enc_state.get("session_id") if fix_instruction else None,
                                fix_instruction=fix_instruction)
            self.usage.cost_usd += result["cost_usd"]
            llm.set_attr(s, "niyam.encoder_attempts", result["attempts"])
            llm.set_attr(s, "niyam.tests_passed", result["tests"].get("passed", 0))
            llm.set_attr(s, "niyam.encoder_cost_usd", round(result["cost_usd"], 4))
        enc_state.update({k: result[k] for k in ("session_id", "attempts", "ok", "files", "summary", "doc_key", "doc_code")})
        enc_state["tests"] = {k: result["tests"].get(k) for k in ("passed", "failed")}
        enc_state["rounds"] = enc_state.get("rounds", 0) + 1
        self.state_data["encode"] = enc_state
        if not result["ok"]:
            self.event("stage.failed", f"Tests still failing after {result['attempts']} attempts", stage="encode",
                       payload={"failures": result["tests"].get("failures", [])[:10]})
            self.save("NEEDS_HUMAN", branch=branch, autonomy_decision="needs_human", finished_at=time.time())
            return
        self.event("stage.done", f"Rulebook updated in {result['attempts']} attempt(s); {result['tests']['passed']} tests pass",
                   stage="encode", payload={"files": result["files"]})
        self.save("ENCODED", branch=branch)

    def _verify(self) -> None:
        cs = self._changeset()
        wt, _ = self._worktree()
        t = db.job(self.id)["triage"]
        with llm.span("stage.verify", kind="AGENT") as s:
            self.event("stage.start", "Independent verifier is writing its own test citizens from the law", stage="verify")
            plan = self.state_data.get("verifier_plan")
            if plan:
                from .models import VerifierPlan
                vplan = VerifierPlan(**plan)
            else:
                vplan = verify.plan(self.pdf, sorted({c.scheme_id for c in cs.changes}), t.get("document_date") or cs.document_date,
                                    rules_root=self._base())
                self.state_data["verifier_plan"] = json.loads(vplan.model_dump_json())
            verdict = verify.check(wt, vplan)
            llm.set_attr(s, "niyam.cases_agree", verdict["cases_agree"])
            llm.set_attr(s, "niyam.cases_disagree", verdict["cases_disagree"])
        self.event("stage.done", f"{verdict['cases_agree']} of {verdict['cases_valid']} test citizens agree with the new rules",
                   stage="verify", payload={k: v for k, v in verdict.items() if k != "cases"})
        db.update_job(self.id, verdict_json=verdict)
        rounds = self.state_data.get("encode", {}).get("rounds", 1)
        if verdict["cases_disagree"] and rounds <= settings.max_encode_attempts:
            self.save("RESOLVING")
        else:
            self.save("VERIFIED")

    def _resolve(self) -> None:
        cs = self._changeset()
        wt, _ = self._worktree()
        verdict = db.job(self.id)["verdict"]
        with llm.span("stage.resolve", kind="AGENT") as s:
            self.event("stage.start", f"Coordinator is settling {verdict['cases_disagree']} disagreement(s)", stage="resolve")
            batch = resolve.run(wt, self.pdf, cs, verdict)
            llm.set_attr(s, "niyam.decisions", ",".join(i.decision for i in batch.items))
        items = [json.loads(i.model_dump_json()) for i in batch.items]
        self.state_data.setdefault("resolutions", []).extend(items)
        for i in batch.items:
            self.event("resolve.decision", f"{i.case_name}: {i.decision}. {i.explanation}", stage="resolve", payload=json.loads(i.model_dump_json()))
        glossary = [i.glossary_entry for i in batch.items if i.glossary_entry]
        if glossary:
            gpath = wt / "glossary" / "maharashtra.md"
            existing = gpath.read_text(encoding="utf-8")
            new = [g for g in glossary if g.strip().splitlines()[0] not in existing]
            if new:
                gpath.write_text(existing.rstrip() + "\n\n" + "\n\n".join(g.strip() for g in new) + "\n", encoding="utf-8")
                self.event("resolve.glossary", f"Learned {len(new)} interpretation(s) for future runs (glossary updated)", stage="resolve")
        fixes = [i for i in batch.items if i.decision == "encoder_wrong" and i.fix_instruction]
        ambiguous = [i for i in batch.items if i.decision == "ambiguous"]
        # Loop guard (found from traces): if a case was already sent back as a fix and
        # still disagrees, another round will not settle it. Escalate instead of paying again.
        tried = set(self.state_data.get("fixes_tried", []))
        repeats = [i for i in fixes if i.case_name in tried]
        if repeats:
            self.event("resolve.loop_guard", f"{len(repeats)} disagreement(s) survived an earlier fix ({', '.join(i.case_name for i in repeats)}); escalating to a human instead of another round",
                       stage="resolve")
            fixes = [i for i in fixes if i.case_name not in tried]
            ambiguous = ambiguous + repeats
        self.state_data["fixes_tried"] = sorted(tried | {i.case_name for i in fixes})
        self.state_data["unresolved"] = len(ambiguous)
        if fixes:
            instruction = "\n".join(f"- ({i.case_name}) {i.fix_instruction}" for i in fixes)
            self.save("EXTRACTED")  # persisted so a crash during the fix resumes correctly
            # The verifier keeps its original cases, so the fix is judged by the same independent test.
            self._encode(fix_instruction=instruction)
            return
        self.save("VERIFIED")

    def _publish(self) -> None:
        cs = self._changeset()
        wt, branch = self._worktree()
        j = db.job(self.id)
        verdict = j.get("verdict")
        enc = self.state_data.get("encode", {})
        unresolved = self.state_data.get("unresolved", 0)
        tests_ok = bool(enc.get("ok"))
        conf = score(cs, verdict, tests_ok, len(self.state_data.get("rejected_quotes", [])))
        decision, reasons = decide(cs, conf, verdict, unresolved, bool(j.get("is_byod")))
        with llm.span("stage.publish", kind="AGENT") as s:
            self.event("stage.start", f"Confidence {conf:.2f}; decision: {decision.replace('_', ' ')}", stage="publish",
                       payload={"reasons": reasons})
            schemes = ", ".join(sorted({c.scheme_id for c in cs.changes}))
            title = f"rule({schemes}): {cs.changes[0].summary[:90]}" + (f" (+{len(cs.changes) - 1} more)" if len(cs.changes) > 1 else "")
            trace_id = j.get("trace_id")
            message = (f"{title}\n\nSource: GR {cs.document_code or ''} dated {cs.document_date or ''}\n"
                       + "\n".join(f"- {c.change_id} {c.change_type} {c.target}: {c.summary}" for c in cs.changes)
                       + f"\n\nNiyam-Job: {self.id}\nNiyam-Confidence: {conf:.2f}\nNiyam-Decision: {decision}\n"
                       + (f"Niyam-Trace: {trace_id}\n" if trace_id else ""))
            sha, checkpoint = encode.commit(wt, message)
            self.event("publish.commit", f"Committed {sha[:7]}" + (f" with Entire checkpoint {checkpoint}" if checkpoint else " (no Entire checkpoint found)"),
                       stage="publish", payload={"sha": sha, "checkpoint": checkpoint})
            body = publish.pr_body(j, cs, verdict, self.state_data.get("resolutions", []), conf, decision, reasons,
                                   checkpoint, sha, trace_id, enc.get("summary", ""))
            out = publish.run(wt, branch, title, body, decision)
            llm.set_attr(s, "niyam.confidence", conf)
            llm.set_attr(s, "niyam.decision", decision)
            llm.set_attr(s, "niyam.pr_url", out.get("pr_url") or "")
        self.state_data["publish"] = out
        self.state_data["reasons"] = reasons
        # READY_TO_MERGE: the policy allowed acting alone, but this run was not allowed to merge (dry or local mode).
        final = ("AUTO_MERGED" if out.get("merged") else "READY_TO_MERGE" if decision == "auto_merge"
                 else "NEEDS_HUMAN" if decision == "needs_human" else "AWAITING_HUMAN")
        self.event("stage.done", f"Change request {'merged' if out.get('merged') else 'opened'}" + (f": {out['pr_url']}" if out.get("pr_url") else ""),
                   stage="publish", payload=out)
        self.save(final, confidence=conf, autonomy_decision=decision, commit_sha=sha, checkpoint_id=checkpoint,
                  pr_url=out.get("pr_url"), finished_at=time.time())


def last_good_state(job_id: str) -> str:
    """The most recent non-terminal state a job reached, from its event log."""
    for e in reversed(db.rows("SELECT payload_json FROM job_events WHERE job_id = ? AND type = 'state' ORDER BY id", job_id)):
        state = json.loads(e["payload_json"] or "{}").get("state")
        if state and state not in TERMINAL:
            return state
    return "NEW"


def run_job(job_id: str, retry_failed: bool = True) -> dict[str, Any]:
    j = db.job(job_id)
    if j and j["state"] == "FAILED" and retry_failed:
        state = last_good_state(job_id)
        db.add_event(job_id, "orchestrator.retry", f"Retrying a failed job from its last good state, {state}")
        db.update_job(job_id, state=state, error=None, error_class=None)
    return Run(job_id).execute()
