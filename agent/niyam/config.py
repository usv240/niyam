"""Settings, read from environment variables and the nearest .env file."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

AGENT_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = AGENT_DIR.parent

# The workspace .env (one level above the repo) keeps secrets out of git entirely.
for candidate in (REPO_DIR / ".env", REPO_DIR.parent / ".env"):
    if candidate.exists():
        load_dotenv(candidate, override=False)

# Prices in USD per million tokens (input, output). Used to report cost per run.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
    "claude-haiku-4-5": (1.00, 5.00),
}


def price_for(model: str) -> tuple[float, float]:
    for key, value in PRICES.items():
        if model.startswith(key):
            return value
    return (2.00, 10.00)


def _path(name: str, default: str) -> Path:
    value = Path(os.getenv(name, default))
    return value if value.is_absolute() else (REPO_DIR / value).resolve()


@dataclass
class Settings:
    model: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5"))
    model_fast: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL_FAST", "claude-haiku-5-5"))
    model_verify: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL_VERIFY", "claude-opus-5-5"))
    model_encode: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL_ENCODE", os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")))
    model_fallback: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL_FALLBACK", "claude-sonnet-5-5"))
    rulebook_path: Path = field(default_factory=lambda: _path("NIYAM_RULEBOOK_PATH", "../niyam-rulebook"))
    rulebook_repo: str = field(default_factory=lambda: os.getenv("NIYAM_RULEBOOK_REPO", "usv240/niyam-rulebook"))
    publish_mode: str = field(default_factory=lambda: os.getenv("NIYAM_PUBLISH_MODE", "github"))
    work_dir: Path = field(default_factory=lambda: _path("NIYAM_WORK_DIR", "data/runtime/work"))
    db_path: Path = field(default_factory=lambda: _path("NIYAM_DB", "data/runtime/niyam.db"))
    corpus_dir: Path = field(default_factory=lambda: _path("NIYAM_CORPUS", "data/corpus"))
    chaos: set[str] = field(default_factory=lambda: {c.strip() for c in os.getenv("NIYAM_CHAOS", "").split(",") if c.strip()})
    neatlogs_endpoint: str = field(default_factory=lambda: os.getenv("NEATLOGS_ENDPOINT", "https://ingest.neatlogs.com"))
    key_secret: str = field(default_factory=lambda: os.getenv("NIYAM_KEY_SECRET", "dev-only-secret"))
    max_encode_attempts: int = 3
    job_budget_usd: float = float(os.getenv("NIYAM_JOB_BUDGET_USD", "3.0"))
    claude_bin: str = field(default_factory=lambda: os.getenv("NIYAM_CLAUDE_BIN", "claude"))


settings = Settings()
