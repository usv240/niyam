# Niyam architecture guide

This guide is for a new contributor to the agent in `agent/niyam`. It describes what the code does today. When the code and this guide disagree, the code is right, so please fix the guide.

## 1. Overview

Niyam keeps welfare eligibility rules, written as code in a separate rulebook repository, in sync with government orders (PDFs). One document becomes one job. A job moves through a persisted state machine, and the result is a git branch in the rulebook repo, usually with a pull request.

There are two repositories:

- This repo (`niyam`): the agent, the public API, the MCP server and the web app.
- The rulebook repo (`niyam-rulebook`, path from `NIYAM_RULEBOOK_PATH`): schemes, parameters, tests, sources, glossary and the `niyam_rulebook` Python package that evaluates rules. The agent only talks to it through git and through `python -m niyam_rulebook ...` subprocesses (`rulebook.py`).

```
 official GR portal            user upload / URL         CLI (niyam process)
        |                            |                          |
  sources/watcher.py          api.py POST /documents            |
        |                            |                          |
        +------------+---------------+--------------------------+
                     v
        orchestrator.add_document()  -> documents table (SQLite, dedup by sha256)
        orchestrator.create_job()    -> jobs table, state NEW
                     |
                     v
        orchestrator.Run.execute()   (one neatlogs trace per run)
                     |
   NEW --triage--> TRIAGED --extract--> EXTRACTED --encode--> ENCODED --verify--> VERIFIED --publish--> final state
    |                 |                    ^                                |
    |                 |                    |                                v
    |                 |                    +------ encode (fix) <------ RESOLVING --resolve (coordinator)
    v                 v
 CLOSED_IRRELEVANT  NO_CHANGES

 Models:   triage = fast (Haiku)      extract, encode = main (Sonnet)
           verify, resolve = verify model (Opus)
 Rulebook: base checkout (old rules, read only)   job worktree (branch niyam/<job_id>, edited by the encoder)
 Evidence: neatlogs spans and trace id   Entire checkpoint trailer on the commit   job_events timeline

 Readers of the result:
   api.py (FastAPI, /api/v1)  <---- mcp_server.py (MCP tools call the API over HTTP)
```

Module map:

| File | Role |
| --- | --- |
| `orchestrator.py` | Intake, job creation, the state machine, publish step wiring |
| `stages/triage.py`, `extract.py`, `encode.py`, `verify.py`, `resolve.py`, `publish.py` | One file per stage |
| `llm.py` | The only place that calls Claude API models; structured output, repair, fallback, cost, neatlogs spans |
| `pdftext.py` | PDF text, quote checking, GR code detection |
| `confidence.py` | Confidence score and the autonomy policy |
| `rulebook.py` | Git worktrees, rules rendered for prompts, rulebook tests and simulation |
| `models.py` | Pydantic contracts between stages |
| `config.py` | Settings from environment variables and `.env` |
| `db.py`, `keys.py` | SQLite access, API keys and rate limit tiers |
| `api.py`, `mcp_server.py`, `serve.py`, `cli.py` | Entry points |
| `sources/watcher.py` | Polls the Maharashtra GR portal |

## 2. The state machine

Defined in `orchestrator.py`. `Run._loop()` repeats until the state is in `TERMINAL`. Each step handler calls `Run.save(state, ...)`, which writes the new state, the stage outputs, cost and token counts to the `jobs` row and adds a `state` event to `job_events`. Because state is saved before the next step starts, a crash resumes from the last completed step.

Working states (handlers in `_loop`):

| State | Meaning | Handler | Next state |
| --- | --- | --- | --- |
| `NEW` | Job created, nothing done | `_triage` | `TRIAGED` or `CLOSED_IRRELEVANT` |
| `TRIAGED` | Document matters, schemes known | `_extract` | `EXTRACTED` or `NO_CHANGES` |
| `EXTRACTED` | Validated change set saved | `_encode` | `ENCODED` or `NEEDS_HUMAN` |
| `ENCODED` | Rulebook edited, its own tests pass | `_verify` | `RESOLVING` or `VERIFIED` |
| `RESOLVING` | Verifier disagrees on some cases | `_resolve` | `EXTRACTED` (then encode again) or `VERIFIED` |
| `VERIFIED` | Verification finished | `_publish` | a final state below |

