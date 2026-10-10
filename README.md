# Niyam

**When the law changes, the code changes with it.**

Niyam (Hindi and Marathi for "rule") is an AI agent that reads new government orders and keeps welfare eligibility rules, written as code, in sync with the law. Every rule links to the clause it came from, every change is tested and independently verified, and the agent's full reasoning is saved with the change.

Built during [neatHack 2026](https://neatlogs.com/hackathon) by team USV.

| | |
|---|---|
| Website | *added at deploy time* |
| Demo video | *added on submission day* |
| Rulebook maintained by the agent | [usv240/niyam-rulebook](https://github.com/usv240/niyam-rulebook) |
| Showcase pull request opened by the agent | [usv240/niyam-rulebook#2](https://github.com/usv240/niyam-rulebook/pull/2) |
| Entire checkpoint on that change | `01M4JDH944E4HPRCA4WKDJTFN7` (commit `2d67c14`) |
| Build log | [hackathon.md](hackathon.md) |

## The problem, in one paragraph

In India, eligibility for welfare is decided by software: portals, field-worker apps, helplines, chatbots. The law behind it is published as PDF Government Resolutions (GRs), mostly in Marathi in Maharashtra, and it changes often. Nobody keeps the code in sync. When code drifts from the law, people are wrongly excluded or wrongly paid: in Telangana an eligibility algorithm cancelled more than 1.8 million food cards ([Al Jazeera and Pulitzer Center, 2024](https://www.aljazeera.com/economy/2024/1/24/how-an-algorithm-denied-food-to-thousands-of-poor-in-indias-telangana)), and nobody affected could see why.

## What Niyam does

```
Watch -> Triage -> Extract -> Encode -> Verify -> Resolve -> Publish
```

1. **Watch** the public list of new Maharashtra GRs every 15 minutes (never the CAPTCHA-protected search, never bypassing anything).
2. **Triage** with a fast model: does this order change a covered scheme?
3. **Extract** every eligibility change with the exact Marathi quote, page and clause. Each quote is checked against the PDF; invented quotes and wrong numbers are rejected.
4. **Encode**: Claude Code edits the rulebook in its own git worktree, adds dated values (history is never overwritten), and writes test citizens at every limit. It never sees the raw PDF, only the checked change list.
5. **Verify**: a separate agent on a different model, blind to the code change, writes its own test citizens from the law. They are run against the new rules.
6. **Resolve**: a coordinator settles disagreements, sends precise fixes, or asks a human a plain-English question.
7. **Publish**: a pull request with quotes, verification, confidence and reasons. Entire links the coding agent's session to the commit as a checkpoint. It merges on its own only when the [trust policy](web/app/trust/page.tsx) allows: numbers or dates only, every check agrees, confidence at least 0.90, and nobody loses eligibility.

## Results (measured, small sample)

Six evaluation cases: the real 3 July 2024 Ladki Bahin amendment, the same order as a scan with no text layer, two real unrelated GRs, and two synthetic robustness tests labelled as synthetic inside the PDF (a pure benefit increase, and a hidden prompt injection).

| Metric | v1 | v2 |
|---|---|---|
| Changes found, values, boundaries | 100% | 100% |
| Test citizens get the right answer | 97.6% | **100%** |
| Correct choice to act alone or ask a human | 67% | **100%** |
| Independent verifier agrees | 95.7% | **100%** |
| Cost per document | $0.88 | **$0.29** |
| Time per document | 110 s | **54 s** |

Further runs (in `evals/results/extra/`):

- **A whole scheme from its founding order.** From an empty rulebook and only the real 28 June 2024 GR, Niyam recognised a new scheme, extracted 19 rules, wrote the rulebook and 34 tests, and passed **25 of 25** of our hand-written baseline test citizens, which it never saw ($0.81, 201 s, checkpoint `01M4JFNT0M069MG48K0FT9V50P`).
- **Consistency.** 9 more v2 runs on the three relevant cases: 100% on every metric, $0.61 per relevant order.
- **Recovery under injected failures.** A broken model output and an unusable text layer injected on purpose: both recovered, 100% outcomes.
- **Acting alone.** A labelled synthetic order that only adds people: 2 of 2 runs decided to merge alone (dry run, never merged into the public rulebook). Every run on the real amendment, which removes some people, asked a human.

The improvement came from the neatlogs traces: in v1 the coordinator ruled three different ways on one test case and the job spent $3.05 before the budget stopped it. The root cause was that the benefit formula ("pay the difference") was missing from the context given to the verifier and coordinator. v2 adds it, plus a loop guard. One v2 run was discarded because of a bug in our own file guard; the full, honest story is in [hackathon.md](hackathon.md). Raw results: [evals/results](evals/results).

## Evidence

| Claim | Evidence |
|---|---|
| The agent completes a substantial task end to end | PR [#2](https://github.com/usv240/niyam-rulebook/pull/2): a Marathi GR in, 6 changes encoded with 46 passing tests, 16 of 16 independent checks agree |
| The agent improved | `evals/results/v1.json` and `v2.json`, with neatlogs trace ids for every run |
| We used neatlogs | One trace per job, a span per stage and per recovery; trace ids in every eval result and PR |
| We used Entire | Checkpoints on every agent commit in the rulebook (for example `01M4JDH944E4HPRCA4WKDJTFN7`) and on build commits in this repository |
| We used cfo.ai | Business plan in [business/](business) |
| The agent recovers from failures | Scan with no text layer recovered by transcription (`recovery.ocr_fallback`); a crashed job resumed from its last good state; loop guard escalation |
| Code written during the event | Both repositories created after 12:30 IST on 10 October 2026 |

## How the sponsor tools are used

- **neatlogs**: traces every model call, tool call, retry and cost. We used the traces to find the v1 loop, fix it, and verify the fix with before and after numbers.
- **Entire**: legal provenance. Every rule change by the agent is a commit with an Entire checkpoint holding the coding agent's full session, so anyone can ask "why does this rule say this?". Uses `commit_linking: always` so the headless agent's sessions link without a prompt.
- **cfo.ai**: pricing, costs, revenue and runway, with cost per document taken from measured runs.
- **Claude**: Sonnet 5.5 extracts, Opus 5.5 verifies and resolves, a fast model triages, Claude Code encodes.

## Use it

```bash
# API (eligibility with sources, rules on any date, jobs with live events, BYOD, keys)
cd agent && uv venv && uv pip install -e . && uvicorn niyam.api:app --port 8000

# Run the agent on a government order
python -m niyam process path/to/gr.pdf --date 2024-07-03

# Evaluations
python ../evals/run_evals.py --version v3

# MCP server for AI assistants
claude mcp add niyam --env NIYAM_API_BASE=http://localhost:8000 -- uvx --from "git+https://github.com/usv240/niyam#subdirectory=agent" niyam-mcp

# Website (static export; works without the API)
cd web && npm install && npx next build
```

Keys go in a `.env` file outside the repository (see `.env.example`). Needs `ANTHROPIC_API_KEY`, and `NEATLOGS_API_KEY` for traces.

## Repository layout

| Path | What |
|---|---|
| `agent/niyam/` | The agent: `orchestrator.py` (state machine), `stages/` (triage, extract, encode, verify, resolve, publish), `pdftext.py` (citation checker), `confidence.py` (trust policy), `api.py`, `mcp_server.py`, `sources/watcher.py` |
| `agent/tests/` | Tests for the citation checker, trust policy, watcher and API privacy |
| `evals/` | Harness, cases (real and labelled synthetic), results per version |
| `web/` | Website: landing, demo replay, rule explorer, eligibility checker (English, Hindi, Marathi), BYOD, developers, judges, learn, trust, status |
| `scripts/export_site_data.py` | Builds the website's data from the rulebook and real runs |
| `business/` | Business plan |
| `infra/` | Deployment |

## Limitations

- One scheme so far (Mukhyamantri Majhi Ladki Bahin Yojana), from its real orders.
- Small evaluation set. Only eligibility and amounts are modelled, not documents or procedure.
- Hindi and Marathi interface text needs review by a native speaker.
- Not an official government service. Information only; the government department decides.

## License

MIT
