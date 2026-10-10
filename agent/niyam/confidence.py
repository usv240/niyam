"""Confidence score and the autonomy policy: when Niyam may merge on its own."""

from __future__ import annotations

from typing import Any

from .models import ChangeSet

TYPE_SAFETY = {
    "parameter_update": 1.0, "effective_date_changed": 0.9, "benefit_changed": 0.8,
    "condition_changed": 0.6, "condition_added": 0.5, "condition_removed": 0.5,
    "definition_changed": 0.4, "scheme_created": 0.3, "scheme_closed": 0.3,
}
STRUCTURAL = {"condition_added", "condition_removed", "condition_changed", "definition_changed",
              "scheme_created", "scheme_closed"}


def score(cs: ChangeSet, verdict: dict[str, Any] | None, tests_ok: bool, rejected_quotes: int) -> float:
    if not cs.changes:
        return 0.0
    extraction = sum(c.confidence for c in cs.changes) / len(cs.changes)
    extraction *= max(0.0, 1 - 0.15 * rejected_quotes)
    agreement = (verdict or {}).get("agreement_rate", 0.0)
    safety = min(TYPE_SAFETY.get(c.change_type, 0.4) for c in cs.changes)
    return round(0.35 * extraction + 0.35 * agreement + 0.15 * (1.0 if tests_ok else 0.0) + 0.15 * safety, 3)


def decide(cs: ChangeSet, confidence: float, verdict: dict[str, Any] | None, unresolved: int,
           is_byod: bool) -> tuple[str, list[str]]:
    """Returns (decision, reasons). Decisions: auto_merge, human_review, needs_human."""
    reasons: list[str] = []
    if is_byod:
        reasons.append("Uploaded documents run on a sandbox branch and are never merged automatically.")
    if any(c.affects in ("narrows", "mixed") for c in cs.changes):
        reasons.append("At least one change removes people from a scheme. Niyam never does that without a human.")
    structural = sorted({c.change_type for c in cs.changes} & STRUCTURAL)
    if structural:
        reasons.append(f"Structural change ({', '.join(structural)}), not only a number or a date.")
    if cs.ambiguities:
        reasons.append(f"{len(cs.ambiguities)} ambiguous clause(s) flagged during extraction.")
    if unresolved:
        reasons.append(f"{unresolved} disagreement(s) between the encoder and the verifier are unresolved.")
    if verdict and verdict.get("cases_disagree"):
        reasons.append("The verifier still disagrees on some test citizens.")
    if confidence < 0.9:
        reasons.append(f"Confidence {confidence:.2f} is below the 0.90 needed to merge alone.")

    if unresolved or confidence < 0.7 or (cs.ambiguities and confidence < 0.8):
        return "needs_human", reasons
    if reasons:
        return "human_review", reasons
    return "auto_merge", ["Only numbers or dates changed, every boundary test agrees, and confidence is at least 0.90."]