Terminal states (`TERMINAL`):

| State | How it is reached |
| --- | --- |
| `CLOSED_IRRELEVANT` | Triage said not relevant, or found no known scheme |
| `NO_CHANGES` | Extraction produced no changes |
| `AUTO_MERGED` | Policy said `auto_merge` and the merge actually happened |
| `READY_TO_MERGE` | Policy said `auto_merge` but this run could not merge (publish mode `dry`, or a failed merge) |
| `AWAITING_HUMAN` | Decision `human_review`; a pull request is open for review |
| `NEEDS_HUMAN` | Decision `needs_human`, or the encoder could not get tests green, or the budget was exceeded |
| `FAILED` | An exception escaped a stage; the error and a traceback are stored |

Other behavior to know:

- **Loop back from resolve.** `_resolve` saves `EXTRACTED` and calls `_encode` directly, which ends in `ENCODED`, so the loop runs `_verify` again. The verifier plan is stored in `state_data["verifier_plan"]` and reused, so a fix is judged by the same test cases.
- **Round limit.** `_verify` goes to `RESOLVING` only if there are disagreements and `encode.rounds <= settings.max_encode_attempts` (3). Otherwise it goes to `VERIFIED` with the disagreements recorded.
- **Budget.** Before every step, if the job cost is above `NIYAM_JOB_BUDGET_USD` (default 3.0), the job goes to `NEEDS_HUMAN`.
- **Resume and retry.** `run_job()` on a `FAILED` job finds the last non-terminal state from the `state` events (`last_good_state`), resets the job to it and runs again. A job started in a non-`NEW` state logs `orchestrator.resume`.
- **Extra job state.** `state_data` (the `resolution_json` column) holds `base_sha`, `rejected_quotes`, `encode`, `verifier_plan`, `resolutions`, `fixes_tried`, `unresolved`, `publish`, `reasons` and, on failure, `traceback`.
- **Unknown state.** The handler lookup in `_loop` is a dict. A state with no handler raises `KeyError`, which `execute()` turns into `FAILED`.

## 3. Stages

Every model call goes through `llm.parse()` (section 3.8). Stage failures that raise are caught in `Run.execute()`, which logs `job.failed` and saves `FAILED`.

### 3.1 Watch (stage 0, `sources/watcher.py`)

- **Input:** the public list page of the Maharashtra GR portal.
- **Output:** a document row and a `NEW` job per new relevant order (`add_document`, `create_job`), then `orchestrator.run_job` for each, one after another.
- **Model:** none.
- **Behavior:** keeps only the latest `limit` rows, skips codes already in `documents`, and skips departments not in `WATCHED_DEPARTMENTS`. Waits two seconds between PDF requests and sends a User-Agent with a contact address. It never uses the search form and never works around a CAPTCHA.
- **Failure handling:** `_get` retries three times with exponential backoff. If the list page is unreachable the source status becomes `DEGRADED` and the cycle returns with no jobs. If the page mentions a CAPTCHA and no rows parse, the status becomes `BLOCKED`. A PDF that fails or is not a PDF is skipped. Status is stored in `sources_status.json` and shown by `GET /api/v1/status`. The chaos flag `source_timeout` injects one timeout.

### 3.2 Triage (stage 1, `stages/triage.py`)

