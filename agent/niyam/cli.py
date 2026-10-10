"""Command line for running Niyam locally.

  niyam process <pdf> [--title T] [--date YYYY-MM-DD] [--base REF] [--byod]
  niyam run <job_id>          resume or rerun a job
  niyam show <job_id>         print a job and its events
  niyam watch [--once]        poll official sources for new documents
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="niyam")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("process")
    p.add_argument("pdf")
    p.add_argument("--title")
    p.add_argument("--date")
    p.add_argument("--code")
    p.add_argument("--url")
    p.add_argument("--base", default="main")
    p.add_argument("--byod", action="store_true")
    r = sub.add_parser("run")
    r.add_argument("job_id")
    s = sub.add_parser("show")
    s.add_argument("job_id")
    w = sub.add_parser("watch")
    w.add_argument("--once", action="store_true")
    w.add_argument("--limit", type=int, default=10)
    args = ap.parse_args(argv)

    from . import db, llm, orchestrator

    try:
        if args.cmd == "process":
            meta = {"title": args.title, "published_at": args.date, "code": args.code, "source_url": args.url,
                    "base_ref": args.base}
            doc_id = orchestrator.add_document(Path(args.pdf), "byod" if args.byod else "cli", {k: v for k, v in meta.items() if v})
            job_id = orchestrator.create_job(doc_id, is_byod=args.byod)
            job = orchestrator.run_job(job_id)
            print(json.dumps({k: job.get(k) for k in ("id", "state", "confidence", "autonomy_decision", "pr_url", "checkpoint_id", "trace_id", "cost_usd")}, indent=2))
        elif args.cmd == "run":
            job = orchestrator.run_job(args.job_id)
            print(json.dumps({k: job.get(k) for k in ("id", "state", "confidence", "pr_url", "cost_usd")}, indent=2))
        elif args.cmd == "show":
            print(json.dumps(db.job(args.job_id), indent=2, ensure_ascii=False, default=str)[:20000])
            for e in db.rows("SELECT ts, type, stage, message FROM job_events WHERE job_id = ? ORDER BY id", args.job_id):
                print(f"{e['type']:<28} {e['message']}")
        elif args.cmd == "watch":
            from .sources import watcher
            watcher.run(once=args.once, limit=args.limit)
    finally:
        llm.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
