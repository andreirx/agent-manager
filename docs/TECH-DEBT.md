# Technical Debt Registry

Status: active

This document tracks technical debt, assumptions, and known divergences from the intended architecture.

## Format

Each entry should include:
- **ID**: Sequential identifier (TD-001, TD-002, etc.)
- **Date**: When the debt was incurred
- **What**: What was done
- **Why acceptable**: Why this was acceptable at the time
- **Proper solution**: What the proper implementation would be
- **When to address**: Trigger condition or timeline for resolution
- **Status**: OPEN | RESOLVED | ACCEPTED

---

## Current Entries

### TD-001

- **ID**: TD-001
- **Date**: 2026-06-06
- **What**: Relay composition now pins provider defaults to `claude-opus-4-8` for the builder and `gpt-5.5` with high reasoning effort for the reviewer, but the system does not preflight whether the installed provider CLIs currently expose those exact model selections.
- **Why acceptable**: Provider model selection is already a volatile adapter concern and the current request was a narrow setup update. The model strings are passed through existing provider selection mechanisms without changing core workflow policy.
- **Proper solution**: Add provider capability/model preflight at composition or adapter startup, surface unsupported model/effort combinations as composition errors, and document CLI/provider upgrade requirements.
- **When to address**: Before promoting provider adapters or the relay module beyond PROTOTYPE, or before relying on the relay loop for unattended production work.
- **Status**: OPEN

---

### TD-002

- **ID**: TD-002
- **Date**: 2026-06-07
- **What**: Two parallel relay use cases exist — `relay.ts` (self-host: design/review-design/implement/review-impl over `current.md` documents) and `relay-target.ts` (target-owned: select-slice/implement/review-impl over a git working tree). They share only `relay-shared.ts` (verdict parsing); the phase-stepping, status I/O, and blocked-transition logic are duplicated with different status shapes.
- **Why acceptable**: Both are PROTOTYPE. Unifying prematurely would couple two flows whose phase graphs and state shapes are still moving. Adding `relay-target.ts` as a separate module avoided regressing the working AM-001 self-host path ("do not remove functionality").
- **Proper solution**: Extract a phase-graph strategy abstraction (states, transitions, per-phase actor/mode/permission, status persistence) and express both relays as configurations of it.
- **When to address**: When either relay is promoted to MATURE, or when a third workflow shape appears.
- **Status**: OPEN

---

### TD-003

- **ID**: TD-003
- **Date**: 2026-06-07
- **What**: The supervisor slice-selection packet is parsed from a text `KEY: value` contract (regex for `STATUS`, `SLICE_ID`, `SLICE_DOC`; raw packet passed downstream verbatim). No schema enforcement.
- **Why acceptable**: The prompt mandates the exact structure; only `STATUS` and `SLICE_ID` are needed for control flow, and the raw packet is committed as the system of record. Text parsing keeps both providers uniform.
- **Proper solution**: Use `codex exec --output-schema <file>` (and a Claude equivalent when available) with a committed `schemas/slice-selection.schema.json`, validating the packet at the boundary.
- **When to address**: Before unattended production runs, or first time a malformed packet causes a misselection.
- **Status**: OPEN

---

### TD-004

- **ID**: TD-004
- **Date**: 2026-06-07
- **What**: The target-owned relay writes workflow artifacts and leaves code changes uncommitted in the target working tree, but never commits or branches the target repo. Successive iterations accumulate in one working tree.
- **Why acceptable**: Keeps the human in control of target git history during PROTOTYPE; the reviewer reads uncommitted diffs by design. Committing is a separable concern.
- **Proper solution**: Branch-per-slice, commit-on-approval (and optionally commit `.agent-manager/` metadata) via a VCS port, with clean-tree preconditions and rollback on block.
- **When to address**: Before unattended multi-slice runs or any run where losing/clobbering working-tree state is unacceptable.
- **Status**: OPEN

---

### TD-005

