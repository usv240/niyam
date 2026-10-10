"""Stage 4, encode: a coding agent edits the rulebook and writes tests.

Claude Code runs headless inside the job's own git worktree, with edits and the
rulebook test command as its only tools. It never sees raw document text, only
the validated change set, so instructions hidden in a PDF cannot reach a
tool-using agent. Entire records the session; when the orchestrator commits,
the session becomes a checkpoint linked to the commit (legal provenance)."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

import yaml

from .. import rulebook
from ..config import settings
from ..models import ChangeSet

ALLOWED_TOOLS = ",".join([
    "Read", "Edit", "Write", "Glob", "Grep",
    "Bash(python -m niyam_rulebook test:*)",
    "Bash(python -m niyam_rulebook check:*)",
    "Bash(python -m niyam_rulebook rules:*)",
    "Bash(python -m niyam_rulebook simulate:*)",
])

TASK = """You are the Niyam encoder. Update this rulebook so it matches a new government document.

The validated change set is in `.niyam/changeset.json`. It lists each change with its exact source quote, page and clause.
The source document is registered in `sources/index.yaml` as `{doc_key}` (date {doc_date}).

Do this:
1. Read CLAUDE.md (the rulebook rules), the change set, and the files of the affected scheme(s): {schemes}.
2. Apply every change in the change set, following CLAUDE.md exactly:
   - parameter change: add a new dated value under `values:` starting {effective}. Never edit or delete older values.
   - condition change: set `valid_until` on the old condition to the day before {effective}, and add a new condition with the same id and `valid_from: {effective}`.
   - condition removed: only set `valid_until` to the day before {effective}.
   - every new value or condition gets `source` / `metadata.reference` with doc `{doc_key}`, page, clause, quote (copied from the change set) and quote_en.
   - if a change needs a new person field, add it to `schema/person.yaml` with a safe default that keeps existing results unchanged.
3. Add test citizens to `tests/` for every change, dated on or after {effective}: just below, at, and just above each limit, plus one case dated before {effective} proving the old rule still applies. Each case cites `GR {doc_code} p.<page> clause <clause>` in `source`.
4. Add an entry at the top of CHANGELOG.md (English, Hindi, Marathi) linking to the document.
5. Run `python -m niyam_rulebook test` and fix problems until it prints `0 failed` with no PROBLEM lines.
6. Do not run git. Do not edit files outside schemes/, parameters/, tests/, sources/, glossary/, schema/ and CHANGELOG.md.

