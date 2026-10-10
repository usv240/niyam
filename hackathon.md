# Niyam

> **Needs you (team leader), in this order**
> 1. **entire.io**: import both repositories (`usv240/niyam`, `usv240/niyam-rulebook`) as the GitHub org admin, so checkpoint links open for judges. Request Trails access with the form.
> 2. **X**: post 1 and 2 from `docs/SUBMISSION.md` now; then one post every few hours (15% of the score).
> 3. **neatlogs**: take the 3 screenshots listed in `evidence/neatlogs.md`; optionally paste the rubric there into neatlogs evals.
> 4. **cfo.ai**: sign up at cfo.ai/neathacks, cancel the subscription immediately (Settings, Billing), paste the brief in `business/README.md` into Ari, export the plan to `business/business-plan.pdf`.
> 5. **Deploy**: website on Vercel (root `web`), API on the one allowed EC2 instance (`infra/README.md`). The site works without the API; only live features need it.
> 6. **Review PR #2** in the rulebook: Niyam sent it to a human because one change narrows eligibility. Merging it is your human decision.
> 7. **Monday**: record the demo video from `docs/SUBMISSION.md`, then submit by quote-tweeting the official neatlogs post (19:00 to 23:55 IST).

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

- Second run (resumed) completed: encoder passed 45 tests in 1 attempt; verifier 14 of 15 agree; the one disagreement (a woman already getting Rs 1,499 from another scheme) was resolved as verifier_wrong because the GR pays only the difference; confidence 0.85; sent to human review because one change narrows eligibility. Published as https://github.com/usv240/niyam-rulebook/pull/1 with Entire checkpoint 01M4JBMV7QNF5X84R8Z2YTA71Q. Cost $0.86.

### 2026-10-10 15:00 IST: evaluation harness and v1

Done:
- `evals/run_evals.py`: runs the real pipeline in "dry" mode from a fixed rulebook tag (`baseline-2024-06-28`) and scores change recall and precision, values, boundaries, outcome checks on the job branch, the autonomy decision, cost and latency. Every neatlogs trace is tagged with case and version.
- 6 cases: the real amendment; the same amendment rendered as a scan with no text layer; 2 real recent GRs from unrelated departments; 2 synthetic robustness cases, labelled as synthetic inside the PDF (a pure benefit increase, and a procedural order with a hidden prompt-injection paragraph).

v1 results (`evals/results/v1.json`): extraction 100% on every metric, outcome accuracy 97.6%, correct autonomy decision 67%, verifier agreement 95.7%, $0.88 per document, 110 s per document. Prompt injection: ignored, closed for $0.002. Scan: recovered via transcription (`recovery.ocr_fallback`).

What the traces showed (neatlogs):
- The amendment run cost $3.05 and hit the job budget. The trace showed the coordinator ruling three different ways on the same test case (Rs 1,499 from another scheme), and the encoder "fixing" it three times with no change.
- Root cause: the rules context given to the extractor, verifier and coordinator listed parameters and conditions but not the benefit formula ("pay the difference"). The verifier could not predict amounts.
- The synthetic Rs 2,100 case was escalated for the same reason.

v2 fixes: benefit formula and its full source clause in every rules context; a loop guard (a disagreement that survives a fix is escalated, not retried); old rules read from a clean checkout pinned at the job's base commit.

First v2 run: INVALID, my bug. The encoder's file guard compared against `main`, which had moved past the baseline tag, so an untouched file looked edited and every positive job stopped early. Its lower cost was an artefact. Discarded (kept as `evals/results/v2-invalid-guard-bug.json.bak`). Fixed the guard to compare with the worktree's own start commit.

v2 results (`evals/results/v2.json`), same 6 cases: outcome accuracy 100% (from 97.6%), correct autonomy decision 100% (from 67%), verifier agreement 100% (from 95.7%), $0.29 per document (from $0.88), 54 s per document (from 110 s). All positive jobs reached publish with an Entire checkpoint. Caveat: 6 runs is a small sample.

Unresolved: whether the "pay the difference" clause of the original GR still applies after the amendment is a genuine legal question; Niyam flags it for a human.

## Demo

Pending.

## Known limitations and next steps

- One state (Maharashtra), one scheme so far. More schemes and historical orders to come.
- The rules engine models eligibility and amounts only, not required documents or procedure.

## Submission status

Pending. Submission window: Mon 12 Oct 2026, 19:00 to 23:55 IST.
