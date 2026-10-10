"""PDF text, and the check that every quoted clause really is in the document.

Text layers of Marathi government PDFs are often damaged by font encoding:
the vowel sign ि comes out as ह, a reph (र्) comes out as ण, and so on. Exact
string matching would reject real quotes, so quotes are compared on a
"consonant skeleton": vowel signs, viramas, spaces, punctuation and the letters
most often corrupted are removed from both sides, then compared fuzzily.
"""

from __future__ import annotations

import difflib
import hashlib
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pypdf

_DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
# Letters that broken font encodings most often produce or swallow.
_UNSTABLE = set("हणरल")


def skeleton(text: str) -> str:
    text = unicodedata.normalize("NFC", text).translate(_DEV_DIGITS)
    out = []
    for ch in text:
        cp = ord(ch)
        if 0x0915 <= cp <= 0x0939 or 0x0958 <= cp <= 0x095F or 0x0904 <= cp <= 0x0914:
            if ch not in _UNSTABLE:
                out.append(ch)
        elif ch.isascii() and ch.isalnum():
            out.append(ch.lower())
    return "".join(out)


@dataclass
class PdfText:
    path: Path
    pages: list[str]
    sha256: str

    @property
    def page_count(self) -> int:
        return len(self.pages)

    def low_text_pages(self, min_chars: int = 80) -> list[int]:
        return [i + 1 for i, t in enumerate(self.pages) if len(t.strip()) < min_chars]

    def joined(self, max_pages: int | None = None) -> str:
        pages = self.pages[:max_pages] if max_pages else self.pages
        return "\n".join(f"=== PAGE {i} ===\n{t}" for i, t in enumerate(pages, 1))


def read_pdf(path: Path | str) -> PdfText:
    path = Path(path)
    data = path.read_bytes()
    if not data.startswith(b"%PDF"):
        raise ValueError("not a PDF file")
    reader = pypdf.PdfReader(path)
    pages = []
    for p in reader.pages:
        try:
            pages.append(p.extract_text() or "")
        except Exception:
            pages.append("")
    return PdfText(path=path, pages=pages, sha256=hashlib.sha256(data).hexdigest())


@dataclass
class QuoteMatch:
    found: bool
    page: int | None
    score: float
    cited_page_score: float


def find_quote(doc_pages: list[str], quote: str, cited_page: int | None, threshold: float = 0.78) -> QuoteMatch:
    """Find a quote on the cited page (or anywhere, if the page number is off by one)."""
    q = skeleton(quote)
    if len(q) < 4:
        return QuoteMatch(False, None, 0.0, 0.0)

    def best(page_text: str) -> float:
        s = skeleton(page_text)
        if not s:
            return 0.0
        if q in s:
            return 1.0
        n = len(q)
        top = 0.0
        step = max(1, n // 8)
        for i in range(0, max(1, len(s) - n + 1), step):
            window = s[i:i + n + n // 5]
            r = difflib.SequenceMatcher(None, q, window, autojunk=False).ratio()
            if r > top:
                top = r
                if top > 0.97:
                    break
        return top

    # Numbers decide eligibility, so they must match exactly: every digit run in
    # the quote has to appear on the page (fuzzy matching would accept 75 for 65).
    digit_runs = re.findall(r"\d+", q)

    def numbers_ok(page_text: str) -> bool:
        s = skeleton(page_text)
        return all(run in s for run in digit_runs)

    scores = {i + 1: (best(t) if numbers_ok(t) else 0.0) for i, t in enumerate(doc_pages)}
    cited = scores.get(cited_page or -1, 0.0)
    if cited >= threshold:
        return QuoteMatch(True, cited_page, cited, cited)
    # Allow a neighbouring page: table rows often continue across a page break.
    page, score = max(scores.items(), key=lambda kv: kv[1]) if scores else (None, 0.0)
    near = cited_page is None or (page is not None and abs(page - cited_page) <= 1)
    return QuoteMatch(score >= threshold and near, page, score, cited)


_GR_CODE = re.compile(r"(?<!\d)(20\d{16})(?!\d)")


def find_gr_code(text: str) -> str | None:
    codes = _GR_CODE.findall(text.translate(_DEV_DIGITS))
    return codes[-1] if codes else None
