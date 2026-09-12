# ASSURANCE-2 — reviewed inputs and identical delivered context

Status: PREPARED implementation design/packet; document-only review and operator
acceptance are required before the runtime increment. Maturity: PROTOTYPE.
Date: 2026-09-12.

## 1. Authorized outcome and acceptance boundary

Implement the approved ASSURANCE-2 outcome from the
[rollout](requirements-assurance-rollout.md#assurance-2--reviewed-inputs-and-identical-role-context)
without claiming later evidence or final-acceptance gates:

- requirements documents use an explicit authoring posture and a separate
  substantive review posture through the existing target relay roles;
- software validates the review's exact per-H/L coverage and accept/refine/
  decision consistency locally, without vendor-native output schemas;
- an operator can record approval of the exact reviewed baseline in its named
  target without using the legacy human-input command;
- an assured builder and reviewer receive the same snapshotted authoritative
  baseline, shared instruction, common role instruction, and target governance;
  intentionally different role instructions/evidence stay visible; and
- each local run record identifies the request inputs and actual provider
  delivery channels. Same-provider review is disclosed, not upgraded into a
  certification claim.

The acceptance boundary is the existing headless `targetRelayLoop`, the three
current adapters, and the freshly built `relay-target` CLI over disposable target
fixtures. The final system demonstration is a real refinement/review of the
ASSURANCE-3 requirements/slice input, followed by the explicit baseline-approval
operation. A toy fixture alone does not complete ASSURANCE-2.

This directly serves the [VISION](../VISION.md): the relay, rather than the
human, transports identified requirements and review findings between stable
roles; the operator remains the authority for baseline approval. Tracked JSON
keeps accepted decisions inspectable with normal repository tools, while the
three provider adapters remain delivery mechanisms rather than policy owners.

Approval of this document authorizes no runtime change. After document review and
operator acceptance, the manager publishes a new exact v1 implementation baseline
using the accepted stage-1 grammar and dispatches the increment with `--baseline`.
It does not reuse or edit INPUT-3. Section 6 defines the immutable input/mutable
output split required for that baseline.

## 2. Requirement allocation and partial limits

The authoritative wording remains in the H files; this table allocates only the
stage-2 contribution. A row marked partial does not satisfy its parent H or any
later-stage portion.

| Obligation | ASSURANCE-2 contribution | Increment | Acceptance oracle |
|---|---|---|---|
| AM-REQ-001-L03 | Substantive structured review must assess statement adequacy; software retains per-ID outcome, finding evidence/consequence/action | ASSURANCE-2 | ineffective but structurally testable requirement is returned for refinement; valid bounded one can pass |
| AM-REQ-001-L05 | V2 manifest/review/approval live in target tracked paths; local run provenance is not sole approval evidence | ASSURANCE-2 | delete only disposable `.agent-manager`; clean candidate still contains accepted requirement, review, decisions, and approval |
| AM-REQ-002-L01 | Packet declares `REQUIREMENTS_DOCUMENT` or `IMPLEMENTATION`; accepted document finishes only that item | ASSURANCE-2 | accepted document prints awaiting operator approval and invokes no implementation builder |
| AM-REQ-002-L02 | Reviewer prompt and record cover correctness, scoped completeness, consistency, feasibility, verifiability, necessity | ASSURANCE-2 | proxy-passing/user-failing input receives exact finding; good bounded input receives no invented scope |
| AM-REQ-002-L03 | Expected set is the candidate manifest's explicit, validated H/L review scope; missing/duplicate/unknown IDs refuse completion | ASSURANCE-2 | omit one required L from positive output and observe no durable accepted review/approval |
| AM-REQ-002-L04 | Runtime constructs author/reviewer identities from separate requests and reports provider diversity honestly | ASSURANCE-2 | forged provider prose cannot replace recorded identities; same provider renders `same-provider` |
| AM-REQ-002-L05 | This reviewed design supplies ownership, interfaces, failures, preservation, and verification for the consequential boundary change | ASSURANCE-2 | implementation remains within this reviewed design or stops for a changed boundary choice |
| AM-REQ-002-L06 | Decision-required outcomes remain blocking; unchanged D-* decisions are referenced, not re-ratified | ASSURANCE-2 | decision result publishes no accepted review/approval and exposes its exact matrix |
| AM-REQ-004-L03 | Common authoritative request inputs and composed delivery identities match across builder/reviewer; role-specific inputs differ intentionally | ASSURANCE-2 | captured normalized requests/run records have equal common input identities and unequal role-specific identities |
| AM-REQ-007-L01 | `CLAUDE.md` is delivered as Agent Manager governance; other targets use their manifest-declared governance | ASSURANCE-2 | CLAUDE-only target works; no AGENTS duplicate is selected or written |
| AM-REQ-007-L02 | Shared discipline, target governance, and role instructions are distinct, identified input classes | ASSURANCE-2 | two fixture targets receive the same general instruction without either inheriting the other's domain rules |
| AM-REQ-007-L04 | Author/reviewer prompts require accurate names and structured findings can classify naming defects | ASSURANCE-2 | newly introduced partial-check/complete-validation mismatch blocks acceptance; unrelated rename remains outside scope |
| AM-REQ-007-L05 | Coverage/admission policy is provider-neutral; adapters only map snapshotted delivery to their mechanisms | ASSURANCE-2 | parameterized Claude/Codex/Copilot composition accepts/refuses the same structured inputs without `outputSchema` |
| AM-REQ-007-L06 | Shared, common-role, role, and governance bytes are persisted by identity and mutation is fail-closed | ASSURANCE-2 | missing prompt prevents dispatch; mutation after snapshot cannot change one role's delivered bytes |
| AM-REQ-009-L01 | Run/approval output records actual runner/prompt root, target, work item, scope/baseline, and role assignments | ASSURANCE-2 | distinct target fixture remains the recorded working root and approval target |
| AM-REQ-009-L02 | Manager, requirements author, requirements reviewer, approving actor, and CLI supervisor provider remain distinct | ASSURANCE-2 | handoff/output does not call `--supervisor` the manager or turn provider acceptance into operator approval |

Stage 1 already implemented AM-REQ-001-L01/L02/L04/L06 and portions of
AM-REQ-004-L01/L02/L06; those behaviors are preservation obligations, not
reimplemented allocations. AM-REQ-007-L03 is allocated to ASSURANCE-3, so this
design applies the approved architecture discipline but does not claim that later
generic design-review check delivered. No AM-REQ-003, AM-REQ-005, AM-REQ-006,
AM-REQ-008, or remaining AM-REQ-009 behavior is silently pulled forward.

## 3. Evidence-based current behavior

The following was inspected directly in runner HEAD
`47e647ca451a2f0701baa249b5ea6b5eb3275c08`. Deterministic file enumeration and
text search identified the listed source/test set; this is not a claim about
dynamic external consumers.

| Current seam | Observed contract and consequence |
|---|---|
| `RunRequest` in `src/application/ports/provider-runner.ts` | `prompts` are refs, `inputArtifacts` are refs, and `contextText` explicitly has no digest. Add an exhaustive delivery sum rather than nullable snapshot fields. |
| `loadPrompts`, `runImplement`, `runReview`, `makeRunRecord` in `relay-target.ts` | Role files are hashed before request but `inputArtifacts` is always empty; generated packets/reports are inlined without identity; local run record omits context inputs. These are the application seams. |
| Claude adapter | It rereads role prompts; shared prewarm is empty and the live shared path is passed by config. V2 must use a per-run shared snapshot while retaining this legacy branch. |
| Codex/Copilot adapters | Each lazily caches configured shared content and rereads role prompts. V2 bypasses those live/cache paths with request bytes; legacy prewarm and argv remain. |
| `runReview` | Every current review is legacy `STATUS:` parsing and accepted means `done` or decision-review. V2 selects structured parsing only for exact document posture. |
| `TargetRelayStatus` / current pointer | Stage 1 persists a closed v1 assurance object. V2 adds a separate closed variant; it must not make existing v1 records invalid or upgrade them. |
| `src/core/assurance.ts` | Pure v1 parsing/eligibility already aggregates unambiguous diagnostics and exhaustively renders error codes. Extend this file directly; do not add a schema framework. |
| `FilesystemArtifactStore` | Existing contained raw-byte read and general artifact write cover candidate loading and fixed-path publication. No new storage port is needed for stage 2. |
| `src/cli/human-input.ts` | `npm run human` writes legacy `slices/<id>` state through `recordHumanInput`; it is not target-aware approval. Preserve it and add a mutually exclusive `relay-target` operation. |
| `relay-target.test.ts` | The sole enumerated test file already has pure policy, injected stub runners, disposable filesystem fixtures, built-CLI cases, and legacy routing captures. Extend these seams. |

Name mismatch surfaced, not renamed here: `TargetRunRecord` is described in code
as authoritative, but target-relay records are under gitignored `.agent-manager`
and current contracts call them local operational provenance. Its true current
behavior is local run traceability. Renaming it would touch the internal use-case
contract and is not needed for this slice; the new field is named
`inputProvenance`, which states the bounded guarantee.

## 4. Preservation obligations

| ID | Behavior to preserve | Evidence source / falsifier |
|---|---|---|
| P-A2-01 | Every published v1 requirement/manifest/manual-review/approval and v1 persisted mode still admits or refuses exactly as stage 1 specifies | v1 contract, INPUT-1/2/3 fixtures, existing A1-C01–C04 tests; run all unchanged cases |
| P-A2-02 | A valid legacy run retains provider/model/effort/permission/cwd/prompt/argv routing and the legacy limitation label | target-owned relay contract and `legacyRoutingCapture`; exact normalized dry-run comparison |
| P-A2-03 | Missing optional shared prompt remains warn-and-continue only for legacy | CLI source/contract; legacy built-CLI case |
| P-A2-04 | Stage-1 baseline closure, allocation, persisted resume, mutation revalidation, corrupted-pointer exception, and zero-call refusals remain | A1 acceptance and existing stub call-count cases |
| P-A2-05 | `--supervisor` still means selection/review provider, not persistent manager; provider defaults and permission mapping do not change | CLAUDE/PROCESS/target contract; normalized request and argv assertions |
| P-A2-06 | Existing implementation review still consumes `STATUS: approved|revise|escalate`; decision-review triggers only on this slice's surfaced decisions | target contract and existing decision-review unit/integration cases |
| P-A2-07 | Selection remains read-only and does not author requirements; document authoring is an explicitly prepared builder item | D-DISPATCH, selection prompt, zero-write selector test |
| P-A2-08 | Reviewers never mutate their subject; Agent Manager alone publishes the validated durable review, and no command commits | PROCESS and role prompts; read-only request plus git-status/output checks |
| P-A2-09 | Core assurance policy imports no provider, filesystem, process, or CLI implementation; raw snapshots cross the existing boundary | ARCHITECTURE dependency rule; import inspection and typecheck |
| P-A2-10 | No real provider, home artifact, ignored operator state, deployment, install, or other repository is needed by automated acceptance | packet authority; test fixture path and stub inspection |
| P-A2-11 | Approval manifest/review/approval dependencies remain acyclic and no record hashes itself | v1/v2 contracts; graph construction test |
| P-A2-12 | A document review/approval does not invoke or authorize implementation | AM-REQ-002-L01; call counts and output state |

The bounded preservation claim stops at the existing normalized provider request,
adapter invocation builder, target-relay state/run files, and fixed durable v2
records. Provider internals and hostile concurrent repository mutation remain
outside the claim.

## 5. Risk and pre-code design disposition

This is an impactful change despite PROTOTYPE maturity: it changes the provider
request DTO, prompt delivery mechanism in v2, baseline/review/approval boundary
records, and authority-sensitive CLI output. This document is the required
pre-code design. Its independent review must challenge requirements and design,
not merely Markdown shape.

No new consequential product decision was found. The design directly refines the
already ratified D-FORMAT (v2 closed JSON records), D-AUTH (operator-recorded
approval), D-ADOPTION (explicit persisted opt-in), D-DISPATCH (document items
through existing roles), and D-EVIDENCE (durable minimal records/local raw logs).
The exact flag names, framing bytes, record field names, and internal split are
local design details required to make those choices executable. Existing D-*
decisions are not reopened.

## 6. Coherent runtime increment

The request DTO and delivery receipts alone would be dormant until a structured
requirements review consumed them; structured review alone would not be a
substantive review because the current transport does not deliver the baseline
closure. Splitting at that apparent mechanism boundary therefore produces two
partial capabilities that cannot independently satisfy a real user outcome. The
smaller complete design is one bounded vertical increment: v2 grammar,
document routing, snapshot transport, provenance, approval recording, and the
real ASSURANCE-3 review demonstration together.

The implementation remains reviewable because it extends only the current
assurance policy, target-relay use case, one raw request DTO, three existing
adapters, two existing role prompts, the existing test file, and the CLI
composition root. It adds no package, module, provider, port, service, registry,
schema file, or workflow phase. If concrete edit distribution shows this still
cannot complete within the manager's bounded checkpoint, stop and propose a new
split whose first increment has a real consumer; do not ship either half dormant.

### 6.1 Executable predecessor baseline and mutable outputs

Before runtime dispatch, the manager publishes a new v1 baseline with a new
`baselineId`. Its exact manifest requirements/dependencies are:

| Manifest class | Required paths | Why they remain immutable during ASSURANCE-2 |
|---|---|---|
| `requirements` | `docs/requirements/am-req-001-target-owned-requirements.md`, `docs/requirements/am-req-002-requirements-and-design-review.md`, `docs/requirements/am-req-004-baseline-bound-execution.md`, `docs/requirements/am-req-007-project-aware-engineering.md`, and `docs/requirements/am-req-009-in-place-manager.md` | Own every allocated H/L statement; no H-file edit is in scope |
| `source` | `docs/VISION.md`, `docs/assurance/ASSURANCE-0/human-authorization.md` | Satisfy the five requirement records' metadata sources and authority origin |
| `governance` | `CLAUDE.md`, `SYSTEM.txt` | Target governance and the explicitly selected shared instruction; neither is a runtime output |
| `design` | `docs/ARCHITECTURE.md`, `docs/PROCESS.md`, `docs/MANAGER.md`, `docs/slices/requirements-assurance-rollout.md`, `docs/contracts/requirements-assurance-v1.md`, `docs/contracts/requirements-assurance-v2.md`, `docs/assurance/ASSURANCE-1/manager-acceptance.md` | Reviewed architecture/process, v1 grammar, this v2 contract, and accepted predecessor evidence |
| `allocation` | `docs/slices/assurance-2-reviewed-inputs.md` | Existing accepted packet that allocates the runtime increment and its mandatory next-document demonstration |

`requiredDecisionIds` is exactly `D-FORMAT`, `D-AUTH`, `D-ADOPTION`,
`D-DISPATCH`, `D-EVIDENCE`, `D-A1-DIAGNOSTICS`, and
`A1-LEGACY-POINTER-BEHAVIOR`: the first five govern this increment and the latter
two preserve the accepted stage-1 diagnostic/recovery contract it extends. The
approval's existing authority/decision references add their contained raw bytes
to the full admission closure; they are not duplicated as manifest dependencies.
The manager may not omit a path above, add an unrelated dependency, or add a
runtime output as contextual convenience. The fixed v1 review and approval bind
that new manifest in their existing downstream locations. Published INPUT-1/2/3
bytes remain historical and unchanged.

Every section-9.1 tracked path is a mutable output and therefore is absent from
the new implementation manifest's requirements/dependencies. The important
self-modifying collisions are the target copies of
`prompts/roles/builder-target.md`, `prompts/roles/reviewer-target.md`, and
`docs/contracts/target-owned-relay.md`; freezing any of them would make its
authorized edit fail the repeated stage-1 digest check. Source/test files are
also outputs, not design dependencies.

The accepted runner snapshot supplies starting `prompts/system/base.md` to both
roles, `prompts/roles/builder-target.md` to the implementation builder, and
`prompts/roles/reviewer-target.md` to the implementation reviewer. If fresh
selection or decision review runs, its existing selector/challenger/rebutter
prompt also comes from that same snapshot. The manager record names the snapshot
root, HEAD, and each loaded prompt digest; the stage-1 run records retain the
loaded common/role prompt digests. `SYSTEM.txt` is the explicit contained target
shared input above. This is an honest predecessor limitation: the v1 manifest
cannot name a separate prompt root and the runtime has not yet implemented v2
receipts.

After implementation review, the real demonstration uses a fresh process whose
runner/prompt root is an isolated copy of the exact reviewed candidate. It
therefore loads the newly reviewed builder/reviewer prompts rather than the old
snapshot or mutable primary checkout. The unchanged v1 implementation baseline
still admits the bridge because none of those output paths is in its closure;
the fresh runtime records actual rooted bytes through v2 provenance.

## 7. Requirements-review data/control flow and design

### 7.1 Prepared document item

The manager prepares an ordinary target-relay item whose packet contains exact:

```text
ARTIFACT_KIND: REQUIREMENTS_DOCUMENT
SLICE_DOC: docs/slices/assurance-3-evidence-linked-review.md
ADMISSION_ALLOCATION: docs/slices/assurance-2-reviewed-inputs.md
REVIEW_BASELINE: docs/requirements/baselines/<baseline-id>.json
REVIEW_OBLIGATION_IDS: AM-REQ-003,AM-REQ-003-L01,AM-REQ-003-L03
```

The selection parser treats those exact field values as stage-2 document posture
only when the current run has an admitted input baseline; the predecessor bridge
uses the new v1 baseline from section 6.1. Missing,
duplicate, unknown `ARTIFACT_KIND`, or missing/duplicate `REVIEW_BASELINE` blocks
before the document builder. Missing/empty/invalid/duplicate
`REVIEW_OBLIGATION_IDS` also blocks. Its set must equal the v2 candidate
manifest's review scope before reviewer dispatch, so a manifest edit cannot hide
an allocated L. `ARTIFACT_KIND: IMPLEMENTATION` preserves the existing
implementation posture. Under a v2 baseline it also requires
`IMPLEMENT_OBLIGATION_IDS: <comma-separated-H/L-IDs>` and refuses any ID outside
the manifest's reviewed scope before the builder. This is the narrow current
allocation check, not ASSURANCE-3's richer implements/preserves/changes/check
record. Legacy packets and ordinary v1 implementation packets are not required
to add these fields; the explicitly prepared v1 predecessor document item is.

`SLICE_DOC` and `REVIEW_BASELINE` are declared outputs: they may be absent before
the first document-builder call. `SLICE_DOC` retains its existing meanings as
the primary authored spec and the decision-review discovery subject.
`ADMISSION_ALLOCATION` is different: it must exist before dispatch and must equal
a role-`allocation` dependency in the already accepted `--baseline` manifest.
It is required exactly once for `REQUIREMENTS_DOCUMENT`, follows v1 path syntax,
and is passed to the unchanged v1 allocation validator. For the predecessor
demonstration it is exactly this ASSURANCE-2 packet. Missing/duplicate/invalid or
non-admitted values block before the document builder. An implementation item
continues to use its existing `SLICE_DOC` for allocation admission; no legacy
packet or selection output gains the new field.

The document builder receives the original packet and existing admitted inputs,
authors only its file scope, and produces/refines the v2 candidate manifest. It
does not write a review or approval.

### 7.2 Candidate snapshot before review

Before a document build, `targetRelayLoop` first validates the accepted manifest
closure without an allocation, then reads the mandatory selection packet and
validates it with `ADMISSION_ALLOCATION`. On resume and immediately before each
document role it repeats the same path, rather than the output `SLICE_DOC`, in
the allocation check. This is the executable use of the existing
`validateBaselineAdmission` contract: the required allocation file already
exists and its digest is in the accepted manifest.

After a completed document build, `targetRelayLoop` reads the v2 candidate
manifest and its upstream requirement/dependency closure through
`readContainedFile`. It does **not** require the not-yet-created fixed review or
approval. Pure assurance policy validates version/kind, IDs, source closure,
digests, target, and requires the authored `SLICE_DOC` to occur exactly once as
the candidate manifest's role-`allocation` dependency. Failure blocks before
reviewer call.

The runtime holds those immutable snapshots for the reviewer request and validates
the manifest's exact `reviewObligationIds` against declared H/L identities. An L
requires its parent H in the scope; other unchanged Ls in the same files remain
context, not silently submitted obligations. On a later cycle it rereads the
revised candidate; old review output cannot apply to a new digest.

### 7.3 Structured local result

The reviewer prompt explicitly selects requirements judgment and returns only the
section-5 v2 JSON object. `outputSchema` remains absent for every provider. Core
parses and validates raw provider text, expected coverage, references, and
aggregate outcome. It has no provider branch.

Outcomes are exhaustive:

- `accepted`: construct actor identity from actual build/review requests, publish
  the fixed v2 `requirements-review.json` create-only, and set the document item
  `done` with a reason/output saying approval is still pending;
- `refinement-required`: retain the raw and parsed result locally, increment the
  cycle, and send all original obligations plus exact findings back to the same
  document builder; or
- `decision-required`: retain the result locally, write the existing blocking
  handoff with the decision matrix, and stop. It does not call a new builder,
  manufacture approval, or silently enter implementation.

Invalid output is a distinct refusal, not one of those domain outcomes. Existing
implementation `STATUS:` parsing and decision-review remain separate.

### 7.4 Approval operation

The `relay-target` composition root recognizes
`--record-reviewed-baseline-approval` as mutually exclusive with dry-run,
selection/resume, role/model/permission/cycle flags, and live dispatch. It uses
the existing clock/store and a narrow application operation in
`relay-target.ts`. Policy validates inputs and returns the raw approval value;
the existing artifact writer writes the fixed path only after an absence check.
No new CLI file, package script, store interface, or dependency is introduced.

The exact flags/output are in v2 contract section 7.2. Any failure prints a
stable cause and exits nonzero with zero provider calls and no status/scaffold
write.

## 8. Input-delivery data/control flow and design

### 8.1 Request sum and snapshots

Replace the current prompt/context pair in `RunRequest` with the v2 contract's
`RunInputDelivery` sum. Update every current caller explicitly:

- legacy target relay, self-host relay, and one-shot builder construct
  `legacy-live-inputs` and preserve their current values;
- v2 target roles construct `reviewed-input-snapshots` from admitted raw files;
- all three adapters exhaustively match the two variants without wildcard arms.

This is a boundary DTO of raw paths/bytes/digests only. It introduces no provider
interface, registry, or record service.

The stage-2 application loader extends the existing `admitBaseline` operation to
return the already-read ordered closure snapshots alongside the pure admission
value. It separately uses `readContainedFile(promptRoot, ...)` for shared/common/
role instructions. The CLI must supply `SYSTEM.txt`; optional warn-and-continue
exists only in the legacy variant. Agent Manager self-build requires `CLAUDE.md`
among manifest governance dependencies; other targets use their explicit closure.

### 8.2 Provider mapping

Adapters verify every request digest and compose only from request bytes in the
reviewed variant:

- Claude uses a verified deterministic shared snapshot file plus framed stdin;
- Codex uses exact shared bytes in `developer_instructions` plus framed stdin;
- Copilot frames shared bytes first in stdin and retains its documented weaker
  permission disclosure.

Each adapter's `run` and the CLI dry-run use one public, no-spawn
`prepareRunDelivery` method returning its invocation, stdin bytes, optional
shared-snapshot file bytes/path, and channel receipt. Live `run` writes any
declared snapshot and hands those returned bytes/config values to spawn without
recomposition. Adapter tests inspect that same value; they do not launch a real
CLI. This seam prevents a separately tested renderer from drifting from the live
path.

### 8.3 Equality, state, and review completion

The v2 persisted mode stores manifest and instruction identities. Before each
role call the runtime revalidates them and reconstructs the common array in the
contract's order. Before accepting the review result it compares the completed
builder/reviewer run records' baseline and ordered common input identities.
For a predecessor document item, the persisted enforcement remains v1 and each
revalidation uses the packet's `ADMISSION_ALLOCATION`; `status.sliceDoc` remains
the output/decision subject and is not misrepresented as an existing v1 input.

Role prompts, build report, prior findings, task directive, provider/model, and
delivery mechanism are expected differences and are separately identified. A
common mismatch blocks with `role-context-mismatch`, even if review content says
accepted. The complete common array, not a selected digest subset, is compared.

V2 `--baseline` live/dry-run output says `reviewed-inputs` only after structured
review, approval, allocation, mandatory instructions, and persisted-mode checks
pass. V1 continues to say `baseline-admission`; legacy continues to state its
limitation.

## 9. Files in scope

### 9.1 Runtime implementation

- `src/core/assurance.ts` — v2 candidate/review/approval pure policy and errors
- `src/application/ports/provider-runner.ts` — exhaustive raw input-delivery DTO
- `src/core/run-record.ts` — shared request/result provenance types only where
  current non-target callers consume them
- `src/application/use-cases/relay-target.ts` — document posture, candidate load,
  structured outcomes, snapshots, state, equality, durable review, approval and
  provenance wiring
- `src/application/use-cases/relay.ts` and
  `src/application/use-cases/run-builder.ts` — mechanical construction of the
  legacy delivery variant; no behavior change
- `src/application/use-cases/relay-target.test.ts` — pure/use-case/adapter/CLI fixtures
- `src/cli/relay-target.ts` — snapshot composition, approval dispatch and truthful v2 output
- `src/adapters/providers/claude-code/adapter.ts`
- `src/adapters/providers/codex/adapter.ts`
- `src/adapters/providers/copilot/adapter.ts`
- `prompts/roles/builder-target.md` — explicit document versus implementation duty
- `prompts/roles/reviewer-target.md` — exact structured requirements-review duty
- `docs/contracts/target-owned-relay.md` — document actual v2 mode after code exists
- `.agent-manager/slices/ASSURANCE-2/build-progress.md` — local incremental report

The tracked paths in this list are runtime candidate outputs and MUST NOT occur
in the new v1 implementation manifest from section 6.1. The local progress path
is ignored operational state and is outside any durable baseline closure.

### 9.2 Demonstration outputs after code review

The manager creates a separate document-only item with a separately reviewed
scope for:

- `docs/slices/assurance-3-evidence-linked-review.md` (new, real next-increment packet)
- `docs/requirements/baselines/<ASSURANCE-3-input-id>.json` (new v2 candidate)
- `docs/assurance/<ASSURANCE-3-input-id>/requirements-review.json` (runtime-published)
- `docs/assurance/<ASSURANCE-3-input-id>/baseline-approval.json` (operator operation)

The requirements H files are inputs, not rewritten merely to demonstrate review.
If actual ASSURANCE-3 refinement requires changing an approved H/L statement,
that is controlled requirement change and a stop for explicit authority, not
implied demonstration scope.

No other source, test, prompt, package, schema, template, requirement H file,
roadmap, baseline, approval, README, legacy CLI, or other target is in scope. A
necessary extra tracked file/dependency is a stop condition.

## 10. Acceptance checks and executable oracles

All product invocations use disposable target/prompt trees named
`ASSURANCE-2-*`. Tests use the existing dependency
installation and no real provider. Every command is synchronous; exit status is
not piped or filtered. The builder records each group incrementally.

### A2-C00 — predecessor implementation baseline

**Method:** before runtime dispatch, the manager constructs the new v1 manifest,
review and approval under fresh IDs, validates them with the accepted stage-1
built CLI, and records the exact runner/prompt identities. From the accepted
stage-1 runner root, against a disposable target copy with prepared ASSURANCE-2
local status, run:

```sh
npm run relay-target -- <ASSURANCE-2-target-copy> --dry-run \
  --baseline docs/requirements/baselines/<ASSURANCE-2-implementation-id>.json \
  --slice ASSURANCE-2
```

**Oracle:** the manifest requirements/dependencies equal the required section-6.1
path/role sets, and `requiredDecisionIds` equals the seven IDs specified there;
its identity is not INPUT-1/2/3. Its intersection with section-9.1 tracked outputs is empty.
The approval references the existing authority/decision records without duplicating
them in the manifest.
The fixed review/approval chain passes stage-1 admission and allocation for this
existing `SLICE_DOC`; the dry-run prints `baseline-admission`, performs no write
or provider call. The adjacent manager handoff separately names the accepted
runner root/HEAD and prompt digests. Editing copies of all section-9.1 outputs
leaves this baseline admissible, while mutating one section-6.1 input produces
`digest-mismatch`.

### A2-C01 — v2 pure grammar and v1 compatibility

**Command:** targeted Jest pattern for v2 assurance policy, then
`npm test -- --runInBand`.

**Oracle:** valid v2 candidate/result/review/approval parse. Each v2 object level
rejects missing/unknown/wrong-typed fields, wrong version/kind, duplicate JSON
keys, duplicate H/L/assessment/finding/decision/path IDs, malformed JSON and BOM.
Ambiguous JSON stops dependent diagnostics; unambiguous records aggregate
independent errors. All published v1 positive and negative fixtures return the
same admission/error codes and labels.

### A2-C02 — exact review coverage and outcome

**Command:** targeted Jest pattern for requirements review.

**Oracle:** for a fixture with two H and at least three L, submit a strict subset
through `reviewObligationIds`: exact once-per-submitted-ID accepted coverage
succeeds and unsubmitted declared Ls need no result; omitting one submitted L
yields `review-coverage-missing`;
adding an unknown ID yields `review-coverage-unknown`; duplicates report both
locations. Parent-H acceptance does not cover its Ls. Bad finding/decision refs,
accepted assessments with refs, refinement without findings, decision without a
decision, and wrong aggregate yield exact failures. A report claiming acceptance
cannot override any failure.

### A2-C03 — document routing

**Command:** targeted `targetRelayLoop` stub cases, then full Jest.

**Oracle:** explicit requirements document calls one author and one separate
reviewer. Accepted output publishes one durable review and ends with awaiting-
approval output; provider calls stop there. Refinement loops with original packet
plus findings. Decision-required blocks with visible matrix and no accepted
review. Invalid JSON, stale subject, omitted/unknown ID, candidate mutation, and
missing/duplicate posture fields block with no dependent calls. A packet/
manifest review-scope mismatch blocks before the reviewer. Implementation posture
retains legacy verdict behavior and decision review. In the predecessor fixture,
`SLICE_DOC` and `REVIEW_BASELINE` do not exist initially, while
`ADMISSION_ALLOCATION` exists and is the accepted v1 manifest's role-`allocation`
dependency. The author is called only when the v1 guard receives that existing
path. Missing, duplicate, invalid, or non-admitted `ADMISSION_ALLOCATION` yields
zero author calls. After authoring, the new `SLICE_DOC` must be the candidate v2
manifest's allocation; its decision marker remains discoverable by the unchanged
legacy `SLICE_DOC` rule.

### A2-C04 — target approval operation

**Command:** fresh build, then invoke the exact section-7.2 CLI command against a
small disposable accepted v2 review; also invoke wrong-target/project, stale
subject, missing-decision, rejected-review, duplicate-output, and malformed cases.

**Oracle:** positive command writes exactly the fixed approval with actual target,
subject, review, actors, authority and decisions, prints `commit: not performed`,
and invokes zero providers. Every negative exits nonzero and writes nothing.
`npm run human` behavior/files are unchanged. Removing `.agent-manager` from a
candidate copy does not remove the durable chain.

### A2-C05 — normalized common/role inputs

**Command:** targeted use-case tests with captured stub requests.

**Oracle:** builder/reviewer v2 requests have byte-for-byte equal ordered common
snapshots: shared, common role, manifest, requirements, dependencies, review,
approval, authority and decisions. Their role instruction/task/evidence arrays
differ intentionally and are present. `inputArtifacts` refs are not accepted as
proof of delivery. Two target fixture governance documents remain distinct while
the shared process instruction remains equal.

### A2-C06 — adapter delivery and provenance

**Command:** parameterized Jest cases for Claude, Codex and Copilot composition;
then full Jest.

**Oracle:** each adapter consumes request snapshot bytes without rereading live
role/shared sources, checks every digest, frames exact byte lengths, and returns
channel identities matching the spawned stdin/config/snapshot file. Mutation of
the original after request snapshot does not alter delivered bytes. Missing or
changed mandatory inputs fail before spawn. No `outputSchema` is sent. Mechanism
names and Copilot's weaker permission remain honest.

### A2-C07 — persisted v2 context and mutation

**Command:** targeted resume/dispatch stub tests.

**Oracle:** first v2 use persists equal closed mode in status/current. Flag
omission resumes v2, not v1/legacy. Partial/mismatched mode, v1/v2 conflict,
shared/role/governance/baseline mutation, and unequal common builder/reviewer
receipts block with zero dependent provider calls. Intentional role differences
do not block. A missing/unreadable active `selection.md` blocks rather than
becoming an empty packet. Missing/duplicate/unknown
`IMPLEMENT_OBLIGATION_IDS`, or one not in the manifest review scope, blocks
before the implementation builder. A resumed v1 predecessor document item
re-reads the packet and rechecks its persisted manifest using
`ADMISSION_ALLOCATION`, never its not-yet-existing/output `SLICE_DOC`. V1
mutation/refusal behavior otherwise remains unchanged.

### A2-C08 — built CLI and legacy routing

**Commands:** `npm run build`; built CLI against disposable v1, v2, and legacy
fixtures; `npm run relay-target -- <fixture> --dry-run` only if it is the fresh
candidate entrypoint and fixture is isolated.

**Oracle:** v2 prints `reviewed-inputs`, manifest and instruction identities,
actual target/prompt roots, role assignments, and same-/different-provider
disclosure. V1 prints only `baseline-admission`. Legacy prints its limitation.
V2 missing shared prompt is fatal; legacy missing shared prompt warns and retains
routing. V2 dry-run writes nothing and prints planned channel identities. The
captured legacy command/args/cwd/mode/permission/model/prompt source remain equal
apart from already accepted enforcement text.

### A2-C09 — real next-increment review (system demonstration)

**Method:** after code, automated checks, and implementation review pass, the
manager makes an isolated copy of those exact reviewed candidate bytes and
starts a fresh built runner with that copy as both runtime source and prompt
root. The accepted runner/prompt identities are recorded before launch; the new
builder/reviewer prompt bytes come from this copy, not INPUT-3's target paths or
the mutable primary checkout.

In that isolated target, the manager prepares a bounded document item with these
path relationships (the concrete baseline ID is chosen when the records are
created):

```text
ARTIFACT_KIND: REQUIREMENTS_DOCUMENT
SLICE_DOC: docs/slices/assurance-3-evidence-linked-review.md
ADMISSION_ALLOCATION: docs/slices/assurance-2-reviewed-inputs.md
REVIEW_BASELINE: docs/requirements/baselines/<ASSURANCE-3-input-id>.json
REVIEW_OBLIGATION_IDS: AM-REQ-003,AM-REQ-003-L01,AM-REQ-003-L03,AM-REQ-003-L05,AM-REQ-003-L06,AM-REQ-004,AM-REQ-004-L04,AM-REQ-004-L05,AM-REQ-005,AM-REQ-005-L01,AM-REQ-005-L02,AM-REQ-005-L03,AM-REQ-005-L04,AM-REQ-005-L05,AM-REQ-005-L07,AM-REQ-007,AM-REQ-007-L03
```

It invokes the fresh runner with `--baseline` naming the new v1 ASSURANCE-2
implementation baseline from section 6.1. The initial closure validation passes
without an allocation argument. Before the author call, the stage-2 document
parser reads the packet and passes existing `ADMISSION_ALLOCATION` to the v1
guard; the absent output `SLICE_DOC` is not used for admission. The document
builder authors the real ASSURANCE-3 slice and v2 candidate manifest. Before the
reviewer, the runtime proves that the authored slice is the candidate's
role-`allocation` dependency, snapshots the candidate as review subject, and
revalidates the accepted v1 baseline against the same existing admission path.
The unchanged `SLICE_DOC` value continues to drive decision discovery.

The run uses v2 snapshot delivery/provenance but truthfully retains the
predecessor input's `baseline-admission` enforcement label. After an accepted
review, the explicit target-aware approval operation produces the first v2
`reviewed-inputs` baseline and dispatches nothing. Byte-identical tracked
ASSURANCE-3 outputs are returned to the primary candidate for final diff review,
while disposable local run state is deleted after its evidence is recorded.
This is the visible delivered use of the same increment, not authority for
adjacent implementation.

**Oracle:** durable review accounts exactly for every submitted H/L ID, records
actual separate Sol/Terra requests and same-provider status, and either resolves
all findings or remains visibly blocking. Approval binds the target/manifest/
review/authority/decisions and dispatches nothing. The document builder and
reviewer run records have identical common input identities and intentional role-specific
differences. Manager records commands, roots, revision, outputs, and who performed
approval. The recorded starting prompt identities equal the reviewed isolated
candidate's changed role prompts; the v1 baseline contains every section-6.1
input and no section-9.1 output. At author dispatch, the accepted allocation file
exists and both declared output paths are absent; after authoring, the output
slice is the v2 candidate's allocation. A fixture-only result is insufficient.

### A2-C10 — repository gates

Run synchronously:

```sh
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

**Oracle:** every command exits zero. Inspect `git status --short`, including
untracked deliverables, and map every hunk to this packet. No lint/package install
is added merely for this slice. No real-provider E2E is required; the live product
boundary is the fresh built CLI and the real provider invocations in the bounded
ASSURANCE-3 dogfood, whose records—not provider internals—are inspected.

## 11. Output surfaces

Stage-2 support is visible, not merely parsed internally:

- CLI enforcement line: `reviewed-inputs` versus `baseline-admission` versus
  `legacy (requirements assurance not enforced)`;
- per-document-cycle local raw + parsed review result and exact blocking reason;
- tracked `requirements-review.json` only after complete accepted coverage;
- tracked `baseline-approval.json` only after the explicit target-aware command;
- approval CLI summary with target/project/subject/review/output and no-commit line;
- local run `inputProvenance` with common, role-specific and delivery-channel
  identities; and
- real ASSURANCE-3 reviewed input chain produced and approved by the delivered flow.

No output says `assured`, `verified`, `accepted implementation`, `independent
certification`, or `released`.

## 12. Stop conditions

Stop affected work and report rather than improvise if:

- this preparation's two documents lack independent approval or the manager has
  not published the exact stage-1 implementation baseline for the increment;
- that new baseline omits a required section-6.1 input, contains any section-9.1
  tracked output, or reuses/mutates a published INPUT-1/2/3 identity;
- implementation requires changing the v1 grammar, published baseline bytes,
  D-* authority/adoption/dispatch/evidence decisions, or allocated H/L wording;
- a v2 review cannot derive its exact expected H/L set from the candidate or a
  submitted obligation lacks a stable identity;
- the target's governance closure is ambiguous or cannot be represented by
  explicit manifest dependencies without inventing discovery semantics;
- an operation would overwrite an approval/review, infer actor authority from a
  provider verdict, or make the manifest/review/approval graph cyclic;
- valid legacy or v1 routing cannot be preserved exactly;
- a provider needs vendor-native schema enforcement, or actual snapshot delivery
  cannot be verified at the adapter seam;
- another tracked file, new package/dependency/module boundary/schema registry/
  service/workflow phase appears necessary;
- the real ASSURANCE-3 demonstration requires changing H/L requirements without
  controlled authority, or cannot be isolated from operator state; or
- validation would require a real provider for automated tests, ignored operator
  state, a home-directory artifact, install/deploy/commit, or another repository.

A provider/environment interruption follows the accepted conscious-recovery
protocol; it is not itself a product decision. A genuine new boundary or authority
choice is recorded as `DECISION_REQUIRED` with source-grounded risk/reward.

## 13. Earned abstractions and rejected machinery

- **V2 manifest variant in existing assurance policy** — current users:
  candidate review, operator approval, and v2 admission; variation: v1 manual
  review chains versus v2 structured-review chains; rejected reinterpretation
  of v1 because it would relabel published evidence.
- **V2 review result/record sums in existing `assurance.ts`** — current users:
  document routing and v2 admission; variation: the closed accept/refine/decision
  outcome set; rejected direct prose parsing because omitted L coverage would be
  nondeterministic.
- **`ADMISSION_ALLOCATION` document-posture field** — current user: the real
  ASSURANCE-3 author/review bridge; variation: the existing accepted allocation
  that authorizes a run versus the new `SLICE_DOC` output that run creates;
  rejected reuse of `SLICE_DOC` because v1 requires its allocation dependency to
  exist and match before any builder call.
- **Rooted content and byte identities in the existing DTOs** — current users:
  persisted instruction choice, request snapshots, durable review provenance,
  and adapter receipts; variation: target/prompt roots and source/composed bytes;
  rejected `ArtifactRef.path` because its actual root is caller-dependent and it
  carries no digest.
- **`RunInputDelivery` sum in the existing provider port** — current users: all
  current request constructors and three adapters; variation: legacy live files
  versus v2 immutable snapshots; rejected additive nullable snapshot fields
  because mixed modes would be an invalid but representable state.
- **`inputProvenance` on local target run records** — current users: common-input
  equality and manager audit; variation: common authoritative inputs versus
  role-specific inputs/provider channels; rejected prompt refs alone because the
  current adapters reread or cache different bytes.
- **Adapter `prepareRunDelivery` seam** — current users: each of the three live
  adapter `run` methods, assured/legacy dry-run, and adapter composition tests;
  variation: provider-specific shared-instruction channel and argv mapping;
  rejected testing a second renderer because it would not establish the bytes
  handed to spawn.
- **Narrow target approval application operation** — current users: manager
  publication and v2 admission; variation: explicit target/subject/actor/authority;
  rejected reuse of legacy `recordHumanInput` because its actual contract mutates
  a different slice store and names no baseline.

No new module, package, provider adapter, store port, registry, schema file,
template catalog, state-machine phase, database, daemon, or scheduler is earned.
The direct implementation in the current core/use-case/adapters is the smallest
design that preserves the ratified behavior.

## 14. Preparation acceptance (this document pass only)

The ASSURANCE-2-PREP reviewer checks these two new documents for cross-contract
consistency, exact allocated IDs, implementability at the observed seams, scope
economy, preservation, and independent oracles. Software gates are not applicable
to this document-only pass. Required checks are `git diff --check`, deterministic
inspection that only the two allocated documents are tracked changes, and SHA-256
comparison of every path in the manager's `starting-identities.json`.

A positive review accepts only this design/packet. The manager then publishes its
implementation baseline and separately dispatches ASSURANCE-2 under the accepted stage-1
guard. No code, test, prompt, package, H file, roadmap, baseline, or approval is
changed by preparation.