- **Input:** the first three pages of text (up to 12000 characters), the covered scheme list from the rulebook base checkout, and a title hint. If the first three pages have fewer than 300 characters in total, the PDF itself is attached instead.
- **Output:** `Triage` (relevant, scheme ids, document kind, date, reason, optional `new_scheme_id`).
- **Model:** `settings.model_fast` (default `claude-haiku-5-5`).
- **Post-processing in the orchestrator:** scheme ids not in the rulebook are dropped. If the document is a relevant `new_scheme` with an id matching `mh\.[a-z0-9_]{3,40}` that is not known yet, that id is added and a `triage.new_scheme` event is logged.
- **Outcome:** not relevant, or no scheme ids, goes to `CLOSED_IRRELEVANT`. Otherwise `TRIAGED`.
- **Failure handling:** the shared `llm.parse` repair and fallback. Anything else raises and the job becomes `FAILED`.

### 3.3 Extract (stage 2, `stages/extract.py`)

- **Input:** the PDF, the current rules of each scheme as of the document date (from the base checkout), the person fields, and the glossary.
- **Output:** a `ChangeSet`: changes (each with an exact quote, page and clause), ambiguities, and skipped procedural topics. Also returns the page texts and the list of rejected quotes.
- **Model:** `settings.model` (default `claude-sonnet-5-5`), effort `high`.
- **Citation check:** every quote is matched against the PDF text with `pdftext.find_quote`. A wrong page that is off by one is corrected. If quotes are not found, the model gets the failures and one retry. Changes whose quotes still fail are dropped. The remaining rejected quotes are stored and lower confidence later.
- **Failure handling:** if more than half of the pages have under 80 characters of text, or the chaos flag `ocr` is set, `transcribe()` asks Claude to transcribe the PDF and the transcript is used for quote checking (`recovery.ocr_fallback` event). If there are no changes the job ends in `NO_CHANGES`.

### 3.4 Encode (stage 4, `stages/encode.py`)

The stage numbers in the module docstrings follow the original design, so there is no stage 3 file.

- **Input:** the change set, the PDF, document metadata, and a job worktree created by `rulebook.create_worktree` on branch `niyam/<job_id>` from the pinned base commit. On a fix round it also gets the coordinator's fix instruction and the earlier Claude Code session id.
- **Work done without a model:** `register_source` copies the PDF into `sources/mh/` and adds the entry to `sources/index.yaml`. The change set is written to `.niyam/changeset.json`.
- **Output:** edits in the worktree (schemes, parameters, tests, sources, glossary, schema, changelog), plus a result with attempts, cost, test counts, changed files and the Claude Code session id.
- **Model:** the Claude Code CLI runs headless (`claude -p`) in the worktree with `--model settings.model`, `--permission-mode acceptEdits`, `--max-turns 60`, a 25 minute timeout, and `--strict-mcp-config`. Its tools are Read, Edit, Write, Glob, Grep and four `python -m niyam_rulebook` subcommands (`test`, `check`, `rules`, `simulate`). The prompt (`TASK`) is built from the change set, not from the raw document text.
- **Failure handling:** up to `max_encode_attempts` (3) attempts per call. After each attempt the orchestrator-side code runs the rulebook tests itself (`rulebook.run_tests`). If tests fail, the failures are sent back in the next prompt. If files outside the allowed folders changed (`rulebook.ALLOWED_PREFIXES`), they are reverted with `git checkout` and the encoder is told. If tests still fail after the last attempt, the job goes to `NEEDS_HUMAN`. A missing Claude Code result raises and the job becomes `FAILED`.
- **Limit to be aware of:** the encoder is not given the document text in its prompt, but the source PDF is copied into the worktree and the Read tool is allowed, so the separation is by prompt design, not a hard barrier.

### 3.5 Verify (stage 5, `stages/verify.py`)

- **Input for planning:** the PDF and the rules as they were before the document (base checkout). It does not see the change set, the diff or the encoder's reasoning.
- **Output:** a `VerifierPlan` of 10 to 16 test citizens with expected eligibility and optionally an expected monthly amount. `check()` runs them against the worktree with `rulebook.simulate_batch` and returns a verdict dict: counts of valid, agreeing, disagreeing and invalid cases, `agreement_rate`, a verdict (`agree`, `disagree` or `inconclusive`), and the disagreement details.
- **Model:** `settings.model_verify` (default `claude-opus-5-5`), effort `high`.
- **Failure handling:** a case whose person is not a valid JSON object, or that the rulebook cannot simulate, is marked `invalid` and left out of the agreement rate. The plan is saved in `state_data` so a retry does not call the model again. If there are disagreements and rounds remain, the state becomes `RESOLVING`.

