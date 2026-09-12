# ASSURANCE-1 — operator acceptance

Status: ACCEPTED, 2026-09-12. Maturity: PROTOTYPE. Scope: stage-1 baseline admission only.
Authority: [human authorization](../ASSURANCE-0/human-authorization.md),
[diagnostic decision](diagnostics-ratification.md), and
[conscious-recovery decision](recovery-ratification.md).

## Delivered outcome

The real target relay can opt into a target-owned, byte-bound baseline using
--baseline. It loads the closed requirement/manifest/review/approval/authority
chain, refuses invalid inputs before provider dispatch, checks selected allocation,
persists the mode and revalidates it on resume and before dependent role calls.
The running CLI exposes admission and its exact identity; genuinely legacy work
keeps its existing routing and labels its limitations. Corrupt active state is the
explicit ratified exception: refuse unsafe implicit dispatch, then let the manager
investigate and recover consciously. No automatic repair service was added.

The support is used, not dormant: pure assurance policy is called by real dispatch
and no-write CLI admission; new-target scaffold output marks local-only state.
This serves the VISION's inspectable, file-replayable delivery without claiming the
whole requirements methodology has been implemented.

## Review, verification and scope

[Review 7](review-7.json) approves the implementation including the manager's
resolved-mode and non-resumable-phase corrections. [Review 8](review-8.json) approves
the final test-only correction. Manager SHA-256 comparison confirms all non-test
product bytes were unchanged between those reviews. Both are separate Codex CLI
invocations by Terra over Sol's work, same-provider review. The
[run provenance](run-provenance.json) preserves all nine implementation cycles
and their actual verdicts; earlier green verdicts are not rewritten as acceptance.

Manager ran typecheck, the full 82-test suite, and build in BOTH the working
checkout and a disposable clean candidate copy with no .agent-manager, dist, or
logs initially present; only the existing dependency installation was symlinked.
All six commands and git diff --check exited zero. The seven deliverable hashes
were unchanged throughout; [verification](verification.json) binds that exact
candidate to commands/results. The test file is the sole suite found by deterministic
source-file enumeration and exposed by package.json, not a claim of exhaustive
possible behavior. No real providers or operator target state were used by tests.

Reviewer sandbox could typecheck but could not create Jest's temporary cache;
write-requiring results are builder- and manager-executed, not reviewer-executed.
Lint was not run: it is not in the ratified gate and the configured ESLint executable
is absent. No dependency was installed to extend scope.

## Acceptance / preservation trace

| Check | Evidence and allocated contribution |
|---|---|
| A1-C01 | Pure record/identity/source/review/approval cases in relay-target.test.ts; AM-REQ-001-L01/L02/L04/L06 and AM-REQ-004-L01 |
| A1-C02 | Contained raw-byte read, traversal/symlink refusal, distinct read failures; AM-REQ-001-L06. Denied-read uses the declared injected seam, not a claim of induced host permission failure |
| A1-C03 | Stub counts for invalid closure, selected allocation, byte drift, persisted resume, conflicts, malformed/non-resumable state, and preserved-work recovery; stage-1 portion of AM-REQ-004-L02/L06 |
| A1-C04 | Fresh built CLI over disposable targets and real copied INPUT-3; exact admission identity, no-write dry-run, truthful live resolved-mode labels and legacy routing oracle |
| A1-C05 | Manager clean-copy and working-tree gates above; explicit bootstrap/vertical/non-migration contributions to AM-REQ-008-L01/L02/L04 |
| P-A1-01 | Existing legacy/decision-review tests plus predecessor-captured command tokens; only target paths and prompt-preview character count normalized. SYSTEM changed by separately reviewed INPUT-3, not silently by implementation. Corrupt-state exception is explicitly ratified |
| P-A1-02/P-A1-03 | Existing --supervisor semantics and provider argv stay unchanged; filesystem mechanism is the only adapter delta, policy imports no provider/filesystem implementation |
| P-A1-04 | Existing decision-review trigger/challenge/rebuttal fixtures retained; admission is added before dependent calls, not a new phase engine |
| P-A1-05 | Optional shared-prompt warn-and-continue legacy branch preserved by source inspection; no claim of stage-2 mandatory instruction snapshots |
| P-A1-06/P-A1-07 | No product commit/deploy/install or target migration; isolated tests verify new scaffold and byte-preserved existing scaffold |

The final manager probes additionally use a POSITIVE cycle cap to demonstrate
selection-only persisted state returns a refusal rather than spinning, and show
flag-omitted admitted terminal resume without a legacy claim. See
[probe results](manager-final-probes.json). The terminal CLI probe printed unchanged
default role configuration but dispatched no provider; actual build/review models
are the Sol/Terra assignments in run-provenance.json.

## Manager findings closed

- Unrelated metadata errors suppressed valid source diagnostics: paired regression
  and retained source candidates now report both; ambiguous JSON still stops.
- Runtime strings were accepted as domain phases/actors: closed-value checks and
  non-negative integral iteration checks now refuse invalid persisted state.
- M-A1-02: live CLI guessed legacy from flag absence; labeling now follows resolved mode.
- M-A1-03: selection-only active state could spin without transitioning; it is refused.
- M-A1-04: a test depended on an ignored local capture; its small independent
  predecessor-derived literal now lives in the test. Manager clean-copy execution
  proves that the suite no longer needs that operator artifact.

## Architecture and limits

- Pure assurance policy — users: initial admission, resume and pre-role validation;
  variation: the ratified closed eligibility outcomes; rejected: duplicated policy
  in filesystem/dispatch branches, which would make policy tests depend on I/O.
- Shared admission operation — users: live relay and assured dry-run; variation:
  effectful dispatch versus read-only inspection; rejected: a second CLI validator.
- Contained-file port operation — user: closure loader; boundary: Node read/realpath/
  containment errors; rejected: importing filesystem mechanism into pure policy.
- Closed phase/actor value maps — user: persisted-state guard; variation: existing
  domain-union additions, compiler-checked by Record keys; rejected: string-only
  narrowing that admitted invalid states. No new workflow variants were introduced.

No new dependency, service, registry, generic validation framework, or recovery
subsystem was introduced. Raw snapshots cross the existing filesystem boundary.
The candidate scope is exactly the seven paths in verification.json; durable
operator acceptance records and roadmap closeout are separately manager-authored.

This does NOT claim structured per-ID review, identical delivered role context,
candidate/evidence acceptance gates, typed runtime recovery, final-approval commands,
or full assurance. Those remain in ASSURANCE-2–5. Individual H files retain their
original authoring-stage evidence/status prose as frozen inputs; this external
record establishes current stage-1 evidence without rewriting an approved subject.
Acceptance is an operator decision under standing authority, not automated release.
No install, deployment, global-default change, or other-project migration occurred.
