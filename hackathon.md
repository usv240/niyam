# Niyam

## Project

- **Name:** Niyam (Hindi and Marathi for "rule")
- **Purpose:** keep welfare eligibility rules, written as code, in sync with government orders, with a source for every line.
- **Problem:** eligibility is decided by code (portals, field-worker apps, chatbots), but the law lives in PDFs that change often, mostly in Marathi. Nobody keeps the code in sync, and people are wrongly excluded or wrongly paid.

## Team

Team USV: Ujwal Vanjare.

## Stack

Python 3.12, Claude (Sonnet 5.5 for extraction, Opus 5.5 for verification and resolution, a fast model for triage), Claude Code headless as the encoder, a small YAML rules engine in OpenFisca parameter format, SQLite, FastAPI, Next.js, neatlogs (tracing and evals), Entire (checkpoints as legal provenance), cfo.ai (business plan), AWS EC2.

## Build log

Entries record only what actually ran. Planned work and finished work are kept separate.

### 2026-10-10 12:30 IST: start

Done:
- Created public repos `usv240/niyam` and `usv240/niyam-rulebook`. First commits after 12:30 IST.
- Collected the real Ladki Bahin GRs: the original (28 June 2024, code 202406281814018230) and the amendment (3 July 2024, code 202407031335114330), from official sources.
- Read both GRs. The amendment has 8 changes: 6 affect eligibility, 2 are documents and procedure.

Finding: the text layer of these PDFs is damaged by font encoding (the vowel sign ि is extracted as ह, a reph as ण). Exact quote matching would reject real quotes.

### 2026-10-10 13:00 IST: rulebook

Done:
- Rules engine: dated parameters (OpenFisca format), dated conditions (valid_from, valid_until), safe expression evaluator (whitelist, no arbitrary code), validation (`check`), test runner, snapshot.
- Ladki Bahin baseline from the 28 June 2024 GR: 13 conditions and 8 parameters, each with page, clause and Marathi quote.
- Tests run: `python -m niyam_rulebook test`, 25 passed, 0 failed (boundaries at age 20, 21, 60 and 61, income 2,50,000 and 2,50,001, land 5 and 5.5 acres, other scheme 1,500 and 1,501).

### 2026-10-10 13:15 IST: Entire spike (S3)

Question: does Entire capture a headless Claude Code session (the encoder) and link it to a commit?
- First attempt: the commit hung. The Entire git hook was waiting for an interactive "link this commit?" answer.
- Fix: `"commit_linking": "always"` in `.entire/settings.json` (from the Entire docs).
- Result: commit got the trailer `Entire-Checkpoint: 01M4JAR7WV8KRXCRD89KXENS1Z`, and `entire checkpoint explain HEAD` showed the agent's prompt, tool calls and files. Spike passed.

### 2026-10-10 13:30 to 14:00 IST: agent pipeline

Done:
- Pipeline stages: triage, extract, encode, verify, resolve, publish, as a persisted state machine.
- Citation checker: compares quotes on a Devanagari "consonant skeleton" with fuzzy matching, plus an exact check on every number. Tested on the real amendment: 4 real quotes accepted; an invented English quote rejected; a fake quote with 75 instead of 65 was first accepted (score 0.88), so an exact number rule was added, and it is now rejected.
- neatlogs tracing: one trace per job, a span per stage, recovery events as spans.

First end-to-end run (job_20261010_8b7a02ea, real amendment):
- Triage: relevant, correct scheme.
- Extract: 6 changes, all matching a manual reading (age 60 to 65; unmarried women added with one per family; contract workers no longer disqualified; other-scheme limit changed from "more than 1,500" to "1,500 or more"; land condition removed). 2 genuine ambiguities raised. 5 procedural topics correctly skipped. Cost so far: $0.12.
- Encode: failed. On Windows the `claude` command is a `.cmd` shim that Python could not start. Fixed by calling the native executable and passing the prompt on stdin.
- Recovery: added "retry a failed job from its last good state". The job resumed from EXTRACTED without repeating triage or extraction.

Unresolved: none yet recorded.

## Demo

Pending.

## Known limitations and next steps

- One state (Maharashtra), one scheme so far. More schemes and historical orders to come.
- The rules engine models eligibility and amounts only, not required documents or procedure.

## Submission status

Pending. Submission window: Mon 12 Oct 2026, 19:00 to 23:55 IST.