### 3.6 Resolve (stage 6, `stages/resolve.py`)

- **Input:** the PDF, the change set, the new rules from the worktree, the disagreeing cases and the glossary.
- **Output:** one decision per disagreeing case: `encoder_wrong` (with a fix instruction), `verifier_wrong`, or `ambiguous` (with a plain English question). Optional glossary entries.
- **Model:** `settings.model_verify`, effort `high`.
- **What the orchestrator does with it:** glossary entries are appended to `glossary/maharashtra.md` in the worktree if their heading is not already present (the file must exist). `encoder_wrong` items become one combined fix instruction for `_encode`.
- **Loop guard:** a case that was already sent back as a fix and still disagrees is not sent back again. It is counted as unresolved and escalated.
- **Outcome:** with fixes, the job re-encodes and then re-verifies. Without fixes it goes to `VERIFIED`. `state_data["unresolved"]` counts `ambiguous` and repeated cases.

### 3.7 Publish (stage 7, `stages/publish.py`, wired in `Run._publish`)

- **Input:** change set, verdict, resolutions, confidence and decision (section 6), plus the trace id.
- **Steps:** `encode.commit` makes the commit with `Niyam-Job`, `Niyam-Confidence`, `Niyam-Decision` and `Niyam-Trace` lines in the message and reads back an `Entire-Checkpoint:` trailer if present. `publish.pr_body` builds the pull request text. `publish.run` then acts by `settings.publish_mode`:
  - `dry`: writes `.niyam/pr_body.md`, never merges (used by evaluations).
  - `local`: merges into the local rulebook main with `--no-ff` only if the decision is `auto_merge`.
  - `github` (default): pushes the branch, creates a label, opens a pull request with `gh`, and merges it only for `auto_merge`.
- **Final state:** `AUTO_MERGED` if a merge happened, else `READY_TO_MERGE` for `auto_merge`, `NEEDS_HUMAN` for `needs_human`, `AWAITING_HUMAN` for `human_review`.
- **Failure handling:** a failed `git push` or `gh pr create` raises and the job becomes `FAILED`; retrying resumes at `VERIFIED`, which is safe because the commit step tolerates "nothing to commit".

### 3.8 The shared model layer (`llm.py`)

- One Anthropic client with `max_retries=3` and a 600 second timeout, wrapped by neatlogs when tracing is on.
- `parse()` uses `client.messages.parse` with a Pydantic output type. If the output is missing or invalid, it replies once with a repair request. On rate limit, overload (529), 5xx or connection errors, it moves to `settings.model_fallback`. A refusal raises `StageOutputError`. After repair and fallback fail it raises `StageOutputError`.
- Each call adds cost and tokens to the `Usage` held in a context variable that the orchestrator sets per run. Prices come from `config.PRICES`.
- `pdf_block` and `image_block` build the content blocks for attaching documents.
- Chaos flags (`NIYAM_CHAOS`: `invalid_json`, `ocr`, `source_timeout`) inject one failure per run so recovery paths can be exercised.

### 3.9 PDF text (`pdftext.py`)

- `read_pdf` extracts text per page with pypdf and a SHA-256 of the file.
- Marathi PDFs often have broken text layers, so `find_quote` compares "skeletons": consonants and ASCII letters and digits only, with the most commonly corrupted letters removed. Matching is fuzzy (threshold 0.78) with one hard rule: every digit run in the quote must appear on the page, so 75 can never match 65. A neighboring page is accepted because table rows cross page breaks.
- `find_gr_code` finds the 18 digit government resolution code.

### 3.10 Rulebook access (`rulebook.py`)

