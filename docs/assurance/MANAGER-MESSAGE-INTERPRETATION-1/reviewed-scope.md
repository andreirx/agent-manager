# MANAGER-MESSAGE-INTERPRETATION-1 — Meaning belongs to agents; records to runtime

Status: scope authorized by the human on 2026-09-17; design review pending.
Maturity: PROTOTYPE. Prerequisite: SLICE-PROVIDER-SESSIONS-1.

## Source and outcome

The human chose: **Manager interprets messages; runtime constructs records**.
Interpretation remains an agent responsibility; uncertainty must stay explicit.
TD-020 records why: useful builder/reviewer output was discarded for JSON field
names, envelopes, empty arrays, and copied runtime identities, causing repeated
build/review cycles. VISION assigns transport/state to the runtime and judgment
to agents. AM-REQ-009 identifies the human-started session as the manager; this
increment does not create another interpreter agent or service.

## Required behavior

- **MMI-L01 — Retain meaning-bearing output.** On the target relay's existing
  builder/reviewer result paths, retain the original provider text and actual run
  identity before interpreting it. Prose, alternate field names, or an otherwise
  unusable provider-result shape must not discard the output, consume another
  implementation cycle, rerun the builder, or imply a code defect. Already usable
  structured results may continue through the existing path; no new alias/parser
  catalogue attempts to substitute for the manager's judgment.
- **MMI-L02 — Manager interpretation is executable.** Provide a documented CLI
  operation for the existing manager to submit its interpretation of a retained
  builder/reviewer output. The runtime constructs the required internal/durable
  record and continues the pending step without another provider invocation. The
  manager supplies semantic outcomes, evidence/assessments/findings and rationale;
  the runtime supplies format/version/kind, runtime-owned identities and envelopes.
  JSON used as internal command data is not a required agent-response format. It
  must not require the manager to reproduce provider output or retype digests.
- **MMI-L03 — Uncertainty is not acceptance.** An incomplete or ambiguous message
  remains pending with the concrete information needed. The manager may make a
  focused clarification to the same role's saved session without rerunning the
  other role or treating the clarification as another implementation cycle. A
  clarification is read-only; substantive builder rework follows the existing
  build transition. No auto-accept from a bare favorable word, invented check
  result, fabricated per-ID assessment, or silent repair of contradictory evidence.
- **MMI-L04 — Honest attribution and current subject.** Retain the raw message,
  manager identity/rationale and interpreted result separately; never rewrite the
  provider's report as though it supplied the normalized record. Bind application
  to the actual pending run/candidate and reject stale candidate/input drift. The
  manager explains identity discrepancies from evidence rather than mechanically
  treating every typo as either harmless or disqualifying. Durable evidence must
  reveal that interpretation occurred, not only local transient state.
- **MMI-L05 — Resume and routing.** Across relay restarts, an unresolved message
  remains pending rather than becoming a new builder cycle. Applying interpretation
  follows the existing accepted/refinement/decision and evidence outcomes. A genuine
  code finding goes to the builder; human-authority decisions remain decisions.
  The path covers structured implementation evidence, implementation review and
  requirements review; a legacy unknown reviewer verdict is likewise recoverable.
- **MMI-L06 — Bounded integration.** Document the manager's commands and use them
  in a real retained-output example. Update generated per-dispatch role/task
  instructions so content is required but exact JSON formatting is not. Preserve
  existing pinned shared/role prompt FILE bytes so unfinished admitted slices do
  not acquire instruction-digest drift merely by upgrading this runtime. Do not
  add a normalization model,
  daemon, dependency, generic workflow framework, or ASSURANCE-4/5 acceptance system.

## Preservation and checks

**MMI-P01:** Input admission, independent reviewer responsibility, candidate identity,
required evidence, scope checks, create-only publication and human authority remain.
Mechanical checks enforce record integrity, not the truth of manager judgment.

**MMI-P02:** Session/role/provider separation and permission posture from the first
slice remain. Original traces are retained. Existing correct-result routing still
works; formatting recovery does not demand a fresh requirements baseline by itself.

Verify with hermetic headless tests through the real target-relay/CLI boundary:
prose and alternate-shape output -> retained pending -> manager interpretation ->
the appropriate next step with zero repeated provider calls; failed/uncertain
evidence cannot become accepted; stale input/candidate/run refuses; restart and
same-role clarification; actual durable attribution; all four paths in MMI-L05.
Use realistic TD-020 examples without importing the other project's domain rules.
Run full typecheck/tests/build/diff checks. A missing semantic assessment is a
content gap, not a reason to loosen required evidence.

## Implementation boundary