Finish with a short summary of what you changed and the final test result.
{extra}"""


def _env() -> dict[str, str]:
    env = dict(os.environ)
    scripts = str(Path(sys.executable).parent)
    entire_bin = str(Path.home() / ".local" / "bin")
    env["PATH"] = os.pathsep.join([scripts, entire_bin, env.get("PATH", "")])
    env["PYTHONIOENCODING"] = "utf-8"
    env.pop("CLAUDECODE", None)  # let the child run as its own top-level session
    return env


def register_source(wt: Path, pdf_path: Path, cs: ChangeSet, doc_meta: dict[str, Any]) -> tuple[str, str]:
    """Copy the PDF into the rulebook and add it to sources/index.yaml (deterministic, no LLM)."""
    code = cs.document_code or doc_meta.get("code") or Path(pdf_path).stem
    key = f"gr-{code}"
    dest = wt / "sources" / "mh" / f"{code}.pdf"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copyfile(pdf_path, dest)
    index_path = wt / "sources" / "index.yaml"
    index = yaml.safe_load(index_path.read_text(encoding="utf-8")) or {}
    if key not in index:
        index[key] = {
            "kind": "government_resolution",
            "code": str(code),
            "date": cs.document_date or doc_meta.get("published_at"),
            "department": doc_meta.get("department", "Government of Maharashtra"),
            "title_mr": cs.title_original,
            "title_en": cs.title_en,
            "url": doc_meta.get("source_url") or f"https://gr.maharashtra.gov.in/Site/Upload/Government%20Resolutions/Marathi/{code}.pdf",
            "local": f"sources/mh/{code}.pdf",
            "language": "mr",
            "amends": cs.supersedes,
        }
        index_path.write_text(yaml.safe_dump(index, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return key, str(code)


def run_claude(wt: Path, prompt: str, session_id: str | None, timeout: int = 1500) -> dict[str, Any]:
    cmd = [settings.claude_bin, "-p", prompt, "--output-format", "json", "--model", settings.model,
           "--permission-mode", "acceptEdits", "--allowedTools", ALLOWED_TOOLS,
           "--strict-mcp-config", "--max-turns", "60"]
    if session_id:
        cmd += ["--resume", session_id]
    proc = subprocess.run(cmd, cwd=wt, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout, env=_env(), stdin=subprocess.DEVNULL)
    try:
        data = json.loads(proc.stdout.strip().splitlines()[-1]) if proc.stdout.strip() else {}
    except (json.JSONDecodeError, IndexError):
        data = {}
    if not data:
        raise RuntimeError(f"encoder did not return a result (exit {proc.returncode}): {proc.stderr[-1500:]}")
    return data


def run(wt: Path, cs: ChangeSet, pdf_path: Path, doc_meta: dict[str, Any], event: Callable[[str, str], None],
        session_id: str | None = None, fix_instruction: str | None = None) -> dict[str, Any]:
    key, code = register_source(wt, pdf_path, cs, doc_meta)
    (wt / ".niyam").mkdir(exist_ok=True)
    (wt / ".niyam" / "changeset.json").write_text(cs.model_dump_json(indent=2), encoding="utf-8")
    effective = min((c.effective_from for c in cs.changes), default=cs.document_date or "")
    schemes = sorted({c.scheme_id for c in cs.changes})
    prompt = TASK.format(doc_key=key, doc_code=code, doc_date=cs.document_date, effective=effective,
                         schemes=", ".join(schemes), extra="")
    if fix_instruction and session_id:
        prompt = ("A reviewer found a problem with your rulebook changes:\n" + fix_instruction +
                  "\n\nFix it following CLAUDE.md, add or adjust the test citizens that prove the fix, "
                  "and run `python -m niyam_rulebook test` until it prints 0 failed.")
    total_cost, attempts, result = 0.0, 0, {}
    for attempt in range(1, settings.max_encode_attempts + 1):
        attempts = attempt
        event("encode.attempt", f"Coding agent attempt {attempt}" + (" (applying a reviewer fix)" if fix_instruction else ""))
        result = run_claude(wt, prompt, session_id)
        session_id = result.get("session_id", session_id)
        total_cost += float(result.get("total_cost_usd") or 0)
        tests = rulebook.run_tests(wt)
        files = rulebook.changed_files(wt)
        bad = rulebook.disallowed_changes([f for f in files if not f.startswith(".niyam/")])
        if bad:
            event("encode.guard", f"Reverting edits outside the allowed folders: {', '.join(bad)}")
            for f in bad:
                rulebook.git("checkout", "--", f, cwd=wt, check=False)
            continue_prompt = f"Your edits to {', '.join(bad)} were reverted because those files are outside the rulebook folders. Make the change only in allowed files."
            prompt = continue_prompt
            continue
        if tests["ok"]:
            event("encode.tests_passed", f"Tests pass: {tests['passed']} passed, 0 failed")
            return {"ok": True, "session_id": session_id, "attempts": attempts, "cost_usd": total_cost,
                    "tests": tests, "files": files, "summary": result.get("result", ""), "doc_key": key, "doc_code": code}
        failures = json.dumps(tests["failures"][:12] + [{"check_problem": p} for p in tests.get("check_problems", [])[:12]],
                              ensure_ascii=False, indent=1)
        event("encode.retry", f"Tests failed ({tests['failed']} failing, {len(tests.get('check_problems', []))} problems); retrying with the failures")
        prompt = f"The rulebook tests still fail. Fix the rules or the tests (only if a test contradicts the document):\n{failures}\nThen run `python -m niyam_rulebook test` again."
    return {"ok": False, "session_id": session_id, "attempts": attempts, "cost_usd": total_cost,
            "tests": tests, "files": rulebook.changed_files(wt), "summary": result.get("result", ""), "doc_key": key, "doc_code": code}


def commit(wt: Path, message: str) -> tuple[str, str | None]:
    """Commit the worktree. Entire's git hook links the agent session and adds a checkpoint trailer."""
    rulebook.git("add", "-A", "--", "schemes", "parameters", "tests", "sources", "glossary", "schema", "CHANGELOG.md", cwd=wt)
    env_path = os.pathsep.join([str(Path.home() / ".local" / "bin"), os.environ.get("PATH", "")])
    proc = subprocess.run(["git", "commit", "-q", "-F", "-"], cwd=wt, input=message, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=300, env={**os.environ, "PATH": env_path})
    if proc.returncode != 0 and "nothing to commit" not in proc.stdout + proc.stderr:
        raise RuntimeError(f"commit failed: {proc.stderr or proc.stdout}")
    sha = rulebook.git("rev-parse", "HEAD", cwd=wt)
    body = rulebook.git("log", "-1", "--format=%B", cwd=wt)
    checkpoint = None
    for line in body.splitlines():
        if line.startswith("Entire-Checkpoint:"):
            checkpoint = line.split(":", 1)[1].strip()
    return sha, checkpoint
