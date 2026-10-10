"""The agent's view of the rulebook repository: worktrees, rules for prompts,
simulation on a branch, and tests. Everything runs as a subprocess against a
specific checkout, so a job can never read or write another job's files."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml

from .config import settings

PY = sys.executable
ALLOWED_PREFIXES = ("schemes/", "parameters/", "tests/", "sources/", "glossary/", "schema/", "CHANGELOG.md")


def git(*args: str, cwd: Path, check: bool = True, timeout: int = 300) -> str:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    proc = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", timeout=timeout, env=env, stdin=subprocess.DEVNULL)
    if check and proc.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {proc.stderr.strip() or proc.stdout.strip()}")
    return proc.stdout.strip()


def rb_cli(cwd: Path, *args: str, timeout: int = 120) -> subprocess.CompletedProcess:
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONPATH": str(cwd)}
    return subprocess.run([PY, "-m", "niyam_rulebook", *args], cwd=cwd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout, env=env, stdin=subprocess.DEVNULL)


def main_path() -> Path:
    return settings.rulebook_path


def sync_main() -> None:
    """Bring the local main checkout up to date with the published rulebook."""
    root = main_path()
    if settings.publish_mode == "github":
        git("fetch", "-q", "origin", cwd=root, check=False)
        git("checkout", "-q", "main", cwd=root, check=False)
        git("merge", "-q", "--ff-only", "origin/main", cwd=root, check=False)


def create_worktree(job_id: str, base: str = "main") -> tuple[Path, str]:
    root = main_path()
    branch = f"niyam/{job_id}"
    path = settings.work_dir / job_id
    if path.exists():  # resume after a crash: reuse the existing worktree
        return path, branch
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = git("branch", "--list", branch, cwd=root)
    if existing:
        git("worktree", "add", "-q", str(path), branch, cwd=root)
    else:
        git("worktree", "add", "-q", "-b", branch, str(path), base, cwd=root)
    git("config", "user.name", "Niyam Agent", cwd=path)
    git("config", "user.email", os.getenv("NIYAM_GIT_EMAIL", "ujwalvanjare6@gmail.com"), cwd=path)
    return path, branch


def base_checkout(ref: str) -> Path:
    """A clean, read-only checkout of the rulebook at a ref: the rules *before* a document.
    Extraction and verification read old rules from here, never from main (which moves
    when changes merge) and never from the job's worktree (which holds the change)."""
    root = main_path()
    sha = git("rev-parse", ref, cwd=root)
    path = settings.work_dir / f"base-{sha[:12]}"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        git("worktree", "add", "-q", "--detach", str(path), sha, cwd=root)
    return path


def remove_worktree(job_id: str) -> None:
    path = settings.work_dir / job_id
    if path.exists():
        git("worktree", "remove", "--force", str(path), cwd=main_path(), check=False)
        shutil.rmtree(path, ignore_errors=True)


def scheme_ids(root: Path | None = None) -> list[str]:
    root = root or main_path()
    out = []
    for p in sorted((root / "schemes").rglob("*.yaml")):
        out.append(yaml.safe_load(p.read_text(encoding="utf-8"))["id"])
    return out


def schemes_overview(root: Path | None = None) -> str:
    root = root or main_path()
    lines = []
    for p in sorted((root / "schemes").rglob("*.yaml")):
        d = yaml.safe_load(p.read_text(encoding="utf-8"))
        lines.append(f"- {d['id']}: {d['name']} ({d.get('name_mr', '')}). {d.get('summary', '')}")
    return "\n".join(lines)


def rules_json(scheme_id: str, on: str | None, root: Path | None = None) -> dict[str, Any]:
    args = ["rules", scheme_id] + (["--date", on] if on else [])
    proc = rb_cli(root or main_path(), *args)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    return json.loads(proc.stdout)


def rules_for_prompt(scheme_id: str, on: str | None, root: Path | None = None) -> str:
    if not scheme_data(scheme_id, root):
        return (f"Scheme {scheme_id} does not exist in the rulebook yet. This document creates it: report one scheme_created "
                "change, then every eligibility or disqualification condition as condition_added (with new_value set to a "
                "rule expression over person fields), every number or list as parameter_update with old_value null, and the "
                "monthly benefit as benefit_changed.")
    r = rules_json(scheme_id, on, root)
    lines = [f"Scheme {r['id']} ({r['name']}) as of {r['as_of']}", "Parameters:"]
    for name, p in r["parameters"].items():
        lines.append(f"  - {name} = {json.dumps(p['value'], ensure_ascii=False)} (since {p['since']}; {p['description']})")
    lines.append("Conditions (all must be true):")
    for c in r["conditions"]:
        lines.append(f"  - [{c['id']}] {c['text']}  | expression: {c['when']}  | source clause {c['source'].get('clause')}")
    # The benefit formula decides how much is paid. Without it, an agent cannot
    # predict amounts (found from traces: verifier and coordinator looped on it).
    benefit = scheme_data(scheme_id, root).get("benefit") or {}
    if benefit.get("monthly_inr"):
        src = benefit.get("source") or {}
        lines.append(f"Monthly benefit paid when eligible: {benefit['monthly_inr']}  | source clause {src.get('clause')}: "
                     f"\"{src.get('quote_en', '')}\"")
    return "\n".join(lines)


def scheme_data(scheme_id: str, root: Path | None = None) -> dict[str, Any]:
    for p in sorted(((root or main_path()) / "schemes").rglob("*.yaml")):
        d = yaml.safe_load(p.read_text(encoding="utf-8"))
        if d.get("id") == scheme_id:
            return d
    return {}


def person_schema_text(root: Path | None = None) -> str:
    root = root or main_path()
    data = yaml.safe_load((root / "schema" / "person.yaml").read_text(encoding="utf-8"))["fields"]
    lines = []
    for name, spec in data.items():
        kind = spec["type"] + (f" one of {spec['values']}" if spec.get("values") else "")
        lines.append(f"  - {name} ({kind}, default {spec.get('default')!r}): {spec.get('label', '')}")
    return "\n".join(lines)


def glossary_text(root: Path | None = None) -> str:
    p = (root or main_path()) / "glossary" / "maharashtra.md"
    return p.read_text(encoding="utf-8") if p.exists() else ""


def run_tests(root: Path) -> dict[str, Any]:
    proc = rb_cli(root, "test", "--json")
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        data = {"passed": 0, "failed": 1, "failures": [{"case": "test run crashed", "problems": [proc.stderr[-2000:]]}],
                "check_problems": []}
    data["ok"] = proc.returncode == 0
    return data


def simulate_batch(root: Path, cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False)
        tmp = f.name
    try:
        proc = rb_cli(root, "simulate-batch", tmp)
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr[-2000:])
        return json.loads(proc.stdout)
    finally:
        os.unlink(tmp)


def changed_files(root: Path, base: str = "HEAD") -> list[str]:
    # Compare with the worktree's own starting commit. Comparing with main was a bug:
    # when main moved on, untouched files looked "changed" and the guard reverted them.
    out = git("diff", "--name-only", base, cwd=root)
    untracked = git("ls-files", "--others", "--exclude-standard", cwd=root)
    return sorted(set(filter(None, out.splitlines() + untracked.splitlines())))


def disallowed_changes(files: list[str]) -> list[str]:
    return [f for f in files if not f.startswith(ALLOWED_PREFIXES)]
