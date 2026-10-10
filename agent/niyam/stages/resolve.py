"""Stage 6, resolve: settle disagreements between the encoder and the verifier.

For each disagreement the coordinator rereads the clause and decides who is
right. It sends a precise fix to the encoder, accepts the rulebook with a
recorded reason, or escalates to a human with a plain-English question.
Reusable interpretations are written to the glossary so the agent improves."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from .. import llm, rulebook
from ..config import settings
from ..models import ChangeSet, Resolution


class CaseResolution(Resolution):
    case_name: str = Field(description="The name of the disagreeing test case this decision is about")


class ResolutionBatch(BaseModel):
    items: list[CaseResolution]


SYSTEM = """You are the Niyam coordinator. Two independent agents disagree about how a government document changes welfare eligibility.

- The encoder changed the rulebook. Its change set (with quotes) is given.
- The verifier wrote test citizens from the document alone. Some of its expectations do not match what the new rulebook returns.

For each disagreeing case, reread the cited clause in the attached document and decide:
- encoder_wrong: the rulebook does not follow the document. Give fix_instruction: exactly which condition or parameter to change, to what, and why, citing the clause.
- verifier_wrong: the rulebook follows the document and the verifier misread it (or built an invalid test person). Explain why.
- ambiguous: the wording genuinely supports both outcomes and the choice changes who gets paid. Give human_question in plain English with both readings.

Be strict: when in doubt between encoder_wrong and verifier_wrong, check the exact wording ("more than", "or more", "not more than", "until completing"). Prefer ambiguous over guessing when real people would be affected either way.
If the case teaches a reusable reading of a legal phrase, give glossary_entry as a short Markdown section with a heading in quotes and a source line."""


def run(wt: Path, pdf_path: Path, cs: ChangeSet, verdict: dict[str, Any]) -> ResolutionBatch:
    scheme_ids = sorted({c.scheme_id for c in cs.changes}) or sorted({d["scheme_id"] for d in verdict["disagreements"]})
    new_rules = "\n\n".join(rulebook.rules_for_prompt(s, None, root=wt) for s in scheme_ids)
    content = [llm.pdf_block(pdf_path), {"type": "text", "text": (
        f"CHANGE SET applied by the encoder:\n{cs.model_dump_json(indent=1)}\n\n"
        f"NEW RULEBOOK (latest rules):\n{new_rules}\n\n"
        f"DISAGREEING CASES:\n{json.dumps(verdict['disagreements'], ensure_ascii=False, indent=1)}\n\n"
        f"GLOSSARY:\n{rulebook.glossary_text(wt)}"
    )}]
    return llm.parse(model=settings.model_verify, system=SYSTEM, content=content, output=ResolutionBatch,
                     max_tokens=16000, effort="high", stage="resolve")
