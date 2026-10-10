"""Stage 0, watch: find new government orders on official sources.

Maharashtra GR portal: the default list of the latest orders is public and has
no CAPTCHA, and each row links straight to its PDF. The portal's search form
does have a CAPTCHA. Niyam never uses the search form and never tries to get
around a CAPTCHA or a login. If a source starts asking for one, the watcher
marks it BLOCKED and the demo continues from saved copies (replay).

Etiquette: one request every two seconds, a User-Agent with a contact address,
timeouts, and retries with backoff.
"""

from __future__ import annotations

import html
import json
import random
import re
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from .. import db, llm
from ..config import settings

LIST_URL = "https://gr.maharashtra.gov.in/1145/Government-Resolutions"
PDF_BASE = "https://gr.maharashtra.gov.in/Site/Upload/Government%20Resolutions/Marathi/"
UA = "Mozilla/5.0 (compatible; NiyamWatcher/0.1; +https://github.com/usv240/niyam; contact ujwalvanjare6@gmail.com)"
STATUS_FILE = settings.db_path.parent / "sources_status.json"

# Departments whose orders can affect the covered schemes. Others are skipped
# before download, which keeps the watcher cheap and polite.
WATCHED_DEPARTMENTS = ("महिला व बाल विकास", "सामाजिक न्याय", "कृषि", "नियोजन", "वित्त", "आदिवासी विकास", "अल्पसंख्याक")


@dataclass
class Listing:
    code: str
    department: str
    title: str
    date: str
    url: str


def _status(source: str, state: str, detail: str) -> None:
    data = json.loads(STATUS_FILE.read_text(encoding="utf-8")) if STATUS_FILE.exists() else {}
    data[source] = {"state": state, "detail": detail, "checked_at": time.time()}
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATUS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def source_status() -> dict[str, Any]:
    return json.loads(STATUS_FILE.read_text(encoding="utf-8")) if STATUS_FILE.exists() else {}


def _get(client: httpx.Client, url: str) -> httpx.Response:
    if "source_timeout" in settings.chaos and llm._chaos_once("source_timeout"):
        raise httpx.ConnectTimeout("injected test failure (chaos flag)")
    last: Exception | None = None
    for attempt in range(3):
        try:
            resp = client.get(url)
            if resp.status_code >= 500:
                raise httpx.HTTPStatusError(f"server error {resp.status_code}", request=resp.request, response=resp)
            return resp
        except (httpx.TransportError, httpx.HTTPStatusError) as e:
            last = e
            delay = 2 ** attempt + random.random()
            print(f"[watch] {url} failed ({e}); retrying in {delay:.1f}s")
            time.sleep(delay)
    raise RuntimeError(f"{url} unreachable after 3 attempts: {last}")


def parse_listing(page: str) -> list[Listing]:
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S):
        cells = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
                 for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        link = re.search(r'href="([^"]*?(\d{18})\.pdf)"', row)
        if len(cells) >= 5 and link:
            day, month, year = (cells[4].split("-") + ["", "", ""])[:3]
            out.append(Listing(code=link.group(2), department=cells[1], title=cells[2],
                               date=f"{year}-{month}-{day}" if year else cells[4], url=PDF_BASE + f"{link.group(2)}.pdf"))
    return out


def poll_maharashtra(limit: int = 10) -> list[str]:
    """Return ids of jobs created for new, relevant-department documents."""
    from .. import orchestrator

    created = []
    with httpx.Client(headers={"User-Agent": UA}, timeout=httpx.Timeout(60, connect=20), follow_redirects=True) as client:
        try:
            resp = _get(client, LIST_URL)
        except Exception as e:
            _status("maharashtra_gr", "DEGRADED", f"List page unreachable: {e}. Will retry next cycle.")
            print(f"[watch] recovery.source_degraded: {e}")
            return created
        if re.search(r"captcha", resp.text, re.I) and not parse_listing(resp.text):
            _status("maharashtra_gr", "BLOCKED", "The list now requires a CAPTCHA. Niyam never bypasses CAPTCHAs; using saved copies.")
            return created
        listings = parse_listing(resp.text)
        _status("maharashtra_gr", "OK", f"Read {len(listings)} latest orders from the public list.")
        for item in listings[:limit]:
            if db.row("SELECT id FROM documents WHERE code = ?", item.code):
                continue
            if not any(d in item.department for d in WATCHED_DEPARTMENTS):
                continue
            time.sleep(2)
            try:
                pdf = _get(client, item.url)
            except Exception as e:
                print(f"[watch] skipped {item.code}: {e}")
                continue
            if not pdf.content.startswith(b"%PDF"):
                continue
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(pdf.content)
                tmp = Path(f.name)
            doc_id = orchestrator.add_document(tmp, "maharashtra_gr", {
                "code": item.code, "title": item.title, "published_at": item.date, "department": item.department,
                "source_url": item.url})
            tmp.unlink(missing_ok=True)
            created.append(orchestrator.create_job(doc_id))
    return created


def run(once: bool = False, limit: int = 10, interval: int = 900) -> None:
    from .. import orchestrator

    while True:
        jobs = poll_maharashtra(limit)
        print(f"[watch] {len(jobs)} new job(s)")
        for job_id in jobs:
            orchestrator.run_job(job_id)
        if once:
            return
        time.sleep(interval)