- **ID**: TD-005
- **Date**: 2026-06-07
- **What**: The shared system prompt (`CLAUDE-SYSTEM.txt`) is delivered as a system-prompt layer (Claude `--system-prompt-file` path, which replaces the default prompt; Codex `developer_instructions` content) but is NOT digest-pinned like the role/system prompt assets resolved under `promptRoot`.
- **Why acceptable**: It is an environment-level house-rules layer chosen at the composition root, not a per-slice reproducible asset; pinning it now adds ceremony without a consumer.
- **Proper solution**: Capture the shared prompt's digest in run records / status for reproducibility, and fail loudly if it changes mid-run.
- **When to address**: When reproducibility of past runs becomes a requirement, or before PRODUCTION.
- **Status**: OPEN

---

### TD-006

- **ID**: TD-006
- **Date**: 2026-06-07
- **What**: The read-only reviewer posture for Claude relies on `--permission-mode plan` permitting `git diff` / `git status`. This was confirmed as a valid mode but not yet verified to permit those specific read commands in a live run.
- **Why acceptable**: `plan` mode is designed for investigation without edits; the risk is a stalled review, not a destructive action. The `--dry-run` and `--until select-slice` affordances let the operator catch it before committing to a full loop.
- **Proper solution**: Verify on first live review; if `git` reads are blocked, fall back to an explicit allowlist (`--allowedTools "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)"`) while keeping edits blocked.
- **When to address**: On the first live `review-impl` run against a target.
- **Status**: OPEN

---

### TD-007

- **ID**: TD-007
- **Date**: 2026-06-07
- **What**: The target-owned relay tracks a single active slice via
  `<target>/.agent-manager/current.json`. Resume logic only resumes that one
  pointer. If a fresh selection occurs while an earlier slice is still in-flight
  (e.g. forced via `--reselect`), the earlier slice's `status.json` is left
  mid-phase and is not auto-resumed.
- **Why acceptable**: The intended workflow is one slice at a time; `--slice
  <id>` can resume any specific slice explicitly, so no state is lost, only
  not auto-discovered.
- **Proper solution**: A slice queue/index (or scan of `slices/*/status.json`)
  surfacing all in-flight slices, with explicit selection among them.
- **When to address**: When concurrent/queued slices become a requirement.
- **Status**: OPEN

---

### TD-008

- **ID**: TD-008
- **Date**: 2026-06-07
- **What**: Full event-stream transcript logging is implemented for the Claude
  adapter (`--output-format stream-json --verbose`, raw events stored in the run
  log for human analysis, final text extracted for the artifact). The Codex
  adapter still logs plain text (`codex exec` stdout/stderr), so runs executed
  by the Codex provider have no equivalent structured tool-call transcript.
- **Why acceptable**: Provider roles are swappable, but the current default
  target-owned binding uses Claude as builder and Codex as supervisor/reviewer.
  Claude also exposes a verified `stream-json --verbose` event stream in the
  installed CLI, making it the first tractable transcript implementation. Codex
  runs still produce captured stdout/stderr and authoritative artifacts; they
  only lack a structured tool-call transcript.
- **Proper solution**: Add a Codex experimental JSON event output (or parse
  `codex exec --json`/equivalent) and store it as the log, extracting the final
  message for the artifact — mirroring the Claude adapter.
- **When to address**: When Codex-provider runs need audit-grade tool-call
  transcripts, especially if Codex is bound to the builder role for a target
  workflow.
- **Status**: OPEN

---

### TD-009

- **ID**: TD-009
- **Date**: 2026-06-07
- **What**: Claude transcript capture is **default-on for every Claude run**,
  including the self-host relay and `am-001`. Their logs grew from plain text to
  full stream-json transcripts. Logs are gitignored, but transcript logs are
  larger and accumulate.
- **Why acceptable**: Logs are operational, gitignored, and the richer record is
  generally desirable. The adapter exposes `captureTranscript: false` to revert
  any composition root to text logs.
- **Proper solution**: If self-host log size matters, set `captureTranscript:
  false` in the self-host CLIs, and/or add log rotation/retention.
- **When to address**: If/when self-host log volume becomes a problem.
- **Status**: OPEN

---

## Resolved Entries

(none yet)
