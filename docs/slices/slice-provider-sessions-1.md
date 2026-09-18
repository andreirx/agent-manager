# SLICE-PROVIDER-SESSIONS-1 — Continue each role's conversation within one slice

Status: requirements/design independently reviewed; implementation accepted by the manager on 2026-09-18.
See [acceptance](../assurance/SLICE-PROVIDER-SESSIONS-1/manager-acceptance.md); original reviewed bytes are retained there as reviewed-scope.md.
Maturity: PROTOTYPE.

## Source and outcome

The human requests session support for the builder during ONE slice until DONE,
and separately for the reviewer during that same slice until DONE. Both installed
providers support headless continuation: `codex exec resume <id>` and
`claude --print --resume <id>`. This serves VISION's session supervision and reduced
human relay work, and AM-REQ-009's persistent manager-led delivery. It does not
implement the separately discussed message-format correction or ASSURANCE-4/5.

## Requirements and acceptance

- **SPS-L01 — Independent slice-local conversations.** First builder and first
  reviewer calls start separate provider conversations, including when their slice
  authors/reviews requirements or design rather than implementation code. Later calls
  of the same role on that target/slice resume its explicit saved provider ID,
  including after restarting the relay. Never use `--last`/`--continue` discovery.
  Verify two refinement cycles and a new relay invocation: each role reuses only
  its own ID. Two roles using the same provider still remain separate.
- **SPS-L02 — Lifecycle.** IDs belong to the target/slice/role/provider, not a
  global provider instance. DONE ends eligibility for reuse; another slice starts
  fresh. A provider switch cannot pass one provider's ID to another. A model change
  within a provider retains conversation continuity with the explicitly selected
  model; no cache reuse is promised across models. Verify terminal, new-slice,
  changed-provider, and model-override cases. Keep selectors and decision-review
  challenge/rebuttal outside these two conversations.
- **SPS-L03 — Actual headless adapters.** Codex and Claude capture native session
  IDs and issue their installed CLI's explicit resume invocation. Native protocol
  events are logs, not the role's final report. Preserve final-answer extraction,
  cwd, selected model/effort, system instructions, and read-only/write permissions
  on fresh and resumed calls. Verify argv and streamed response parsing using
  hermetic provider fixtures, then bounded live two-turn headless smoke checks.
- **SPS-L04 — Inspectable state and recovery.** Persist the obtained ID in existing
  slice operational state and identify requested/returned sessions in run records.
  Persist an ID returned with a failed/timed-out run before the next retry or
  explicit resume. Do not silently replace an unavailable/mismatched session with
  a new conversation; retain work/evidence and explain the recovery needed. An
  interruption before an ID is captured cannot claim session continuity; the
  manager investigates retained evidence. Verify failure/retry and malformed state.
- **SPS-L05 — Compatibility and boundedness.** Old slice records without session
  fields start fresh provider conversations and subsequently retain returned IDs;
  they do NOT start fresh work. In particular, an interrupted unfinished slice
  retains its selected slice, iteration/evidence/phase recovery, existing tracked
  and untracked edits, reports and findings. No reset, discard, or reselect is
  permitted merely because IDs are absent (human clarification 2026-09-17).
  Verify an unfinished pre-upgrade slice with partial edits and neither role ID:
  the appropriate next calls start their own conversations and later reuse them,
  with the original partial work intact. Unsupported providers
  and unrelated legacy self-host workflows retain their current behavior. No new
  dependency, module, service, cache telemetry, benchmark, context-pruning engine,
  session garbage collector, or automatic model selection. Test old records and
  the existing suite. Keep provider-specific syntax/parsing inside the adapters.

**SPS-P01:** Baseline admission, immutable input delivery/receipts, evidence and
review gates, cycle bounds, and durable record publication remain unchanged.
Resuming does not authorize skipping supplied current inputs or relying on memory
instead of rereading the current candidate. This increment preserves complete
input delivery; it does not implement incremental context packaging.

**SPS-P02:** Read-only review remains read-only; no actual providers, user HOME,
or other targets are reached by automated tests. Live provider checks are separate
manager-owned invocations against an isolated directory and report their evidence.

## Smallest design and allowed changes

Extend the existing provider request/result with a raw optional native session ID;
the existing adapter boundary is already earned by Codex and Claude. Store the two
role bindings alongside existing per-slice operational state, and add session
identity to existing run records. Application routing owns lifecycle; adapters own
CLI details. Use existing functions/files rather than introducing a session service.
The design may use a small local helper for actual builder/reviewer duplication.
Record any introduced abstraction's users, concrete variation and rejected simpler
alternative. No provider-name branching in core domain policy.

Allowed implementation areas: existing provider-runner port; Codex/Claude adapters;
target relay use case and CLI (including dry-run truthfulness); their existing tests
or narrowly named adjacent test files; target relay contract and manager playbook.
Update relevant adapter comments whose existing claims become false. Do not rename
the public `--supervisor` flag or unrelated identifiers. Manager owns this slice,
roadmap pointer, review/acceptance record and operational packet. Do not edit frozen
historical requirements/baselines or role/shared prompts for this increment.

## Verification and implementation baseline

Independent Terra review of these obligations and current source precedes Sol's
implementation. This is a bounded manager-reviewed input baseline under the human's
current request, not a claim of v2/v3 runtime admission. Run the existing target
relay on this repo with explicit SYSTEM.txt and Sol/Terra/high, maximum two cycles
before manager checkpoint. Preserve review and output traces; no automatic commit.

Checks: typecheck, full Jest suite, build, diff whitespace check; focused hermetic
adapter/relay tests covering SPS-L01..05 and SPS-P01..02; dry-run comparison with
the actual dispatch selection; manager-owned Codex and Claude fresh/resumed live
checks. Each result names what was observed versus not run. Cache savings are not
an acceptance criterion. Final acceptance requires the role-session mechanism to
be used by the relay, not merely exposed on adapters.
