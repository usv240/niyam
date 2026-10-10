"""Stage 1, triage: does this document change any scheme we cover?

Uses the fast model and only the opening pages, because most government
orders are about unrelated matters and should cost almost nothing."""

from __future__ import annotations

from pathlib import Path

from .. import llm, rulebook
from ..config import settings
from ..models import Triage
from ..pdftext import PdfText

SYSTEM = """You screen Indian government documents (Government Resolutions, circulars, notifications) for Niyam, which keeps welfare eligibility rules up to date.

Decide whether the document changes who is eligible for, or how much is paid by, one of the covered schemes listed below.
- relevant = true only if it changes eligibility conditions, limits, amounts, start dates, or creates or closes a covered scheme.
- Documents only about committees, deadlines for applying, staff incentives, budgets, fund releases or required paperwork are not relevant, but still name the scheme if it is a covered one.
- Use only scheme ids from the list. Do not guess."""


def run(doc: PdfText, pdf_path: Path, title_hint: str = "") -> Triage:
    overview = rulebook.schemes_overview()
    head = doc.joined(max_pages=3)
    content: list[dict] = []
    if sum(len(p) for p in doc.pages[:3]) < 300:
        # No usable text layer on the first pages: let the model read the PDF itself.
        content.append(llm.pdf_block(pdf_path))
        head = "(The text layer is missing; read the attached PDF.)"
    content.append({"type": "text", "text": (
        f"Covered schemes:\n{overview}\n\nDocument title hint: {title_hint or 'none'}\n\n"
        f"Opening pages (text layer, Devanagari may be garbled by font encoding):\n{head[:12000]}"
    )})
    return llm.parse(model=settings.model_fast, system=SYSTEM, content=content, output=Triage,
                     max_tokens=2000, stage="triage")
