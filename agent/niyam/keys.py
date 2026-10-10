"""API keys and rate limits.

Keys look like ``niyam_live_<32 chars>``. Only a salted SHA-256 hash and the last
four characters are stored; the full key is shown once. Limits are per key, or
per IP address for requests without a key, using a simple token bucket."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import string
import threading
import time
from dataclasses import dataclass

from . import db
from .config import settings

ALPHABET = string.ascii_letters + string.digits
TIERS = {
    # requests per minute, BYOD document jobs per day
    "anonymous": (30, 3),
    "open": (120, 20),
    "navigator": (600, 200),
}


def _hash(key: str) -> str:
    return hmac.new(settings.key_secret.encode(), key.encode(), hashlib.sha256).hexdigest()


def create(name: str, owner: str, scopes: str = "read,run", tier: str = "open") -> dict:
    key = "niyam_live_" + "".join(secrets.choice(ALPHABET) for _ in range(32))
    key_id = db.new_id("key")
    with db.tx() as c:
        c.execute("INSERT INTO api_keys (id, owner, name, prefix, hash, last4, scopes, tier, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                  (key_id, owner, name, "niyam_live_", _hash(key), key[-4:], scopes, tier, time.time()))
    return {"id": key_id, "key": key, "last4": key[-4:], "scopes": scopes.split(","), "tier": tier}


def lookup(key: str | None) -> dict | None:
    if not key:
        return None
    r = db.row("SELECT * FROM api_keys WHERE hash = ? AND revoked_at IS NULL", _hash(key.strip()))
    return r


def revoke(key_id: str, owner_key: dict) -> bool:
    if owner_key["id"] != key_id:
        return False
    with db.tx() as c:
        c.execute("UPDATE api_keys SET revoked_at = ? WHERE id = ?", (time.time(), key_id))
    return True


def record_usage(key_id: str, calls: int = 1, jobs: int = 0, cost: float = 0.0) -> None:
    day = time.strftime("%Y-%m-%d")
    with db.tx() as c:
        c.execute("INSERT INTO usage (key_id, day, calls, jobs, cost_usd) VALUES (?,?,?,?,?) "
                  "ON CONFLICT(key_id, day) DO UPDATE SET calls = calls + excluded.calls, jobs = jobs + excluded.jobs, "
                  "cost_usd = cost_usd + excluded.cost_usd", (key_id, day, calls, jobs, cost))


def jobs_today(key_id: str) -> int:
    r = db.row("SELECT jobs FROM usage WHERE key_id = ? AND day = ?", key_id, time.strftime("%Y-%m-%d"))
    return r["jobs"] if r else 0


@dataclass
class Bucket:
    tokens: float
    updated: float


class RateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, Bucket] = {}
        self._lock = threading.Lock()

    def allow(self, ident: str, per_minute: int) -> tuple[bool, int, float]:
        now = time.time()
        with self._lock:
            b = self._buckets.get(ident) or Bucket(tokens=per_minute, updated=now)
            b.tokens = min(per_minute, b.tokens + (now - b.updated) * per_minute / 60)
            b.updated = now
            ok = b.tokens >= 1
            if ok:
                b.tokens -= 1
            self._buckets[ident] = b
            reset = (1 - b.tokens) * 60 / per_minute if not ok else 0.0
            return ok, int(b.tokens), reset


limiter = RateLimiter()
