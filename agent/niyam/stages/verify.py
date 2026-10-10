"""Stage 5, verify: an independent check of the new rules against the law.

The verifier never sees the code change or the encoder's reasoning. It reads
the document and the rules as they were before, writes its own test citizens
with expected results, and those citizens are run against the new branch. If it
saw the diff it would tend to agree with it; writing expectations from the law
alone is what makes this a real second opinion."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .. import llm, rulebook
from ..config import settings
from ..models import VerifierPlan

SYSTEM = """You are the Niyam verifier, an independent checker. You did not write the rule changes and you cannot see them.

You get a government document and the rules of the scheme(s) as they were BEFORE this document. Write test citizens that check whether a rulebook correctly applies the law AFTER this document.

Rules:
- Write 10 to 16 cases. Start with boundary cases for every limit the document sets or changes (just below, exactly at, just above), then cases for each condition the document adds or removes, then one or two typical cases, and one case dated before the document showing the old rule still applies.
- Each case changes as little as possible from a person who is otherwise clearly eligible, so the case tests one thing. Fill every condition of the old rules that the document does not change so that the person meets it.
- person must be a JSON object using only the person fields listed. Dates are YYYY-MM-DD. Age is in completed years.
- expect_monthly_inr only when the document or old rules determine the amount, else null.
- Cite the clause your expectation depends on with an exact quote from the document (or from the old rules, for cases about unchanged conditions).
- Read limits literally. "more than X" excludes X. "X or more" includes X. "not more than X" includes X. If a limit is genuinely ambiguous, test it anyway and explain your reading in reasoning."""


def plan(pdf_path: Path, scheme_ids: list[str], doc_date: str | None) -> VerifierPlan:
    old_rules = "\n\n".join(rulebook.rules_for_prompt(s, doc_date) for s in scheme_ids)
    content = [llm.pdf_block(pdf_path), {"type": "text", "text": (
        f"RULES BEFORE THIS DOCUMENT:\n{old_rules}\n\nPERSON FIELDS:\n{rulebook.person_schema_text()}\n\n"
        f"GLOSSARY:\n{rulebook.glossary_text()}\n\nDocument date: {doc_date or 'unknown'}. Schemes: {', '.join(scheme_ids)}."
    )}]
    return llm.parse(model=settings.model_verify, system=SYSTEM, content=content, output=VerifierPlan,
                     max_tokens=16000, effort="high", stage="verify")


def check(wt: Path, vplan: VerifierPlan) -> dict[str, Any]:
    cases, prepared = [], []
    for c in vplan.cases:
        try:
            person = json.loads(c.person)
            if not isinstance(person, dict):
                raise ValueError("person is not an object")
        except Exception as e:
            cases.append({"case": c.model_dump(), "status": "invalid", "error": f"person JSON: {e}"})
            continue
        prepared.append((c, person))
    results = rulebook.simulate_batch(wt, [{"person": p, "date": c.date, "scheme": c.scheme_id} for c, p in prepared])
    agree = disagree = invalid = 0
    disagreements = []
    for (c, person), res in zip(prepared, results):
        entry = {"name": c.name, "date": c.date, "person": person, "scheme_id": c.scheme_id,
                 "expected": {"eligible": c.expect_eligible, "monthly_inr": c.expect_monthly_inr},
                 "reasoning": c.reasoning, "citation": c.citation.model_dump()}
        if not res.get("ok"):
            invalid += 1
            cases.append({**entry, "status": "invalid", "error": res.get("error")})
            continue
        actual = res["result"].get(c.scheme_id, {})
        entry["actual"] = {"eligible": actual.get("eligible"), "monthly_inr": actual.get("monthly_inr"),
                           "unmet": [r["id"] for r in actual.get("reasons", []) if not r["met"]]}
        ok = actual.get("eligible") == c.expect_eligible
        if ok and c.expect_monthly_inr is not None and actual.get("eligible"):
            ok = abs(float(actual.get("monthly_inr") or 0) - c.expect_monthly_inr) < 0.5
        entry["status"] = "agree" if ok else "disagree"
        cases.append(entry)
        if ok:
            agree += 1
        else:
            disagree += 1
            disagreements.append(entry)
    valid = agree + disagree
    return {"cases_total": len(vplan.cases), "cases_valid": valid, "cases_agree": agree,
            "cases_disagree": disagree, "cases_invalid": sum(1 for c in cases if c.get("status") == "invalid"),
            "agreement_rate": (agree / valid) if valid else 0.0,
            "verdict": "agree" if valid and not disagree else ("disagree" if disagree else "inconclusive"),
            "disagreements": disagreements, "cases": cases}
