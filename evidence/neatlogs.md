# Evidence: how Niyam uses neatlogs

## Setup

`agent/niyam/llm.py`: `neatlogs.init(api_key=..., endpoint="https://ingest.neatlogs.com", workflow_name="niyam-rule-sync")`, and the Anthropic client wrapped with `neatlogs.wrap(...)`. Every job is one trace: a WORKFLOW span for the job, an AGENT span per stage, CHAIN spans for every recovery (`recovery.ocr_fallback`, `recovery.json_repair`, `recovery.model_fallback`), and the model calls with tokens and cost. Spans carry `niyam.job_id`, `niyam.eval_case`, `niyam.version`, `niyam.chaos`, `niyam.byod`, the decision and the confidence. Delivery checked with `neatlogs.get_delivery_diagnostics()`: zero export failures, zero dropped spans.

## How the traces improved the agent (before and after)

| | v1 | v2 |
|---|---|---|
| Outcome accuracy (6 cases) | 97.6% | 100% |
| Correct act-alone or ask decision | 67% | 100% |
| Verifier agreement | 95.7% | 100% |
| Cost per document | $0.88 | $0.29 |
| Time per document | 110 s | 54 s |

1. The v1 trace for the real amendment (trace id `45ff1089efb90629627b392f12963dc0`) cost $3.05 and ended in a budget stop. Its `stage.resolve` spans show the coordinator deciding three different ways on the same test case, and the `stage.encode` spans show three fixes that changed nothing.
2. Reading the inputs of the verifier and coordinator spans showed why: the rules they were given had no benefit formula, so neither could predict that a woman already receiving Rs 1,499 from another scheme gets Rs 1, not Rs 1,500.
3. Fix (commit `d5592eb`): benefit formula and its source in every rules context, and a loop guard.
4. The v2 trace for the same case (`944791d2117cedceb0d449a60fd25c0d`): one encode round, every verifier case agrees, $0.67.

5. v3 (cost): per-stage costs from the traces showed the coding agent at 56% of spend. Stage-by-stage model tests cut cost per document to $0.13 with 100% quality kept; one cheaper option (Haiku extraction) was rejected because it missed a real change.

Trace ids for every evaluation run are in `evals/results/v1.json` and `v2.json`, and on the website's judges page.

## Domain-expert rubric (paste into neatlogs evals)

A person who knows welfare schemes, not code, can judge runs with this rubric in neatlogs:

1. Every rule change quotes the exact clause of the government order, with page and clause number.
2. Age and income limits match the order's wording: "more than" excludes the limit, "or more" includes it, "not more than" includes it.
3. Eligibility is never widened or narrowed without a quoted clause.
4. Changes that remove people from a scheme are sent to a human, never merged automatically.
5. Procedure and paperwork changes (documents, committees, deadlines) are skipped, not encoded as eligibility.
6. Unclear clauses are escalated with both readings, not guessed.
7. Instructions written inside a document are ignored.

## Screenshots to add (team leader, from the neatlogs dashboard)

- `neatlogs-v1-loop.png`: the v1 amendment trace with the repeated resolve spans.
- `neatlogs-v2-clean.png`: the v2 trace for the same case.
- `neatlogs-recovery.png`: the scanned case trace showing `recovery.ocr_fallback`.

## Incidents neatlogs flagged, and how each was fixed

neatlogs detections run over our traces and flag spans that need attention. Three real incidents from the build, each fixed in a commit:

| Incident | What neatlogs showed | Fix |
|---|---|---|
| Runaway loop | v1 trace `45ff1089efb90629627b392f12963dc0`: encode, verify and resolve repeating, $3.05 on one document | Benefit formula in every rules context, plus a loop guard (`d5592eb`) |
| Validation errors | Validation Error Detector: 2 Haiku 5.5 spans of about 60 s whose structured answer was cut off | Retry with more output room and lower effort when validation fails (`47527e0`) |
| Usage limit exceeded | Usage Limit Exceeded Monitor: 1 span where the provider's spend cap stopped a job | Jobs pause and resume from the last good state instead of failing (`25caeb8`) |

Screenshots: `screens/neatlogs-detections.png`, `screens/neatlogs-validation-errors.png`, `screens/neatlogs-usage-limit.png`, `screens/neatlogs-trace-v1-loop.png`, `screens/neatlogs-trace-v2-showcase.png`.