- `base_checkout(ref)` is a detached, read-only worktree at the commit before the document. Extraction, verification and triage read the old rules from here, so a merge to main during a run cannot change what they see. Its commit is pinned in `state_data["base_sha"]`.
- `create_worktree(job_id)` is the job's own branch and directory, reused after a crash.
- `rules_for_prompt` renders parameters, conditions and the benefit formula as text. For an unknown scheme it returns instructions for creating one.
- All calls into the rulebook run as subprocesses against a specific checkout, so one job cannot touch another job's files.

## 4. Where neatlogs spans are created

Tracing is on only if `NEATLOGS_API_KEY` is set and the `neatlogs` import works. Otherwise `llm.span()` is a no-op and nothing else changes. All span creation goes through `llm.span()`:

| Span | Kind | Created in | Attributes |
| --- | --- | --- | --- |
| `niyam.job <title>` | WORKFLOW | `Run.execute` | `niyam.job_id`, `document_code`, `eval_case`, `version`, `chaos`, `byod`, `resumed_from`, then `final_state`, `cost_usd` |
| `stage.triage` | AGENT | `_triage` | `relevant`, `schemes` |
| `stage.extract` | AGENT | `_extract` | `changes`, `ambiguities`, `rejected_quotes` |
| `stage.extract.llm` | AGENT | `extract.run`, around the main model call | none |
| `stage.encode` | AGENT | `_encode` | `encoder_attempts`, `tests_passed`, `encoder_cost_usd` |
| `stage.verify` | AGENT | `_verify` | `cases_agree`, `cases_disagree` |
| `stage.resolve` | AGENT | `_resolve` | `decisions` |
| `stage.publish` | AGENT | `_publish` | `confidence`, `decision`, `pr_url` |
| `recovery.model_fallback`, `recovery.json_repair` | CHAIN | `llm._record_event` | `niyam.recovery` |

Details:

- Each model call made through the wrapped client is recorded by neatlogs itself and appears under the span that is open at the time.
- The trace id is read in `Run.execute` with `llm.current_trace_id()` and saved on the job once. It then appears in the commit message (`Niyam-Trace`), the pull request body and the API job record.
- The encoder runs as a separate Claude Code process. Its model calls are not inside the Niyam trace; only its attempts, test count and cost are attached to `stage.encode`.
- The watcher, intake and API do not create spans.
- `llm.flush()` runs at the end of every run, and `llm.shutdown()` at CLI exit.

## 5. How Entire checkpoints are produced

The Niyam code does not call Entire to write a checkpoint. It relies on Entire being installed in the rulebook repo:

1. The encoder runs as Claude Code inside the job worktree (`encode.run_claude`). `PATH` is extended with `~/.local/bin` so the Entire binary is found.
2. When `encode.commit` runs `git commit` in that worktree, Entire's git hook links the recorded agent session to the commit and adds an `Entire-Checkpoint: <id>` trailer to the message.
3. `commit()` reads that trailer back with `git log -1 --format=%B`. The id is saved as `checkpoint_id` on the job and shown in the pull request body with a link of the form `https://entire.io/gh/<rulebook repo>/commit/<sha>`.
4. If no trailer is found, the job still publishes and the event says "no Entire checkpoint found".
5. `GET /api/v1/why?file=...&line=...` runs `entire why <file>:<line> --json` in the rulebook checkout and returns the commit, checkpoint, session, agent and model behind one line. Only files under `schemes/`, `parameters/`, `tests/`, `glossary/` and `schema/` with a `.yaml` or `.yml` name are accepted.
6. `/schemes/{id}/rules` and `/history` attach `provenance` (job, pull request, commit, checkpoint) to each source by matching the document code.

Separately, this repo has its own Entire graph setup for coding agents; see `CLAUDE.md` and `.entire/graph-agent.md`. That is unrelated to the runtime flow above.

## 6. The trust policy (`confidence.py`)

Confidence is computed in `score()`:

