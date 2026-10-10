"""SQLite storage. One file, WAL mode. The rulebook repo is the source of truth;
this database only tracks documents, jobs, events, API keys and usage."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from typing import Any, Iterator

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, source TEXT, source_url TEXT, sha256 TEXT UNIQUE, title TEXT,
  code TEXT, language TEXT, published_at TEXT, fetched_at TEXT, local_path TEXT, meta_json TEXT
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, document_id TEXT, state TEXT, attempt INTEGER DEFAULT 0,
  triage_json TEXT, changeset_json TEXT, verdict_json TEXT, resolution_json TEXT,
  confidence REAL, autonomy_decision TEXT, branch TEXT, pr_url TEXT, commit_sha TEXT,
  checkpoint_id TEXT, trace_id TEXT, cost_usd REAL DEFAULT 0, tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0, started_at REAL, updated_at REAL, finished_at REAL,
  error_class TEXT, error TEXT, is_chaos INTEGER DEFAULT 0, is_byod INTEGER DEFAULT 0,
  eval_case TEXT, version TEXT, owner_key_id TEXT
);
CREATE TABLE IF NOT EXISTS job_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT, ts REAL, type TEXT, stage TEXT,
  message TEXT, payload_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_job ON job_events(job_id, id);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY, owner TEXT, name TEXT, prefix TEXT, hash TEXT UNIQUE, last4 TEXT,
  scopes TEXT, tier TEXT, created_at REAL, revoked_at REAL
);
CREATE TABLE IF NOT EXISTS usage (
  key_id TEXT, day TEXT, calls INTEGER DEFAULT 0, jobs INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0,
  PRIMARY KEY (key_id, day)
);
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY, key_id TEXT, url TEXT, secret TEXT, events TEXT, created_at REAL, disabled_at REAL
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, job_id TEXT, reviewer TEXT, decision TEXT, comment TEXT, ts REAL
);
"""

_local = threading.local()


def connect() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(settings.db_path, timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript(SCHEMA)
        _local.conn = conn
    return conn


@contextmanager
def tx() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def new_id(prefix: str) -> str:
    return f"{prefix}_{time.strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"


def row(sql: str, *args: Any) -> dict[str, Any] | None:
    r = connect().execute(sql, args).fetchone()
    return dict(r) if r else None


def rows(sql: str, *args: Any) -> list[dict[str, Any]]:
    return [dict(r) for r in connect().execute(sql, args).fetchall()]


def update_job(job_id: str, **fields: Any) -> None:
    fields["updated_at"] = time.time()
    for k, v in list(fields.items()):
        if isinstance(v, (dict, list)):
            fields[k] = json.dumps(v, ensure_ascii=False)
    cols = ", ".join(f"{k} = ?" for k in fields)
    with tx() as c:
        c.execute(f"UPDATE jobs SET {cols} WHERE id = ?", (*fields.values(), job_id))


def add_event(job_id: str, type_: str, message: str, stage: str | None = None,
              payload: dict[str, Any] | None = None) -> None:
    with tx() as c:
        c.execute(
            "INSERT INTO job_events (job_id, ts, type, stage, message, payload_json) VALUES (?,?,?,?,?,?)",
            (job_id, time.time(), type_, stage, message, json.dumps(payload or {}, ensure_ascii=False)),
        )


def job(job_id: str) -> dict[str, Any] | None:
    j = row("SELECT * FROM jobs WHERE id = ?", job_id)
    if not j:
        return None
    for key in ("triage_json", "changeset_json", "verdict_json", "resolution_json"):
        if j.get(key):
            j[key[:-5]] = json.loads(j[key])
        j.pop(key, None)
    return j
