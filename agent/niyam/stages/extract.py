"""Stage 2, extract: quote the exact clauses that change eligibility.

The model reads the PDF itself. Every quote it returns is then checked against
the document text; quotes that are not on the cited page are rejected, and the
model gets one chance to fix them. This stops invented citations from ever
reaching the code."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

from pydantic import BaseModel

from .. import llm, rulebook
from ..config import settings
from ..models import ChangeSet
from ..pdftext import PdfText, find_quote

SYSTEM = """You are a careful legal analyst for Niyam. Niyam keeps Maharashtra welfare eligibility rules, written as code, in sync with government orders.

Read the attached government document and list every change it makes to the eligibility rules or benefits of the schemes given.

Rules:
1. Compare the document with the CURRENT RULES given. Report only what the document actually changes. If a value is restated unchanged, it is not a change.
2. Quote the exact words from the document in its original language (quote_original), 5 to 40 words, copied character for character from the printed text. Never paraphrase or translate inside quote_original. Give the 1-based PDF page number where the quote is printed.
3. For each change, use an existing parameter name or condition id from the current rules as the target when one fits. old_value must be the current rulebook value. Values are JSON literals: numbers without commas (250000), strings in double quotes, lists like ["regular", "pensioner"].
4. Prefer parameter_update when only a number or list changes. Use condition_changed when the comparison itself changes (for example "more than" becomes "or more"). Use condition_removed when a condition is deleted.
5. boundary: inclusive if a value equal to the limit is allowed under the new wording, exclusive if not. Read the wording carefully, see the glossary.
6. affects: widens if more people become eligible, narrows if fewer do.
7. If wording can reasonably be read two ways in a way that changes who is eligible, add an ambiguity with both readings instead of guessing silently. Still report the change with your best reading.
8. Put changes to required documents, committees, application deadlines, staff incentives or procedure in skipped, not in changes. The rulebook only models eligibility and benefit amounts.
9. Use the effective date stated in the document; if none, use the document date.
"""


def _check_quotes(cs: ChangeSet, doc_pages: list[str]) -> list[dict[str, Any]]:
    problems = []
    for ch in cs.changes:
        m = find_quote(doc_pages, ch.citation.quote_original, ch.citation.page)
        if not m.found:
            problems.append({"change_id": ch.change_id, "page": ch.citation.page, "quote": ch.citation.quote_original,
                             "best_page": m.page, "score": round(m.score, 2)})
        elif m.page != ch.citation.page:
            ch.citation.page = m.page  # off by one across a page break: correct it
    for amb in cs.ambiguities:
        m = find_quote(doc_pages, amb.citation.quote_original, amb.citation.page)
        if m.found and m.page:
            amb.citation.page = m.page
    return problems


class Transcript(BaseModel):
    pages: list[str]


def transcribe(pdf_path: Path, page_count: int) -> list[str]:
    """Fallback when the PDF has no usable text layer (a scan): ask Claude to transcribe it."""
    out = llm.parse(
        model=settings.model, stage="extract.transcribe", output=Transcript, max_tokens=32000,
        system="Transcribe the attached document exactly, page by page, in its original script. Return one string per PDF page, in order. Do not translate, summarise or fix wording.",
        content=[llm.pdf_block(pdf_path), {"type": "text", "text": f"The document has {page_count} pages."}],
    )
    return out.pages


def run(doc: PdfText, pdf_path: Path, scheme_ids: list[str], doc_date: str | None,
        event: Callable[[str, str], None]) -> tuple[ChangeSet, list[str], list[dict[str, Any]]]:
    """Returns the change set, the page texts used for verification, and rejected quotes."""
    pages = doc.pages
    low = doc.low_text_pages()
    if len(low) > doc.page_count / 2 or llm._chaos_once("ocr"):
        reason = f"{len(low)} of {doc.page_count} pages have no text layer" if low else "injected test failure (chaos flag)"
        event("recovery.ocr_fallback", f"Text layer unusable ({reason}); transcribing the PDF with Claude")
        pages = transcribe(pdf_path, doc.page_count)

    rules = "\n\n".join(rulebook.rules_for_prompt(s, doc_date) for s in scheme_ids)
    context = (
        f"CURRENT RULES (before this document):\n{rules}\n\n"
        f"PERSON FIELDS the rulebook can use:\n{rulebook.person_schema_text()}\n\n"
        f"GLOSSARY of interpretations:\n{rulebook.glossary_text()}\n\n"
        f"Schemes to consider: {', '.join(scheme_ids)}. Document date: {doc_date or 'unknown'}."
    )
    content: list[dict[str, Any]] = [llm.pdf_block(pdf_path), {"type": "text", "text": context}]
    with llm.span("stage.extract.llm", kind="AGENT"):
        cs = llm.parse(model=settings.model, system=SYSTEM, content=content, output=ChangeSet,
                       max_tokens=16000, effort="high", stage="extract")
    rejected = _check_quotes(cs, pages)
    if rejected:
        event("verify.citation_rejected", f"{len(rejected)} quote(s) were not found on the cited page; asking for a correction")
        content.append({"type": "text", "text": (
            "Some quotes in your previous answer were not found in the document on the page you cited:\n"
            + json.dumps(rejected, ensure_ascii=False, indent=1)
            + "\nReturn the full change set again. Copy each quote exactly from the printed text and give the correct page. "
              "If you cannot find words in the document that support a change, remove that change."
        )})
        cs = llm.parse(model=settings.model, system=SYSTEM, content=content, output=ChangeSet,
                       max_tokens=16000, effort="high", stage="extract.retry")
        rejected = _check_quotes(cs, pages)
        if rejected:
            bad = {r["change_id"] for r in rejected}
            cs.changes = [c for c in cs.changes if c.change_id not in bad]
            event("verify.citation_rejected", f"Dropped {len(bad)} change(s) whose quotes could not be verified: {', '.join(sorted(bad))}")
    return cs, pages, rejected