```
extraction = mean(change.confidence) * max(0, 1 - 0.15 * rejected_quotes)
agreement  = verdict.agreement_rate          (0 if there is no verdict)
safety     = min(TYPE_SAFETY[change_type] over all changes)
confidence = 0.35 * extraction + 0.35 * agreement + 0.15 * (1 if encoder tests pass else 0) + 0.15 * safety
```

`TYPE_SAFETY` ranges from 1.0 (`parameter_update`) down to 0.3 (`scheme_created`, `scheme_closed`). Unknown types get 0.4.

`decide()` first collects reasons. Each of these adds a reason:

- the job is bring-your-own-document (never merged automatically);
- any change has `affects` of `narrows` or `mixed`;
- any change type is structural (`condition_added`, `condition_removed`, `condition_changed`, `definition_changed`, `scheme_created`, `scheme_closed`);
- there are extraction ambiguities;
- there are unresolved encoder or verifier disagreements;
- the verifier still disagrees on some cases;
- confidence is below 0.90.

Then the decision:

1. `needs_human` if there are unresolved disagreements, or confidence is below 0.70, or there are ambiguities and confidence is below 0.80.
2. Otherwise `human_review` if there is any reason at all.
3. Otherwise `auto_merge`.

So Niyam merges on its own only when no one is removed from a scheme, only numbers or dates changed, nothing is ambiguous, every verifier case agrees, and confidence is at least 0.90. Note that the verdict is not recomputed after a resolve round, so any disagreement the verifier ever had keeps the job at `human_review` or stricter, even if the coordinator ruled the verifier wrong.

Two layers sit outside the score: the citation check (a change with an unverifiable quote is dropped before it reaches the encoder) and the folder allowlist for the encoder.

## 7. The public API (`api.py`)

Run with `uvicorn niyam.api:app` (see also `serve.py`). All routes are under `/api/v1`. Errors are JSON of the form `{"error": {"code", "message", "docs_url"}}`. CORS is open.

| Route | Purpose |
| --- | --- |
| `GET /health` | Liveness and rulebook version (short git sha) |
| `GET /schemes` | Covered schemes with last change date |
| `GET /schemes/{id}/rules?at=` | Rules on a date, each with its source and provenance |
| `GET /schemes/{id}/history` | Parameter and condition changes over time |
| `POST /eligibility` | Evaluate a person; rejects values that look like Aadhaar or phone numbers |
| `GET /jobs`, `GET /jobs/{id}` | Job records (evaluation jobs hidden unless requested) with events |
| `GET /jobs/{id}/events?after=` | Server-sent events for a job; ends with a `done` event at a terminal state |
| `GET /changes` | Recent processed changes with decision and checkpoint link |
| `POST /documents` | Bring your own document: PDF upload or https URL |
| `POST /keys`, `GET /usage` | Create a key (5 per hour per IP) and see usage |
| `GET /status` | Source status, running job count, last job, whether tracing is on |
| `GET /evals` | Result files from `evals/results` |
| `GET /why` | Entire line provenance (section 5) |

Design points:

- **Rulebook in process.** The `_RB` class loads the `niyam_rulebook` engine from the main checkout and reloads it when the checkout's HEAD changes. Read routes never call a model.
- **Rate limits.** Middleware applies to `/api/v1` paths except the events stream. Limits come from `keys.TIERS`: `anonymous` 30 requests per minute and 3 document runs per day, `open` 120 and 20, `navigator` 600 and 200. Keys look like `niyam_live_...` and are stored as keyed hashes. Anonymous callers are identified by IP address.
- **Bring your own document.** Needs the `run` scope if a key is used. Only https URLs, PDFs up to 10 MB and 30 pages. The document is stored without dedup and the job is created with `is_byod=True`, so the policy never merges it. The job runs in a daemon thread inside the API process (`_start_job_thread`), so a restart of the API interrupts it; it can be resumed with `niyam run <job_id>`.
- **Job view.** `_job_public` is the single place that turns a job row into the public shape, so new fields must be added there.

