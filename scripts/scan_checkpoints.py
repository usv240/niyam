"""Scan Entire checkpoint refs for secrets before they are pushed.

  python scripts/scan_checkpoints.py [repo ...]

Agent transcripts can contain keys that were pasted into a chat. Entire redacts
well-known formats, but a generic key (a long hex or base62 string after
NAME_KEY=) can slip through, which happened to us once. Exit code 1 if anything
looks like a secret.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

PATTERNS = [
    re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"niyam_live_[A-Za-z0-9]{32}"),
    # NAME_KEY=, NAME_TOKEN=, NAME_SECRET= followed by a long value that is not a placeholder
    re.compile(r"[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET)\s*=\s*(?!REDACTED|PASTE_HERE|<)[A-Za-z0-9_\-]{24,}"),
]


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, encoding="utf-8", errors="replace").stdout


def scan(repo: Path) -> int:
    hits = 0
    refs = [r for r in git(repo, "for-each-ref", "--format=%(refname)", "refs/entire").splitlines() if r]
    for ref in refs:
        for path in git(repo, "ls-tree", "-r", "--name-only", ref).splitlines():
            text = git(repo, "show", f"{ref}:{path}")
            for pat in PATTERNS:
                for m in pat.finditer(text):
                    hits += 1
                    print(f"POSSIBLE SECRET {repo.name} {ref} {path}: {m.group(0)[:12]}...")
    print(f"{repo.name}: scanned {len(refs)} checkpoint refs, {hits} possible secret(s)")
    return hits


if __name__ == "__main__":
    repos = [Path(p).resolve() for p in sys.argv[1:]] or [Path(__file__).resolve().parent.parent]
    sys.exit(1 if sum(scan(r) for r in repos) else 0)
