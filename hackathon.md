# Niyam

> **Needs you (team leader), in this order**
> 0. **Anthropic usage limit reached** (16:15 IST): the API key's spend cap stopped all model calls ("regain access on 2026-11-01"). Total model spend so far: $19.02 across 34 agent jobs, including the Claude Code encoder. Raise the limit in the Anthropic console (Settings, Limits); then resume the paused second-scheme job with `cd agent && python -m niyam run job_20261010_d2c6f4dc`. The website and eligibility API do not need the model and keep working.
> 0b. **Rotate the LegiScan key** pasted in chat earlier (it leaked through a checkpoint for a few minutes; see the 16:00 entry).
> 1. **entire.io**: import both repositories (`usv240/niyam`, `usv240/niyam-rulebook`) as the GitHub org admin, so checkpoint links open for judges. Request Trails access with the form.
> 2. **X**: post 1 and 2 from `docs/SUBMISSION.md` now; then one post every few hours (15% of the score).
> 3. **neatlogs**: take the 3 screenshots listed in `evidence/neatlogs.md`; optionally paste the rubric there into neatlogs evals.
> 4. **cfo.ai**: sign up at cfo.ai/neathacks, cancel the subscription immediately (Settings, Billing), paste the brief in `business/README.md` into Ari, export the plan to `business/business-plan.pdf`.
> 5. **Deploy**: website is LIVE at https://usv240.github.io/niyam/ (GitHub Pages). Optional: API on the one allowed EC2 instance (`infra/README.md`) for live uploads, keys and status.
> 6. **Review PR #2** in the rulebook: Niyam sent it to a human because one change narrows eligibility. Merging it is your human decision.
> 7. **Demo video**: a full draft already exists at `video/out/niyam-demo-draft.mp4` (2:42, captions, real recordings). Improve it by re-voicing and inserting neatlogs and Entire dashboard clips (`docs/SUBMISSION.md`). Then submit by quote-tweeting the official neatlogs post (19:00 to 23:55 IST).

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

### 2026-10-10 15:30 IST: more evidence