## 8. The MCP server (`mcp_server.py`)

A thin layer over the public API, started with `niyam-mcp`. It reads `NIYAM_API_BASE` (default `http://localhost:8000`) and optional `NIYAM_API_KEY`. It does not touch the database or the rulebook directly. API errors are returned as an `error` object instead of raising. Tools:

| Tool | API call |
| --- | --- |
| `check_eligibility` | `POST /eligibility` (core facts as arguments, anything else as a JSON string in `extra_facts`) |
| `explain_rules` | `GET /schemes/{id}/rules` |
| `rule_history` | `GET /schemes/{id}/history` |
| `list_schemes` | `GET /schemes` |
| `recent_changes` | `GET /changes` |
| `submit_document` | `POST /documents` with a URL |

The server instructions tell the assistant to show the source clause with each rule and to say the department makes the final decision. `explain_rules` and `rule_history` default to `mh.ladki_bahin`.

## 9. How to extend

### Add a new scheme

Most of this needs no agent code change, because scheme ids come from the rulebook files.

1. **Preferred path, from a founding order.** Run `niyam process <pdf>` on the order that creates the scheme. Triage proposes an id like `mh.ladki_bahin` (lowercase letters, digits and underscores, 3 to 40 characters after `mh.`), extraction reports one `scheme_created` change plus `condition_added`, `parameter_update` (with a null `old_value`) and `benefit_changed` changes, and the encoder creates the files described in the rulebook repo's `docs/FORMAT.md`. A new scheme is a structural change, so it always goes to `human_review` or stricter.
2. **By hand.** In the rulebook repo add `schemes/<name>.yaml` with `id`, `name`, `name_mr`, `summary` and the conditions, parameter files under `parameters/`, test citizens under `tests/`, and a source entry in `sources/index.yaml`. `rulebook.scheme_ids` and `schemes_overview` read every `schemes/**/*.yaml`, so triage and the API pick it up on the next run, and the API reloads when main moves.
3. **New person facts.** If the scheme needs a fact not in `schema/person.yaml`, add the field there with a default that keeps existing results unchanged. `POST /eligibility` accepts extra fields (the `Person` model allows extras). Add the field to the typed `Person` model and to `mcp_server.check_eligibility` only if you want it documented.
4. **New source of orders.** If the order comes from another department, add its name to `WATCHED_DEPARTMENTS` in `sources/watcher.py`. Another portal needs its own poll function modeled on `poll_maharashtra`.
5. Run the rulebook's own tests (`python -m niyam_rulebook test`) before relying on the scheme.

### Add a new state

1. Add a handler method on `Run` that does its work inside a `llm.span("stage.<name>", kind="AGENT")`, reads inputs from the job row or `state_data`, and ends with `self.save("<NEXT_STATE>", ...)`.
2. Register the state name and handler in the dict inside `Run._loop`. A missing entry causes a `KeyError` and a `FAILED` job.
3. If the state is final, add it to `TERMINAL`. This also controls the event stream's `done` event, the running job count in `/status`, and what `last_good_state` skips.
4. Change the neighboring handlers so that they save the new state instead of their old next state. Keep the rule that state is saved before the next step starts, and make the handler safe to run twice, because a retry re-enters it.
5. If the decision changes the final outcome, update the mapping at the end of `_publish` and `confidence.decide`.
6. Put new per-job data in `state_data` (stored in `resolution_json`) or, if it needs a column, update the schema in `db.py` and `Run.save`. Expose anything the UI needs in `api._job_public`.
7. Update the state diagram in the `orchestrator.py` docstring and in this guide. There is no database constraint on state names, so the code is the only place that checks them.

### Add a new stage that calls a model

Put the file in `stages/`, call `llm.parse` with a Pydantic type added to `models.py`, choose the model through a `Settings` field, and pass a `stage` label so repair and fallback events name it. Do not create an Anthropic client elsewhere: `llm.py` is what adds cost tracking, tracing and fallback.