Use existing target-relay use case/CLI (including generated role task directives),
assurance record constructors/parsers and tests, manager playbook and affected
contracts. Do NOT edit shared/role prompt files or add a prompt-version registry.
A compact
pending result in current per-slice operational state is justified by the existing
external manager; no new global state service. The design review must establish the
smallest command/state change that resumes the exact interrupted processing step.
Do not edit historical accepted records or implement bulk migration. Previously
pinned instruction files and baselines retain their identity; current generated
task directives explain the supported output/recovery behavior on each dispatch.

Independent design review precedes implementation. The first slice's session design
is not reopened here; use its real saved role IDs. Manager-recorded acceptance is
not a claim that the held Stage-4 runtime acceptance gate has been delivered.

## Concrete command and continuation design

This section resolves the initial independent review's implementation ambiguities;
it refines the authorized behavior without adding a separate interpretation agent.

1. Add `awaiting-manager-interpretation` to the existing target phase sum. Store
   the pending step in current slice state: role, original run reference, immutable
   raw-output reference/digest, contract being interpreted, runtime-owned subject
   identity and diagnostics. Retain enough pre-result state to resume processing
   the SAME step; ordinary `--slice` resume must not convert it into another build.
2. Expose `--apply-manager-interpretation <file> --slice <id>`. Its small machine
   command payload is `{managerId, rationale, content}`. The content is ONLY the
   existing semantic fields: evidence checks/changeJustifications/limitations/report;
   implementation review result/obligationAssessments/checkAssessments/
   changedPathAssessments/findings/decisions/report; requirements review result/
   assessments/findings/decisions/report; or legacy verdict/rationale. Exact nested
   semantic types are the existing check/finding/assessment types. The command must
   not accept overrides of runtime-owned envelope or subject fields. Invalid command
   data is corrected by the manager, not by rerunning the provider.
3. The runtime fills version/kind/subject/allocation/run identities from pending
   state and uses the existing pure assurance validators for required coverage and
   record consistency. It verifies raw-output/run/input/candidate identities before
   application. A syntactically valid interpretation does not prove its semantic
   truth; the manager explicitly owns that judgment and rationale.
4. Applying interpretation makes ZERO provider calls. Builder evidence advances
   to `review-impl`; review follows its existing refinement, authority-decision or
   accepted publication route. Legacy recognized STATUS values retain their current
   contract; unknown verdicts become pending, not a new regex interpretation rule.
5. Expose `--clarify-pending <text-file> --slice <id> --manager-id <id>`. Resume only
   the pending role's saved native session, explicitly read-only, using its recorded
   provider/model. Revalidate the applicable admitted input closure and candidate
   BEFORE the provider call, and deliver the current applicable role inputs plus
   the focused question and original retained output; session memory is not a
   substitute. Retain manager ID, question bytes/digest and request/result identities
   even when clarification fails; the question itself supplies the rationale.
   Append the clarification request/result to retained evidence, remain pending for
   manager interpretation, and do not increment the implementation iteration. A
   saved ID which is unavailable or mismatched remains pending with an explanation;
   this cannot silently replace an existing conversation. In contrast, an old
   unfinished slice with NO saved ID gets a fresh same-role conversation with the
   complete retained context, records that it is fresh, and saves the returned ID.
   This follows the human's explicit missing-ID compatibility requirement: preserve
   the work, not an imaginary conversation history. No builder rework is authorized
   by a clarification.
6. Keep an immutable local manager-interpretation audit entry with manager ID,
   rationale, timestamp, original run/raw identities, semantic command identity and
   resulting route. Original provider files remain untouched. Every resulting
   tracked verification/review record must ALSO disclose the interpretation: use
   existing report/limitations text to retain an explicit attribution statement
   including manager/rationale and source run/output identity (and clarification
   identity when used). Do not add a second tracked record family or change a frozen
   durable schema merely for metadata. The source performer stays the provider,
   and the record must not say the manager independently executed its checks.

The pending state's consumers are the current relay and the existing in-place
manager; the concrete variation is semantic agent output that does not satisfy the
runtime's old result shape. The rejected simpler alternative is re-running that
provider for serialization alone, which is the defect this slice removes. Shared
result-consumption logic may be extracted locally where live and interpreted paths
would otherwise duplicate publication/routing; no new package or service is earned.

## Interrupted-work compatibility

The human explicitly requires existing unfinished work to continue after upgrade.
Existing v2 admission pins role-prompt file digests and rereads those same paths;
editing those files would block an otherwise valid resumed slice. Therefore put
the new authoritative output guidance in the already generated current task
directive, explicitly overriding historical exact-format wording while retaining
semantic duties, and keep pinned file bytes unchanged. Test resuming a pre-upgrade
admitted slice with its unchanged instruction identities, no native IDs and partial
work. No new default prompt paths, instruction archive, or automatic baseline edit
is required. This is a preservation correction, not permission to ignore actual
input or candidate drift.