- Recovery with failures injected on purpose (`NIYAM_CHAOS=invalid_json,ocr`) on the real amendment: `recovery.json_repair` and `recovery.ocr_fallback` both fired, 100% outcomes, $0.80. `evals/results/extra/chaos.json`.
- Consistency: 9 more v2 runs on the 3 relevant cases, 100% on every metric, $0.61 per relevant order. `extra/repeat.json`.
- New capability, encode a whole scheme: triage proposes an id for a scheme the rulebook lacks; the encoder follows the rulebook's `docs/FORMAT.md`. Test: empty rulebook (tag `empty-rulebook`) plus the founding 28 June 2024 GR. Result: 19 rules extracted, 34 tests written, 16 of 16 verifier cases agree, and 25 of 25 of our hand-written baseline test citizens pass (the agent never saw them). $0.81, 201 s. `extra/from-scratch.json`.
- Acting alone: a labelled synthetic order that only adds people (age 60 to 62, worded unambiguously). 2 of 2 runs decided `auto_merge` at confidence 0.99 (dry run). Added a `READY_TO_MERGE` state so dry runs are not reported as "awaiting human". `extra/autonomy.json`.
- Entire: `entire why` gives line-level provenance (agent, model, session, checkpoint) for every rule line the agent wrote; shown in every Why popover and at `GET /api/v1/why`. Graph installed for coding agents in both repositories.
- Tests and CI: 14 agent tests (citation checker, trust policy, watcher, API privacy); rulebook CI runs on every agent PR (PR #2 passes); web CI runs content lint and build. Browser rules engine matches the Python engine on 400 of 400 random cases.
- Website QA: 11 routes, light and dark, phone and desktop: zero serious or critical axe violations, no horizontal overflow.

### 2026-10-10 16:00 IST: a secret leaked through a checkpoint, and was removed

- Attaching our main build session to `usv240/niyam` with `entire session attach` pushed its transcript as a checkpoint ref. The transcript contained API keys pasted into the chat before hacking began. Entire redacted the Anthropic, neatlogs and other prefixed keys, but not a generic 32-character key for an unrelated service (LegiScan).
- Found by scanning every checkpoint ref for fragments of each pasted secret. Deleted the ref from GitHub and locally; all 23 rulebook checkpoint refs scanned clean (the encoder's sessions never see the chat).
- Action for the team leader: rotate that key (GitHub may keep unreachable objects for a while).
- Lesson: treat agent transcripts as sensitive; scan checkpoint refs before pushing; keep the encoder's sessions separate from human chat.

### 2026-10-10 16:15 IST: second scheme started, paused by the API spend limit

- Found the official Sanjay Gandhi Niradhar Anudan Yojana orders on the Pune district site: the 20 August 2019 consolidated GR (56 pages, five special assistance schemes, code 201908211212469922) and the 6 July 2023 GR raising the monthly assistance (code 202307061137387522). Both resolve on gr.maharashtra.gov.in.
- Started onboarding the scheme from the 2019 GR (job `job_20261010_d2c6f4dc`). The first model call failed: the Anthropic account's usage limit was reached. Added clear handling: a `budget.provider_limit` event and a paused, resumable job instead of a raw error.
- Next, once the limit is raised: resume that job (it opens PR #3 for human review, since it creates a scheme), then run the 2023 increase on top of it in dry mode to see whether a real order earns the act-alone decision.

### 2026-10-10 17:00 IST: cheaper models, chosen by measurement (v3)

Question from the team: why not cheaper models? Measured instead of guessed:
- Added per-stage cost tracking. On the real amendment the coding agent was 56% of the cost, the verifier 24%, extraction 20%, triage under 1%.
- v3a: Haiku 5.5 triage (the old setting was Haiku 4.5, 10x pricier) and Sonnet 5.5 verifier instead of Opus 5.5. 100% on all 8 cases.
- v3b: Haiku 5.5 also for extraction and the coding agent. Rejected: Haiku extraction reported "no changes" for a real age-limit change, the most dangerous possible failure. Also exposed a bug: a cut-off structured answer raised instead of recovering. Fixed (retry with more output room and less thinking) and unit tested.
- v3c: Sonnet 5.5 extraction and verifier, Haiku 5.5 coding agent and triage. 100% on all 8 cases.
- v3 (v3c on the same 6 cases as v1 and v2): $0.13 per document (v2 $0.29, v1 $0.88), 40 s per document, 100% on every metric. Coding agent cost per amendment fell from $0.32 to $0.05. Now the default.

### 2026-10-10 18:00 IST: second real scheme, and a real act-alone decision

- The 2019 Sanjay Gandhi GR was first closed as not relevant: correct by design (the scheme was not covered, and the order does not create a scheme). Coverage should be a human decision, so added `niyam process --onboard <scheme_id>`. Found and fixed a bug on the way: duplicate detection silently dropped the operator's flag.
- Onboarded Sanjay Gandhi Niradhar Anudan Yojana from the real 56-page consolidated GR: 10 rules, 49 tests, 12 of 13 verifier cases agree (the disagreement, Rs 21,001, was settled from the order's "up to Rs 21,000"). PR #3, $1.54, checkpoint 01M4K309R73SB7WZRVFZZ29Q4M.
- Reviewing PR #3 by hand: a new `disabled` field defaulted to `true`, giving everyone the higher income limit. Root cause: my encoder instruction said "a default that keeps people eligible". Fixed the instruction and the rulebook's AGENTS.md; commented on PR #3.
- The real 6 July 2023 increase order, on top of PR #3 in dry mode: 3 amount increases, 16 of 16 agree, confidence 0.98, decision `auto_merge` (state READY_TO_MERGE), $0.20. Reproduced through the eval harness (`extra/real-autonomy.json`). The order also drops a "son under 25" condition that our encoding never modelled; Niyam correctly skipped it.
- Website: scheme picker in the explorer, new checker questions; the browser engine gained Python conditional expressions (`a if c else b`), and matched the Python engine on 400 of 400 random people for the second scheme.

### 2026-10-10 19:00 IST: draft demo video

- `video/make_video.py` builds the demo from the real site: Windows text-to-speech narration (placeholder voice), Playwright recordings timed to each scene's narration (including the public PR #2 on GitHub), captions burned in with ffmpeg. 10 scenes, 2:42. Checked frame by frame.

### 2026-10-10 20:00 IST: website published

- GitHub Pages: https://usv240.github.io/niyam/ (manual workflow `pages.yml`). Verified on the live site: 11 pages return 200, assets load under `/niyam/`, custom 404, and the full accessibility and layout QA (11 routes, light and dark, phone and desktop) passes against the live URL.
- PR #2 reviewed (all 6 changes checked against the GR); PR #3 reviewed and fixed (`disabled` default, 2 new tests). Both await the maintainer's merge: the agent's own reviewer cannot approve its own work.

Unresolved: whether the "pay the difference" clause of the original GR still applies after the amendment is a genuine legal question; Niyam flags it for a human.

## Demo

Pending.

## Known limitations and next steps

- One state (Maharashtra), one scheme so far. More schemes and historical orders to come.
- The rules engine models eligibility and amounts only, not required documents or procedure.

## Submission status

Pending. Submission window: Mon 12 Oct 2026, 19:00 to 23:55 IST.
