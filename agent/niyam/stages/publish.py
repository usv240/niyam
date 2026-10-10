"""Stage 7, publish: open a pull request with sources and proof, then merge only if allowed."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

from .. import rulebook
from ..config import settings
from ..models import ChangeSet

DECISION_TEXT = {
    "auto_merge": "Merged automatically: only numbers or dates changed and every check agreed.",
    "human_review": "Waiting for a human reviewer.",
    "needs_human": "Needs a human decision before this can be merged.",
}


def _gh(*args: str, cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(["gh", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", timeout=180, stdin=subprocess.DEVNULL, env={**os.environ, "GH_PROMPT_DISABLED": "1"})


def pr_body(job: dict[str, Any], cs: ChangeSet, verdict: dict[str, Any] | None, resolutions: list[dict[str, Any]],
            confidence: float, decision: str, reasons: list[str], checkpoint: str | None, commit_sha: str,
            trace_id: str | None, encode_summary: str) -> str:
    lines = ["## What changed"]
    for c in cs.changes:
        lines.append(f"- **{c.scheme_id}**: {c.summary} (from {c.effective_from}; {c.affects} eligibility)")
    if cs.skipped:
        lines.append("\nNot modelled (procedure or paperwork only): " + "; ".join(s.topic for s in cs.skipped))
    lines.append(f"\n## Source\n{cs.title_en}  \nGR {cs.document_code or ''} dated {cs.document_date or ''}")
    for c in cs.changes:
        q = c.citation
        lines.append(f"\n> {q.quote_original}\n>\n> *{q.quote_english}* (page {q.page}, clause {q.clause})")
    lines.append("\n## Verification")
    if verdict:
        lines.append(f"An independent verifier wrote {verdict['cases_valid']} test citizens from the document alone, "
                     f"without seeing this change. {verdict['cases_agree']} agree with the new rules"
                     + (f", {verdict['cases_disagree']} disagree." if verdict['cases_disagree'] else "."))
    for r in resolutions:
        lines.append(f"- Resolved `{r.get('case_name')}`: **{r.get('decision')}**. {r.get('explanation')}")
    if cs.ambiguities:
        lines.append("\n## Questions for a human")
        for a in cs.ambiguities:
            lines.append(f"- {a.question} Readings: " + " / ".join(a.readings))
    lines.append(f"\n## Decision\nConfidence **{confidence:.2f}**. {DECISION_TEXT[decision]}")
    for r in reasons:
        lines.append(f"- {r}")
    lines.append("\n## Evidence")
    if checkpoint:
        lines.append(f"- Entire checkpoint `{checkpoint}`: https://entire.io/gh/{settings.rulebook_repo}/commit/{commit_sha}")
    if trace_id:
        lines.append(f"- neatlogs trace id `{trace_id}`")
    lines.append(f"- Niyam job `{job['id']}`")
    if encode_summary:
        lines.append(f"\n<details><summary>Encoder summary</summary>\n\n{encode_summary[:3000]}\n</details>")
    lines.append("\n*Information only. Final eligibility is decided by the government department.*")
    return "\n".join(lines)


def run(wt: Path, branch: str, title: str, body: str, decision: str) -> dict[str, Any]:
    if settings.publish_mode == "dry":  # evaluations: commit on the job branch only, never merge
        (wt / ".niyam" / "pr_body.md").write_text(body, encoding="utf-8")
        return {"pr_url": None, "merged": False, "mode": "dry"}
    if settings.publish_mode != "github":
        if decision == "auto_merge":
            root = rulebook.main_path()
            rulebook.git("merge", "-q", "--no-ff", "-m", f"Merge {branch}: {title}", branch, cwd=root)
            return {"pr_url": None, "merged": True, "mode": "local"}
        return {"pr_url": None, "merged": False, "mode": "local"}
    rulebook.git("push", "-q", "-u", "origin", branch, cwd=wt, timeout=300)
    labels = {"auto_merge": "auto-merged", "human_review": "needs-review", "needs_human": "needs-human"}[decision]
    _gh("label", "create", labels, "--force", "--color", {"auto-merged": "2da44e", "needs-review": "d29922", "needs-human": "cf222e"}[labels], cwd=wt)
    proc = _gh("pr", "create", "--repo", settings.rulebook_repo, "--head", branch, "--base", "main",
               "--title", title, "--body", body, "--label", labels, cwd=wt)
    if proc.returncode != 0:
        raise RuntimeError(f"could not open pull request: {proc.stderr.strip()}")
    url = proc.stdout.strip().splitlines()[-1]
    merged = False
    if decision == "auto_merge":
        m = _gh("pr", "merge", url, "--merge", "--delete-branch=false", cwd=wt)
        merged = m.returncode == 0
        if merged:
            rulebook.sync_main()
    return {"pr_url": url, "merged": merged, "mode": "github"}
