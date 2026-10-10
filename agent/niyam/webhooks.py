"""Webhooks: tell subscribers when a rule change is proposed, merged, or needs a human.

Each delivery is a JSON POST signed with HMAC-SHA256 over the raw body:
    X-Niyam-Event: rule.changed | rule.change_proposed | job.needs_human
    X-Niyam-Signature: sha256=<hex>
Only public https URLs are accepted, so the server can never be pointed at an
internal address. Deliveries retry three times with backoff, in the background.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
import secrets
import socket
import threading
import time
from typing import Any
from urllib.parse import urlparse

import httpx

from . import db

EVENTS = {"rule.changed", "rule.change_proposed", "job.needs_human"}


class WebhookError(ValueError):
    pass


def check_url(url: str) -> None:
    u = urlparse(url)
    if u.scheme != "https" or not u.hostname:
        raise WebhookError("Webhook URLs must use https.")
    try:
        infos = socket.getaddrinfo(u.hostname, u.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise WebhookError(f"Cannot resolve {u.hostname}.") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            raise WebhookError("Webhook URLs must point to a public address.")


def create(key_id: str, url: str, events: list[str]) -> dict[str, Any]:
    bad = set(events) - EVENTS
    if bad or not events:
        raise WebhookError(f"Events must be from {sorted(EVENTS)}.")
    check_url(url)
    hook_id, secret = db.new_id("hook"), "whsec_" + secrets.token_urlsafe(24)
    with db.tx() as c:
        c.execute("INSERT INTO webhooks (id, key_id, url, secret, events, created_at) VALUES (?,?,?,?,?,?)",
                  (hook_id, key_id, url, secret, ",".join(sorted(set(events))), time.time()))
    return {"id": hook_id, "url": url, "events": sorted(set(events)), "secret": secret}


def sign(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _deliver(hook: dict[str, Any], event: str, body: bytes) -> None:
    headers = {"Content-Type": "application/json", "X-Niyam-Event": event, "X-Niyam-Signature": sign(hook["secret"], body),
               "User-Agent": "Niyam-Webhooks/1.0"}
    for attempt in range(3):
        try:
            check_url(hook["url"])  # re-check: DNS can change after registration
            r = httpx.post(hook["url"], content=body, headers=headers, timeout=10, follow_redirects=False)
            if r.status_code < 300:
                return
        except Exception:
            pass
        time.sleep(2 ** attempt * 3)


def emit(event: str, payload: dict[str, Any]) -> int:
    hooks = [h for h in db.rows("SELECT * FROM webhooks WHERE disabled_at IS NULL") if event in h["events"].split(",")]
    body = json.dumps({"event": event, "sent_at": time.time(), "data": payload}, ensure_ascii=False).encode()
    for h in hooks:
        threading.Thread(target=_deliver, args=(h, event, body), daemon=True).start()
    return len(hooks)
