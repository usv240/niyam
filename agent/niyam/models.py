"""Contracts between stages. Every model output is validated against one of these."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

DocumentKind = Literal["amendment", "new_scheme", "corrigendum", "clarification", "procedural", "unrelated"]
ChangeType = Literal[
    "parameter_update", "condition_added", "condition_removed", "condition_changed",
    "definition_changed", "benefit_changed", "scheme_created", "scheme_closed", "effective_date_changed",
]


class Triage(BaseModel):
    relevant: bool = Field(description="True only if the document changes who is eligible, or how much they get, for a covered scheme")
    scheme_ids: list[str] = Field(description="Covered scheme ids this document affects; empty if none")
    document_kind: DocumentKind
    language: str = Field(description="ISO code of the main language, for example mr, hi or en")
    title_en: str = Field(description="Short English title of the document")
    document_date: Optional[str] = Field(description="Date of the document as YYYY-MM-DD if stated")
    reason: str = Field(description="One sentence explaining the decision")
    confidence: float = Field(description="0 to 1")


class Citation(BaseModel):
    page: int = Field(description="1-based PDF page number where the quote appears")
    clause: str = Field(description="Clause or row number as printed, for example 4(3) or row 3")
    quote_original: str = Field(description="Exact words copied from the document in its own language, 5 to 40 words, without paraphrasing")
    quote_english: str = Field(description="Faithful English translation of the quote")


class Change(BaseModel):
    change_id: str = Field(description="c1, c2, ...")
    scheme_id: str
    change_type: ChangeType
    target: str = Field(description="Existing parameter name or condition id that changes, or a new snake_case id for something new")
    summary: str = Field(description="One plain English sentence describing the change")
    old_value: Optional[str] = Field(description="Previous value as written in the rulebook, as a JSON literal (number, string or list), or null")
    new_value: Optional[str] = Field(description="New value as a JSON literal (number, string or list), or null when a condition is removed")
    boundary: Optional[Literal["inclusive", "exclusive", "not_applicable"]] = Field(description="Whether a value equal to the limit is allowed")
    effective_from: str = Field(description="YYYY-MM-DD from which the change applies")
    affects: Literal["widens", "narrows", "mixed", "neutral"] = Field(description="Whether more people (widens) or fewer people (narrows) become eligible")
    citation: Citation
    confidence: float = Field(description="0 to 1")


class Ambiguity(BaseModel):
    question: str = Field(description="A plain English question a human expert should answer")
    readings: list[str] = Field(description="The possible interpretations")
    citation: Citation


class Skipped(BaseModel):
    topic: str = Field(description="What the document changes that the rulebook does not model, for example required documents or committees")
    reason: str


class ChangeSet(BaseModel):
    document_code: Optional[str] = Field(description="The 18 digit GR code (sanketank) if printed")
    document_date: Optional[str]
    title_en: str
    title_original: str
    supersedes: list[str] = Field(description="Codes or dates of earlier documents this one amends or corrects")
    changes: list[Change]
    ambiguities: list[Ambiguity]
    skipped: list[Skipped]


class TestCitizen(BaseModel):
    name: str = Field(description="Short description of what this case tests")
    date: str = Field(description="YYYY-MM-DD on which the person is assessed")
    person: str = Field(description="JSON object with person fields, using only fields from the person schema")
    scheme_id: str
    expect_eligible: bool
    expect_monthly_inr: Optional[float] = Field(description="Expected monthly amount if the document determines it, else null")
    reasoning: str = Field(description="Why this is the expected result, referring to the clause")
    citation: Citation


class VerifierPlan(BaseModel):
    cases: list[TestCitizen]


class Resolution(BaseModel):
    decision: Literal["encoder_wrong", "verifier_wrong", "ambiguous"]
    explanation: str = Field(description="Plain English explanation that a reviewer can follow")
    fix_instruction: Optional[str] = Field(description="If encoder_wrong: exactly what to change in the rulebook")
    human_question: Optional[str] = Field(description="If ambiguous: the question for a human expert")
    glossary_entry: Optional[str] = Field(description="A reusable interpretation rule learned from this case, in Markdown, or null")


class Changelog(BaseModel):
    en: str
    hi: str
    mr: str
