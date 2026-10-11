"""Read every page as three first-time visitors and list what would confuse them.

  python scripts/newcomer_review.py    (needs data/page-text.json from data/page-text.mjs)

Personas: a non-technical citizen, a user more comfortable in Hindi or Marathi,
and a hackathon judge with three minutes. Output: data/newcomer-review.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "agent"))

from niyam import llm  # noqa: E402


class Issue(BaseModel):
    persona: str = Field(description="citizen, hindi_marathi_user or judge")
    where: str = Field(description="The exact words or section on the page")
    problem: str = Field(description="Why this persona would be confused or stuck")
    fix: str = Field(description="A concrete fix: plain-English rewording, an info button with suggested text, an English translation, or a missing step")
    severity: str = Field(description="high (blocks understanding), medium, or low")


class PageReview(BaseModel):
    understandable_in_one_visit: bool = Field(description="Could each persona say what this page is for and what to do next, without help?")
    issues: list[Issue]


SYSTEM = """You test a website for first-time visitors. You read one page's visible text and play three people:
1. citizen: an Indian adult with no technical background who wants to know if she can get welfare money.
2. hindi_marathi_user: reads English slowly; prefers Hindi or Marathi; needs every Devanagari text to have English nearby and every English term to be simple.
3. judge: a hackathon judge (AI agent and developer tools background) with three minutes, looking for what the agent does and the evidence.

Report only real problems: unexplained jargon or acronyms (on first use), Devanagari text with no English next to it, missing "what is this page and what do I do here", unclear next step, numbers without context, and anything a judge cannot verify. Be specific: quote the words. Do not report things that are already explained on the same page. At most 12 issues per page, most important first."""


def main() -> None:
    pages = json.loads((ROOT / "data" / "page-text.json").read_text(encoding="utf-8"))
    out = {}
    for route, v in pages.items():
        r = llm.parse(model="claude-sonnet-5-5", system=SYSTEM, output=PageReview, max_tokens=8000, stage="newcomer-review",
                      content=f"Page {route} (it has {v['info_buttons']} info buttons that explain terms on tap).\n\nVisible text:\n{v['text'][:14000]}")
        out[route] = json.loads(r.model_dump_json())
        print(route, "ok" if r.understandable_in_one_visit else "NOT understandable in one visit", len(r.issues), "issues")
    (ROOT / "data" / "newcomer-review.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    llm.shutdown()


if __name__ == "__main__":
    main()
