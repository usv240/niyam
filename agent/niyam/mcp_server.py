"""Niyam as an MCP server, so any AI assistant can use current, sourced welfare rules.

  claude mcp add niyam -- uvx --from "git+https://github.com/usv240/niyam#subdirectory=agent" niyam-mcp
  (optional) set NIYAM_API_KEY and NIYAM_API_BASE in the environment.

Tools call the public Niyam API, so the assistant always gets the rules as they
are right now, each with the clause of the government order behind it.
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
from mcp.server.mcpserver import MCPServer

API = os.getenv("NIYAM_API_BASE", "http://localhost:8000").rstrip("/") + "/api/v1"
KEY = os.getenv("NIYAM_API_KEY")

mcp = MCPServer("niyam", website_url="https://github.com/usv240/niyam", instructions=(
    "Niyam answers questions about Indian welfare scheme eligibility using rules kept in sync with government orders. "
    "Always show the user the source clause returned with each rule, and remind them that the government department makes the final decision."
))


def _call(method: str, path: str, **kwargs: Any) -> Any:
    headers = {"Authorization": f"Bearer {KEY}"} if KEY else {}
    r = httpx.request(method, API + path, headers=headers, timeout=60, **kwargs)
    if r.status_code >= 400:
        return {"error": r.json().get("error", r.text)}
    return r.json()


@mcp.tool()
def check_eligibility(age: int, gender: str, annual_family_income: float, marital_status: str = "married",
                      state: str = "MH", date: str | None = None, extra_facts: str | None = None) -> str:
    """Check which covered welfare schemes a person may be eligible for.

    Args:
        age: age in completed years
        gender: female, male or other
        annual_family_income: yearly family income in rupees
        marital_status: married, widowed, divorced, abandoned, destitute or unmarried
        state: MH for Maharashtra, otherwise "other"
        date: assess on this date (YYYY-MM-DD), default today
        extra_facts: optional JSON object with more facts, for example {"family_govt_job": "contract", "other_scheme_monthly_inr": 1000}
    """
    person: dict[str, Any] = {"age": age, "gender": gender, "annual_family_income": annual_family_income,
                              "marital_status": marital_status, "state": state}
    if date:
        person["date"] = date
    if extra_facts:
        person.update(json.loads(extra_facts))
    return json.dumps(_call("POST", "/eligibility", json=person), ensure_ascii=False, indent=1)


@mcp.tool()
def explain_rules(scheme_id: str = "mh.ladki_bahin", date: str | None = None) -> str:
    """Show the rules of a scheme on a date, each with the government order clause it comes from."""
    return json.dumps(_call("GET", f"/schemes/{scheme_id}/rules", params={"at": date} if date else {}), ensure_ascii=False, indent=1)


@mcp.tool()
def rule_history(scheme_id: str = "mh.ladki_bahin") -> str:
    """Every change to a scheme's rules over time, with sources and the agent's change requests."""
    return json.dumps(_call("GET", f"/schemes/{scheme_id}/history"), ensure_ascii=False, indent=1)


@mcp.tool()
def list_schemes() -> str:
    """List the schemes Niyam covers."""
    return json.dumps(_call("GET", "/schemes"), ensure_ascii=False, indent=1)


@mcp.tool()
def recent_changes(limit: int = 10) -> str:
    """Recent rule changes Niyam has processed, in plain language, with links to the proof."""
    return json.dumps(_call("GET", "/changes", params={"limit": limit}), ensure_ascii=False, indent=1)


@mcp.tool()
def submit_document(url: str) -> str:
    """Ask Niyam to process a government order (PDF link) on a sandbox branch. Returns a job id to follow."""
    return json.dumps(_call("POST", "/documents", data={"url": url}), ensure_ascii=False, indent=1)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
