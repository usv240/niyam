"""Run Niyam on documents with known answers and score it.

  python evals/run_evals.py --version v1 [--cases a,b] [--repeat 2]

Each case starts from a fixed rulebook ref (base_ref), runs the real pipeline in
"dry" publish mode (commits on a job branch, never merges or opens a PR), then
checks the result against hand-written expectations. Results are written to
evals/results/<version>.json and every neatlogs trace is tagged with the case
and version, so before/after runs can be compared trace by trace.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
from pathlib import Path

os.environ["NIYAM_PUBLISH_MODE"] = "dry"
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "agent"))

import yaml  # noqa: E402

from niyam import db, llm, orchestrator, rulebook  # noqa: E402
from niyam.config import settings  # noqa: E402


def norm(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (json.JSONDecodeError, TypeError):
            return v.strip().strip('"')
    return v


def match_change(expected: dict, predicted: list[dict]) -> dict | None:
    for p in predicted:
        target_ok = (expected.get("target") and p["target"] == expected["target"]) or \
                    (expected.get("target_contains") and expected["target_contains"] in p["target"]) or \
                    (expected.get("summary_contains") and expected["summary_contains"].lower() in p["summary"].lower())
        type_ok = not expected.get("change_type") or p["change_type"] in (
            expected["change_type"] if isinstance(expected["change_type"], list) else [expected["change_type"]])
        if target_ok and type_ok:
            return p
    return None


def value_ok(expected: dict, p: dict) -> bool | None:
    if "new_value" not in expected:
        return None
    got, want = norm(p.get("new_value")), expected["new_value"]
    if isinstance(want, list) and isinstance(got, list):
        return sorted(map(str, want)) == sorted(map(str, got))
    try:
        return float(got) == float(want)
    except (TypeError, ValueError):
        return got == want


def score_case(case: dict, job: dict) -> dict:
    exp = case["expect"]
    out = {"case": case["id"], "job_id": job["id"], "state": job["state"], "cost_usd": round(job.get("cost_usd") or 0, 4),
           "latency_s": round((job.get("finished_at") or time.time()) - (job.get("started_at") or time.time()), 1),
           "trace_id": job.get("trace_id"), "checkpoint_id": job.get("checkpoint_id")}
    triage = job.get("triage") or {}
    changes = (job.get("changeset") or {}).get("changes", [])
    produced_changes = bool(changes) and job["state"] not in ("CLOSED_IRRELEVANT", "NO_CHANGES")
    if not exp["relevant"]:
        # Correct when no eligibility change comes out, whether triage stops it or extraction finds nothing.
        out["triage_correct"] = not produced_changes
        out["closed_by"] = job["state"]
        out["never_auto_merged"] = job.get("autonomy_decision") != "auto_merge"
        return out
    out["triage_correct"] = bool(triage.get("relevant")) and set(exp.get("schemes", [])) <= set(triage.get("scheme_ids", []))
    if exp.get("answer_key"):
        return {**out, **score_from_scratch(exp, job)}
    predicted = (job.get("changeset") or {}).get("changes", [])
    matched, values, bounds = 0, [], []
    for e in exp.get("changes", []):
        p = match_change(e, predicted)
        if p:
            matched += 1
            v = value_ok(e, p)
            if v is not None:
                values.append(v)
            if e.get("boundary"):
                bounds.append(p.get("boundary") == e["boundary"])
    n_exp = len(exp.get("changes", []))
    out["change_recall"] = matched / n_exp if n_exp else 1.0
    out["change_precision"] = (matched / len(predicted)) if predicted else (1.0 if not n_exp else 0.0)
    out["value_accuracy"] = sum(values) / len(values) if values else None
    out["boundary_accuracy"] = sum(bounds) / len(bounds) if bounds else None
    events = db.rows("SELECT type FROM job_events WHERE job_id = ?", job["id"])
    out["citation_retries"] = sum(1 for e in events if e["type"] == "verify.citation_rejected")
    out["recoveries"] = sorted({e["type"] for e in events if e["type"].startswith("recovery.") or e["type"] in ("encode.retry", "orchestrator.retry")})
    out["ambiguities"] = len((job.get("changeset") or {}).get("ambiguities", []))
    if "min_ambiguities" in exp:
        out["ambiguity_flagged"] = out["ambiguities"] >= exp["min_ambiguities"]
    verdict = job.get("verdict") or {}
    out["verifier_agreement"] = verdict.get("agreement_rate")
    if exp.get("decision_in"):
        out["decision_correct"] = (job.get("autonomy_decision") in exp["decision_in"])
    # Outcome checks: run expected citizens against the job's branch.
    wt = settings.work_dir / job["id"]
    checks = exp.get("outcomes", [])
    if checks and wt.exists():
        res = rulebook.simulate_batch(wt, [{"person": c["person"], "date": c["date"], "scheme": c["scheme"]} for c in checks])
        ok = []
        fails = []
        for c, r in zip(checks, res):
            good = r.get("ok") and r["result"][c["scheme"]]["eligible"] == c["eligible"]
            if good and "monthly_inr" in c:
                good = r["result"][c["scheme"]]["monthly_inr"] == c["monthly_inr"]
            ok.append(bool(good))
            if not good:
                fails.append({"name": c.get("name"), "got": r.get("result", {}).get(c["scheme"], {}).get("eligible") if r.get("ok") else r.get("error")})
        out["outcome_accuracy"] = sum(ok) / len(ok)
        out["outcome_failures"] = fails
    elif checks:
        out["outcome_accuracy"] = 0.0
    return out


def score_from_scratch(exp: dict, job: dict) -> dict:
    """A whole scheme encoded from its founding order, scored with our hand-written test citizens."""
    out: dict = {"new_scheme_detected": bool((job.get("triage") or {}).get("new_scheme_id"))}
    changes = (job.get("changeset") or {}).get("changes", [])
    created = sorted({c["scheme_id"] for c in changes})
    out["created_scheme"] = created[0] if created else None
    out["changes_extracted"] = len(changes)
    if exp.get("decision_in"):
        out["decision_correct"] = job.get("autonomy_decision") in exp["decision_in"]
    wt = settings.work_dir / job["id"]
    key = exp["answer_key"]
    suite = yaml.safe_load(rulebook.git("show", f"{key['ref']}:{key['file']}", cwd=rulebook.main_path()))
    if not created or not wt.exists():
        out["outcome_accuracy"] = 0.0
        return out
    cases = [{"person": c["person"], "date": str(c["date"]), "scheme": created[0]} for c in suite["cases"]]
    res = rulebook.simulate_batch(wt, cases)
    ok, fails = 0, []
    for c, r in zip(suite["cases"], res):
        got = r["result"].get(created[0], {}) if r.get("ok") else {}
        good = r.get("ok") and all(got.get(k) == v for k, v in c["expect"].items())
        ok += bool(good)
        if not good:
            fails.append({"name": c["name"], "expected": c["expect"], "got": {k: got.get(k) for k in c["expect"]} if got else r.get("error")})
    out["outcome_accuracy"] = ok / len(cases)
    out["answer_key_cases"] = len(cases)
    out["outcome_failures"] = fails
    verdict = job.get("verdict") or {}
    out["verifier_agreement"] = verdict.get("agreement_rate")
    return out


METRICS = ["triage_correct", "change_recall", "change_precision", "value_accuracy", "boundary_accuracy",
           "outcome_accuracy", "decision_correct", "ambiguity_flagged", "verifier_agreement", "cost_usd", "latency_s"]


def summarise(results: list[dict]) -> dict:
    summary = {}
    for m in METRICS:
        vals = [float(r[m]) for r in results if r.get(m) is not None]
        if vals:
            summary[m] = round(statistics.mean(vals), 4)
    summary["runs"] = len(results)
    summary["total_cost_usd"] = round(sum(r.get("cost_usd", 0) for r in results), 4)
    return summary


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--cases", default="all")
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--note", default="")
    args = ap.parse_args()

    cases = []
    for path in sorted((HERE / "cases").glob("*/case.yaml")):
        c = yaml.safe_load(path.read_text(encoding="utf-8"))
        c["dir"] = path.parent
        if args.cases == "all" or c["id"] in args.cases.split(","):
            cases.append(c)
    results = []
    for case in cases:
        for i in range(args.repeat):
            print(f"\n=== {case['id']} (run {i + 1}/{args.repeat}) ===")
            pdf = case["dir"] / case.get("document", "document.pdf")
            meta = {**case.get("meta", {}), "base_ref": case.get("base_ref", "baseline-2024-06-28"),
                    "eval_case": case["id"], "eval_run": f"{args.version}-{i}-{time.time()}"}
            # A fresh document row per run, so an earlier job is never reused.
            doc_id = orchestrator.add_document(pdf, "eval", meta, dedup=False)
            job_id = orchestrator.create_job(doc_id, eval_case=case["id"], version=args.version)
            job = orchestrator.run_job(job_id)
            r = score_case(case, job)
            print(json.dumps(r, ensure_ascii=False))
            results.append(r)
            rulebook.remove_worktree(job_id)
    out = {"version": args.version, "note": args.note, "ran_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
           "models": {"fast": settings.model_fast, "main": settings.model, "verify": settings.model_verify},
           "summary": summarise(results), "results": results}
    dest = HERE / "results" / f"{args.version}.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nSUMMARY", json.dumps(out["summary"], indent=2))
    llm.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
