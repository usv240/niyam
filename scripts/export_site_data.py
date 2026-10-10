"""Export the data the website is built from (web/data/*.json).

  python scripts/export_site_data.py [--job JOB_ID]

The site is a static export, so it keeps working even when the API is down.
It shows: the rulebook on main, the rulebook with the agent's proposed change
(the showcase job's branch), the showcase run with every event, all evaluation
results, and links to the evidence (pull request, checkpoint, traces).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "agent"))

from niyam import api, db, rulebook  # noqa: E402
from niyam.config import settings  # noqa: E402

OUT = ROOT / "web" / "data"


def snapshot(path: Path) -> dict:
    # Run main's engine code against the data at `path` (older branches carry older code).
    proc = rulebook.rb_cli(rulebook.main_path(), "--root", str(path), "snapshot")
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    return json.loads(proc.stdout)


def branch_checkout(sha: str) -> Path:
    path = settings.work_dir / f"site-{sha[:12]}"
    if not path.exists():
        rulebook.git("worktree", "add", "-q", "--detach", str(path), sha, cwd=rulebook.main_path())
    return path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--job", help="showcase job id (default: latest published non-eval job)")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    job_id = args.job or (db.row("SELECT id FROM jobs WHERE commit_sha IS NOT NULL AND eval_case IS NULL AND is_byod = 0 "
                                 "ORDER BY finished_at DESC LIMIT 1") or {}).get("id")
    rulebook.sync_main()
    main_snap = snapshot(rulebook.main_path())
    (OUT / "rulebook-main.json").write_text(json.dumps(main_snap, ensure_ascii=False, indent=1), encoding="utf-8")

    showcase = None
    if job_id:
        detail = api.job_detail(job_id)
        for e in detail["events"]:
            e["payload"] = json.loads(e.pop("payload_json") or "{}")
        showcase = detail
        sha = detail.get("commit_sha")
        if sha:
            proposed = snapshot(branch_checkout(sha))
            (OUT / "rulebook-proposed.json").write_text(json.dumps(proposed, ensure_ascii=False, indent=1), encoding="utf-8")
            diff = rulebook.git("diff", "--stat", f"{sha}~1", sha, cwd=rulebook.main_path(), check=False)
            showcase["diff_stat"] = diff
            showcase["diff_files"] = {}
            for f in ("parameters/mh/ladki_bahin/age_max.yaml", "schemes/mh/ladki_bahin.yaml"):
                showcase["diff_files"][f] = rulebook.git("diff", f"{sha}~1", sha, "--", f, cwd=rulebook.main_path(), check=False)
        (OUT / "showcase.json").write_text(json.dumps(showcase, ensure_ascii=False, indent=1, default=str), encoding="utf-8")

    (OUT / "evals.json").write_text(json.dumps(api.evals(), ensure_ascii=False, indent=1), encoding="utf-8")

    published = [api._job_public(db.job(r["id"])) for r in db.rows(
        "SELECT id FROM jobs WHERE pr_url IS NOT NULL AND eval_case IS NULL ORDER BY finished_at DESC")]
    meta = {
        "generated_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "showcase_job": job_id,
        "rulebook_main_sha": rulebook.git("rev-parse", "HEAD", cwd=rulebook.main_path()),
        "published": [{**{k: j[k] for k in ("id", "state", "pr_url", "commit_sha", "checkpoint_id", "checkpoint_url", "trace_id",
                                            "confidence", "decision", "cost_usd", "title_en")}, "doc_code": j["document"].get("code")}
                      for j in published],
        "niyam_head": subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip(),
    }
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"exported showcase={job_id} to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
