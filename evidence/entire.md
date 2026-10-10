# Evidence: how Niyam uses Entire

## 1. Checkpoints as legal provenance (in the product)

Every rule change the agent makes is a commit in `usv240/niyam-rulebook` with an Entire checkpoint holding the coding agent's full session (task, files read, edits, test runs). The encoder is Claude Code running headless; `.entire/settings.json` sets `"commit_linking": "always"` so the session links to the commit without an interactive prompt (found and fixed in spike S3, see `hackathon.md`).

| Agent change | Commit | Checkpoint |
|---|---|---|
| Ladki Bahin amendment, v2 run (PR #2) | `2d67c14` | `01M4JDH944E4HPRCA4WKDJTFN7` |
| Ladki Bahin amendment, v1 run (PR #1, closed as superseded) | `7c0d9e1` | `01M4JBMV7QNF5X84R8Z2YTA71Q` |

Link format: `https://entire.io/gh/usv240/niyam-rulebook/commit/<full sha>`.

## 2. `entire why`: line-level provenance (in the product)

`scripts/export_site_data.py` runs `entire why <file>:<line> --json` on every rule line the agent wrote. Every "Why?" popover on the website then shows the agent, model, session, checkpoint and commit behind that exact line (screenshot: `entire-why-line-provenance.png`). The API exposes the same live: `GET /api/v1/why?file=parameters/mh/ladki_bahin/age_max.yaml&line=15`.

Example output for the line `value: 65` in `parameters/mh/ladki_bahin/age_max.yaml`:

```
commit_sha     2d67c1492b7a175caf1c6b5a1cb8791c987e81f9
author         Niyam Agent
checkpoint_id  01M4JDH944E4HPRCA4WKDJTFN7
session_id     7e6e8071-f488-4943-8dd3-bdb0919dff07
agent          Claude Code
model          claude-sonnet-5-5
```

Baseline lines (encoded by hand before the agent) correctly report human authorship and no checkpoint.

## 3. Checkpoints on our own build (while building)

Both repositories have Entire enabled for Claude Code. We first attached our main build session with `entire session attach`. That transcript contained API keys pasted into the chat early on; Entire redacted most of them but not one generic 32-character key, so we deleted that checkpoint ref from GitHub within minutes and no longer attach that session. Build checkpoints in this repository now come from Claude Code sessions run inside the repository, which contain only the task at hand. Example: `docs/ARCHITECTURE.md` was written by Claude Code from the source; commit `ffd0ef6`, checkpoint `01M4JGDCK8PN12NTGGAM34612J` (scanned clean with `scripts/scan_checkpoints.py` before pushing).

## 4. Entire Graph (while building)

`entire plugin install graph` and `entire graph init-agents` in both repositories (`.entire/graph-agent.md`, `AGENTS.md`, `CLAUDE.md`). Example: `entire graph search --query "where does the agent decide to merge alone or ask a human"` returned `agent/niyam/confidence.py: decide` as the top result. Honest limit: Graph indexes code, not the YAML rule files, so in-product provenance relies on checkpoints and `entire why`.

## 5. Not used

Entire Brain was not in the plugin index on this machine. Trails needs an access request (requested by the team leader if granted).
