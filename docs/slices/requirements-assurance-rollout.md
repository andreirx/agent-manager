# Requirements assurance — component design and rollout

Status: APPROVED rollout; ASSURANCE-0 authorized, dependent code awaits its review. Maturity: PROTOTYPE.
Date: 2026-09-11. This is the document deliverable for the user's request, not a
completed product slice. [Human authorization](../assurance/ASSURANCE-0/human-authorization.md) records approval of these drafts and the recommended decisions.

## 1. Objective, settled scope, and limits

Deliver the [nine high-level requirements](../requirements/README.md) through the
human's persistent-manager -> bounded builder/reviewer operating method.

Settled: one H file with individually identified Ls inside; CLAUDE.md as Agent
Manager's sole project-instruction file; authoring a reusable manager role/playbook.
Approved: the detailed requirements and recommended format/authority/adoption/dispatch/evidence choices below. Exact record grammar is refined in ASSURANCE-0; runtime transitions are implemented only in their assigned increments.

No daemon, GUI, database, graph indexer, requirements service, generic workflow
engine, extra provider, or automatic model escalation. Existing application/core/
adapter boundaries remain. Do not migrate the old relay merely to make names match.
The human now authorizes bounded builder/reviewer implementation runs; no global defaults or deployment changes.

## 2. Existing implementation: evidence and consequences

Inspected the tracked source inventory, named files/functions below, role prompts,
contracts, configuration, and the full textual AGENTS.md/CLAUDE.md difference.
This is not a claim of compiler-proven whole-program call coverage.

| Component / evidence | Current behavior | Consequence for this design |
|---|---|---|
| CLAUDE.md versus former AGENTS.md | Only differing removed instructions were superseded provider defaults; CLAUDE contains later operating rules | Remove duplicate, preserve CLAUDE's later content; do not merge obsolete defaults back |
| prompts/system/base.md | Begins by calling every invocation a builder | Make role-neutral during reviewed prompt adoption; current role prompts mitigate but the name/role mismatch is real |
| prompts/roles/supervisor-select.md | Read-only selector emits packet prose, names SLICE_DOC and DoD | It cannot author requirements; manager prepares a document item for a builder |
| relay-target.ts TargetPhase | Actual phases are select-slice, implement, review-impl, decision-review, awaiting-ratification, blocked, done | Work on this live model, not the more expansive unused core WorkflowPhase list |
| runImplement / buildBuilderContext | Pass the selection packet as context; inputArtifacts is empty | A future baseline must actually be loaded and included, not just appended as an inert reference |
| runReview / makeRunRecord | Review report inlined; records retain role-prompt digests and logs, not a requirements baseline or composed-context identity | Extend provenance and the completion predicate together |
| runReview approval branch | A positive verdict goes to done or decision-review based on markers | Positive prose currently does not enforce per-requirement evidence or human final acceptance |
| explicit --slice resume branch | Any blocked status is reset to implement, without typed cause | Assured mode must distinguish retryable infrastructure from an unresolved authority gate |
| ensureScaffold | Generated ignore/README text still describes some working artifacts as committed | Correct this for newly provisioned targets before relying on local/durable separation; do not blanket-edit existing targets |
| adapters' run composition | Stable prompt files and contextText reach stdin; inputArtifacts must not be assumed to inline file bytes | Use verified loaded context; references alone do not transport requirements |
| shared prompt handling | Claude receives a live file path; Codex/Copilot cache content; CLI warns and continues when missing | Snapshot content and record identity for assured runs; fail if a required prompt is unavailable |
| Claude/Copilot schema support | outputSchema is explicitly unsupported; vendor-neutral fields do not imply native schema capability | Parse/validate structured role records locally; do not require native schema flags |
| src/cli/human-input.ts | Calls legacy recordHumanInput under slices/, not target-owned approval | Do not claim npm run human ratifies a target baseline; add an explicit target-aware operation |
| core updateSlicePhase | Returns an updated value; it does not validate legal transitions | Do not use its name/comment as an eligibility check |
| ArtifactRef.path | Root interpretation depends on caller context | Do not reuse it as an unambiguous baseline identity without specifying target/prompt roots |
| relay-target.test.ts | StubRunner and injected dependencies plus disposable filesystem fixtures | Reuse these headless seams; separate pure policy tests from filesystem integration |
| docs/ROADMAP.md | Absent before this pass | New roadmap below is a proposed adoption queue, not a fabricated historical roadmap |

The comment describing WorkflowPhase as authoritative does not make it the state
machine used by targetRelayLoop. Surface that mismatch; do not rename or consolidate
legacy identifiers without a separate approved call-site review.

## 3. Proposed storage and machine contracts

See [PROCESS](../PROCESS.md#2-where-records-belong) for ownership.
Current draft H files are readable authoring records, not the final parser format.

Recommended first machine grammar (D-FORMAT): Markdown requirement/slice documents
with one small explicitly delimited JSON metadata block; ordinary prose holds the
statements and criteria. Standard JSON records hold manifests, reviews, and evidence.
The initial parser recognizes only the ratified metadata block and ID conventions,
not arbitrary Markdown, YAML, or a generic schema language. No dependency needed
merely to parse JSON; any validation library proposal needs its own concrete case.

Define these concepts before changing boundary DTOs:
- Requirement identity/source and per-file L IDs.
- Work-item kind: requirements/design document versus implementation; the same
  builder/reviewer providers can perform different postures.
- Allocation: implements/preserves/changes IDs, baseline reference, checks, scope.
- Input manifest: format version; target identity; referenced input paths/digests;
  parent/design/governance dependencies; review/approval references kept acyclic.
- Review: subject digest, actor/run identity, per-ID assessment, findings, decisions.
- Evidence: check ID and requirement IDs; expected/actual; performer; method;
  input/candidate identity; result and supporting durable location.
- Acceptance: input baseline + candidate + evidence/review + actual operator decision.
- Run state: active enforcement contract and blocker cause; absence must not mean success.

Do not duplicate requirement text into every record. For record subjects use exact
bytes plus Git revision/retained content as appropriate, not only the latest filename.
Manifest -> source inputs, approval -> manifest/review, acceptance -> candidate/
evidence/approval form an acyclic chain; none hashes itself.

Freeze only the relevant approved input closure, not the whole repository. Candidate
identity is a separate reviewed deliverable-tree digest covering code, tests, configuration,
and in-scope untracked files. Declare exclusions for local logs/generated test output
and acceptance files. Git HEAD alone misses uncommitted changes; git diff alone
misses untracked files. Check before/after review and before acceptance. This detects
checkpoint drift; it does not prevent arbitrary external mutation between checks.

## 4. Proposed component changes

'Unchanged' is intentional: satisfying the methodology does not require rewriting
every component. All runtime rows below remain proposals, not changes made here.

| Location | Proposed change / explicit non-change | Requirement / validation |
|---|---|---|
| SYSTEM.txt | Keep general requirements/design/naming discipline; explicit CLAUDE entry; adopt only after review | 007; prompt review, no domain-specific rules |
| CLAUDE.md | Single authority; link process and manager playbook; after ratification require the delivered gates for self-build and record delegated authority | 007, 008, 009; review for contradictory instructions |
| docs/VISION.md | Navigation to requirements, not a second statement of L rules | 001; source-link inspection |
| docs/ARCHITECTURE.md | Document live target relay versus legacy prototypes; specify new policy/record boundaries and durable evidence ownership when ratified | 004–007; dependency review |
| docs/requirements/* | Actual H/L catalog, then accepted revisions and input manifests | 001–006; structural and independent semantic review |
| docs/PROCESS.md, docs/MANAGER.md | Canonical lifecycle proposal versus current manager operating protocol; no duplicated large governance body | 002, 009; manager handoff demonstration |
| docs/ROADMAP.md, docs/slices/* | Eligibility, allocations, dependencies, preservation/checks; later split each ready increment into its execution slice | 003, 008; read-only selection tests |
| docs/contracts/target-owned-relay.md | Add versioned assured-mode prerequisites, blockers, final acceptance meaning; preserve legacy contract explicitly | 004–006; transition tests |
| docs/contracts/prompt-assets.md | Ratify SYSTEM.txt shared-source treatment versus Markdown role catalog; record all effective instruction digests | 007; delivery tests |
| docs/contracts/provider-adapter.md | Clarify raw structured-result transport/local validation if needed; no claim of native schema capability | 007; provider composition tests |
| Other existing naming/log/slice contracts | Change only if new record locations or precise field semantics cross their documented scope; preserve historical legacy formats | 001, 008; contract diff review |
| FUTURE templates/ | Only requirement/slice/review formats actually used by the next authoring/review step; no empty catalog of future roles | 001–003; real packet generated and reviewed |
| FUTURE schemas/ | Only if selected validation consumes them; avoid schema files disconnected from runtime guards | 004–005; invalid inputs rejected by live admission |
| prompts/roles/manager.md | Persistent coordinating role, separate from --supervisor; explicit roots, bounds, monitoring, steering, handoff | 009; live bounded manager checkpoint |
| prompts/system/base.md | Role-neutral artifact-only base; no implicit builder identity; retain non-interactive escalation syntax | 007; all role-composition cases |
| prompts/roles/builder-target.md | Document-authoring versus implementation posture; baseline allocation, naming, evidence outputs; no self-approval | 002, 005, 007; real emitted records |
| prompts/roles/reviewer-target.md | Requirements-validation versus implementation-review posture; per-ID coverage and naming/oracle checks; exact local record grammar | 002, 005; omitted-ID rejection plus adversarial semantic cases |
| prompts/roles/supervisor-select.md | Select only eligible prepared work; report prerequisites without authoring or changing approval | 003; zero-write/zero-builder negative test |
| prompts/roles/decision-challenger.md and decision-rebutter.md | Reuse for consequential decisions; bind subject/IDs and review changed decisions rather than treating all old markers as new | 002, 006; omitted/unchanged/amended decision cases |
| prompts/standalone-review.md | Include exact source/evidence and scope for product usefulness gate; retain no-tools posture when run that way | 008; final gate checks actual outputs |
| src/core/ — proposed assurance.ts | Small pure domain values and eligibility/coverage/change checks; explicit Result-like error sums and exhaustive handling; no I/O/provider names | 004–006; raw-input unit tests |
| Existing core role.ts, workflow-phase.ts, slice.ts | Do not activate or expand dormant legacy lifecycle just for symmetry; preserve existing callers | 008; existing tests/typecheck |
| Existing core artifact-ref.ts, run-record.ts | Retain shared provider types; extend/reuse only with explicit root/digest semantics; avoid parallel record models without a demonstrated distinction | 004, 007; typecheck and serialization cases |
| src/application/use-cases/relay-target.ts | Wire baseline admission before dispatch, consistent context loading, typed blocker recovery, review coverage, evidence check and later awaiting-acceptance; correct new-target scaffold | 002–006; actual targetRelayLoop stub-provider tests |
| src/application/use-cases/relay-shared.ts | Preserve legacy parseVerdict behavior; do not make bare verdict parsing a v1 assurance check | 005, 008; positive prose with invalid record must block |
| src/application/ports/artifact-store.ts | Add only raw artifact-read/snapshot/publish operations needed by assured flow; distinguish not-found from I/O failure | 001, 004, 005; fake-store failure injection |
| src/adapters/filesystem/artifact-store.ts | Implement those operations, root containment and deliberate atomic publication; keep requirement policy out | 001, 005; temporary-tree/symlink/interruption tests |
| src/application/ports/provider-runner.ts | Reuse contextText and raw result content; clarify snapshot references if necessary. Do not add a provider-specific assurance interface | 004, 007; normalized request tests |
| Claude adapter | Deliver the frozen shared-prompt snapshot rather than re-reading a mutable original in assured mode; preserve legacy flags | 007; argv/file-content composition test |
| Codex adapter | Ensure cached/shared content corresponds to the run's recorded snapshot; preserve permission semantics | 007; content and resume tests |
| Copilot adapter | Same content/record contract; retain PROTOTYPE limitations and weaker isolation disclosure; no new support claim without live proof | 007, 008; composition test, live proof deferred per existing debt |
| ClockPort / SystemClock | Unchanged; reuse timestamps, never treat a timestamp as content identity | 004; existing seam |
| src/cli/relay-target.ts | Compose readers/hash/Git mechanisms; expose staged baseline and later assured invocation; explain refused prerequisites and enforcement level; no model-default change | 004, 008, 009; dry-run and CLI negative proofs |
| src/cli/human-input.ts | Keep legacy behavior; do not overload it silently. Add target-aware approval/publication operation through explicit command dispatch after D-AUTH | 005, 006; wrong-target/wrong-subject tests |
| Legacy relay.ts / run-builder.ts and their CLIs | No methodology retrofit in this rollout; document limited/legacy guarantees, do not delete functionality | 008; legacy regression checks |
| package.json / Jest / typecheck | Add commands only with working consumers; keep typecheck mandatory alongside Jest; no new test framework | 008; commands run on own repo |
| README.md / .gitignore | Explain actual adoption level and startup; preserve local-only .agent-manager versus tracked assurance records | 001, 008; clean-checkout inspection |
| scripts/audit18-* and repo-graph scripts | No changes: project-specific operations are not the generic assurance mechanism | 007; scope check |

### Earned structures, not a framework

Proposed one-line justifications (not implemented abstractions):
- Baseline manifest: manager, builder admission, and acceptance checks consume it;
  variation is exact reviewed input revisions; a mutable 'approved' flag cannot bind evidence.
- Pure assurance policy file: admission, resume, and completion share checks;
  force is the existing core/I/O boundary; duplicating checks inside filesystem branches
  would hide policy and make domain tests require disk.
- Narrow additions to the existing artifact port: input loading and durable publication
  need filesystem isolation; force is missing/read-failed/atomic-write behavior;
  a new repository service or generic storage registry is unnecessary.
- Manager role prompt: the current human-started coordinating session consumes it;
  force is manager versus builder/reviewer authority; stuffing its duties into builder
  prompts would permit role confusion.
No new package, registry, scheduler, database, or general state-machine engine is proposed.

## 5. Ordered vertical increments

ASSURANCE-0 is authorized. Close its review and grammar first, then prepare
an executable implementation slice from the next section. Each packet must copy its exact requirement
allocation, accepted scope, checks, and observable result, not 'implement this plan'.

### ASSURANCE-0 — Review the process and baseline (documents only)

Inputs: current catalog, process, manager playbook, rollout decisions, source evidence.
Work: the manager uses the existing document-only relay mechanism to obtain independent
requirements/design review, resolve D-* decisions, and record operator baseline approval.
This includes pinning a first record grammar and choosing the prompt-adoption path.
Do not ask read-only selection to author these files.

Output: reviewed H/L content and exact accepted decision/baseline record in tracked
target docs; explicit manual bootstrap checks. A code slice is still not executed.
Validation: every H/L accounted for, source anchors resolve, unresolved decisions
remain visible, no 'approved' field substitutes for authority.
Allocation: specification of all Hs, not implementation of their software behavior.

### ASSURANCE-1 — Baseline admission on the real dispatch path

Prerequisite: ASSURANCE-0 accepted. Initial code slice built by the old runner;
the manager performs/records the not-yet-implemented gate checks manually.
Implement: bounded catalog/manifest parsing and pure eligibility plus the actual
pre-dispatch guard in targetRelayLoop; wire through existing CLI/store boundaries.
Correct only the new-target local-state scaffold needed for this run.

Output: proposed --baseline <manifest> entry path refuses an invalid baseline
before provider dispatch and prints the exact prerequisite failure. Valid input
reaches the builder. This is **baseline admission only**, not full assurance.
The option is proposed and does not exist today; final grammar belongs to D-FORMAT.
Persist the required baseline so omission on resume cannot drop the guard.

Allocation: 001-L01/L02/L04/L06; 004-L01/L02/L06; 008-L01/L02/L04.
Checks: fake-provider call count zero on invalid input; live CLI negative against an
isolated own-repo fixture; valid normalized request; current typecheck/tests and
legacy dry-run routing parity. No unused standalone validator is accepted.

### ASSURANCE-2 — Reviewed inputs and identical role context

Prerequisite: accepted ASSURANCE-1 runner. Use its baseline guard to build this increment.
Implement: requirements-authoring/review postures in existing role transport,
structured per-ID review validation, snapshot delivery of shared/role/governance
inputs, context identity in run records, and operator baseline-approval recording.
Do not rely on unsupported vendor-native outputSchema.

Output: a real requirements refinement is reviewed as a document; a missing L result
blocks baseline acceptance; both builder/reviewer records identify the same input
baseline and actual shared instructions. Demonstrate with the next increment's
requirements, not an unrelated toy alone.

Allocation: remaining 001; 002; 004-L03; 007-L01/L02/L04/L05/L06; 009-L01/L02.
Checks: omitted/unknown IDs, missing prompt, source mutation, same-provider identity
disclosure, legacy prompt/argv parity. Approval of a document cannot dispatch code.
This still does not claim the later evidence/completion gate exists.

### ASSURANCE-3 — Evidence-linked implementation review

Prerequisite: accepted ASSURANCE-2 runner and its recorded baseline/review.
Implement: slice allocations/check plans, structured evidence records, per-obligation
completion checks, preservation continuity, and correct candidate identity including
in-scope untracked files. Wire to actual implementation review acceptance, not only
a reporting command.

Output: an own-repo implementation with a passing unrelated test or failed preservation
check is rejected despite STATUS: approved. A correctly evidenced candidate reaches
the appropriate acceptance handoff, not an invented human approval.

Allocation: 003-L01/L03/L05/L06; 004-L04/L05; 005-L01–L05/L07; 007-L03.
Checks: candidate mutation after tests/review, not-run versus failed infrastructure,
out-of-scope hunk, misleading name, ungrounded fixture, and valid end-to-end consumer.
Core checks stay headless; filesystem/CLI integration is tested separately.

### ASSURANCE-4 — Controlled acceptance and recovery

Prerequisite: accepted ASSURANCE-3 runner. The earlier gate reviews this increment.
Implement: target-aware approval/publication, typed blocked causes, baseline-change
handling, durable acceptance and idempotent recovery. Add only a needed
awaiting-acceptance state in the target relay; do not call it awaiting-ratification
if its contract is final implementation acceptance. Legacy done semantics stay unchanged.

Output: a human-decision block remains blocked on plain resume; infra retry passes
preflight; a stale approval is rejected; operator-authorized publication produces a
durable record without committing. Deleting local scratch does not erase acceptance.

Allocation: 005-L06; 006; 008-L06; 009-L05/L06/L07.
Checks: each blocker class, duplicate approval, wrong target/subject, interrupted
publication, stale candidate, clean-checkout reconstruction, full legacy regression.
Only after this stage can a full assured run contract be enabled under D-ADOPTION.

### ASSURANCE-5 — Manager-led trace, readiness, and complete dogfood

Prerequisite: accepted ASSURANCE-4 runner.
Implement: read-only eligibility selection and reverse trace/report integration
against roadmap/slices/check records; finish manager startup/report guidance.
Use the accepted runner to deliver this real capability on its own source tree.

Output: the manager selects eligible work, runs a bounded checkpoint, inspects records,
publishes approved evidence, and hands off a trace showing which obligation led to
which slice/check. A draft next item is refused with its prerequisite; no new daemon.
A proposed --assurance v1 contract may now represent the complete delivered gate set,
not merely early baseline checks.

Allocation: 003-L02/L04; 008-L03/L05; 009-L03/L04 plus integration of all Hs.
Checks: real positive chain, isolated negative set, another session's handoff inspection,
legacy external fixture unchanged, requirement coverage report, independent usefulness/
maintenance review. Promotion to MATURE needs explicit acceptance, not this document.

The manager may split any increment after inspecting concrete edit distribution.
Preserve each promised vertical output in the split; do not ship a library/schema
and defer its only consumer.

## 6. Self-hosting without circular assurance

1. Establish a clean or fully accounted-for Agent Manager target checkout. Keep the
   current known-good runner revision available in a separate checkout if useful.
2. The human-started manager reads [MANAGER.md](../MANAGER.md), records both roots,
   verifies model authority and provider readiness, and selects the approved work.
3. Use relay-target pointed at Agent Manager. Do not switch to the legacy relay
   merely because its command is named 'self-host'. The source process loaded at
   launch cannot begin enforcing code it has just written.
4. Run ASSURANCE-0 as document work through the existing mechanism. Record manual
   review/approval boundaries honestly; this does not qualify a new runtime gate.
5. Bootstrap ASSURANCE-1 with the old runner and the accepted specification. Inspect
   its diff and tests independently, then operator-commit the accepted deliverable.
6. Run a fresh process from that accepted revision for ASSURANCE-2; record runner
   revision and gate set. Repeat this predecessor-builds-successor pattern.
7. Require typecheck, tests, and legacy dry-run parity before a relay change is used.
   Run at most three build/review cycles before manager checkpoint; a dry run is only
   invocation evidence, not proof of state-machine behavior.
8. Keep sabotage/malformed/stale cases in disposable fixture targets. Never alter the
   real accepted baseline merely to prove that the new gate can reject corruption.
9. The final real delivery is ASSURANCE-5's trace/readiness capability, built using
   ASSURANCE-4's accepted admission/evidence/acceptance mechanisms.
10. A separate reviewer assesses actual outputs and maintenance cost. For a standalone
    no-tools review, inline self-contained evidence per the existing prompt contract.
    The manager records its own product judgment separately from that review.

Early run records must say exactly which gates were manual, admission-only, or not
yet available. Do not relabel their history 'v1 assured' after later code ships.

## 7. Decisions required before code

These matrices enumerate the material choices within this proposed local-file,
existing-relay scope; they do not claim every possible engineering architecture.

The human approved the recommended choices on 2026-09-11; see the linked authorization.
The option matrices are retained as decision rationale, not pending decisions.
New contradictions must be surfaced separately.

DECISIONS_RATIFIED:

### D-FORMAT — Machine-readable records without duplicate specifications

ID: D-FORMAT

Problem: prose alone cannot support deterministic admission, but a parallel machine
requirements database would create two sources of truth. Current H files are not
a ratified parser format.

| Option | Product reward | Risk / cost |
|---|---|---|
| Markdown + small JSON metadata; JSON manifests/reviews/evidence (recommended) | Human-readable obligations and deterministic identity/links in the same records | Must define a deliberately narrow grammar and validate unknown fields/versions |
| YAML frontmatter + Markdown | Familiar authoring conventions | Parser/dependency surface and YAML interpretation must be accepted |
| All-JSON requirements | Unambiguous machine structure | Less comfortable engineering prose review; can encourage duplicate prose copies |
| Prose only | Minimal syntax | Gates remain model judgments; no deterministic link/baseline contract |

Recommendation: first row; define exact fields and parser behavior in ASSURANCE-0.
Do not create unused schemas or a generic document parser.

### D-AUTH — Who can approve what

ID: D-AUTH

Problem: reviewer approval says a document/candidate meets its contract; it does
not establish that a new product decision was authorized.

| Option | Product reward | Risk / cost |
|---|---|---|
| Human/operator-recorded baseline and final approval (recommended initially) | Explicit accountable authority while the process is being shaped | More human acceptance points |
| Explicitly delegated manager approval for a bounded class | Human attention reserved for consequential decisions | Delegation scope and subject identity must be precise; manager cannot invent it |
| Reviewer automatically approves everything | Less handoff | Unratified product choices may become binding; unsuitable for authority-class decisions |

Recommendation: first row initially; ratify narrowly scoped delegation later.
Record actor, subject, scope, decision, and review basis; no signatures/identity service
is proposed. A repository administrator can edit files: this is not a tamper-proof system.

### D-ADOPTION — Enforce new gates without silently breaking old targets

ID: D-ADOPTION

Problem: immediate default enforcement blocks existing projects lacking the records;
automatic detection can silently downgrade when a file disappears.

| Option | Product reward | Risk / cost |
|---|---|---|
| Explicit baseline opt-in, persisted per run; full assured contract after gates ship (recommended) | Controlled adoption and honest predecessor-based dogfood | Managers must opt in; legacy launches remain possible and must be clearly labelled |
| Require new contract for all new launches immediately | Uniform admission policy | Breaks existing operator workflows; migration prerequisite |
| Infer assurance from a folder's presence | Fewer flags | Missing/malformed files can turn into accidental legacy fallback |

Recommendation: explicit persisted contract; CLAUDE requires it for new self-build
once delivered/ratified. This is workflow governance, not a security boundary against
an operator intentionally choosing legacy. A future default change needs separate approval.

### D-DISPATCH — Where requirements review runs

ID: D-DISPATCH

Problem: the existing relay has no requirements phase; its large core enum does not
drive actual routing. Reusing a builder does not mean reusing implementation permission.

| Option | Product reward | Risk / cost |
|---|---|---|
| Distinct document/implementation work items through existing roles, plus real prerequisite and final-acceptance gates (recommended) | Reuses the proven loop and persistent manager method | Need explicit artifact kind and reviewed record contract; manager coordinates preparation |
| Add dedicated requirements/design phases now | More automatic activity routing | Larger migration and state-machine surface before variation is demonstrated |
| Only instruct the implementation builder to plan first | Minimal code changes | No independent pre-code gate; cannot satisfy the proposed methodology |

Recommendation: first row. Add a named awaiting-acceptance state only when its real
behavior ships; never overload an existing state with misleading semantics.

### D-EVIDENCE — What survives local cleanup

ID: D-EVIDENCE

Problem: local logs aid monitoring but disappear; hashes with no retained content
cannot support later review. Committing every trace is expensive and may disclose secrets.

| Option | Product reward | Risk / cost |
|---|---|---|
| Durable minimal evidence/decisions plus content identities; raw logs local (recommended) | Reconstructible acceptance with bounded repository growth | Define required excerpts and redaction/retention; cannot promise full replay from omitted traces |
| All raw traces committed | Maximum local record availability | Size, privacy, noise, and accidental credential retention |
| Only local logs and status words | Little repository overhead | Acceptance cannot be reconstructed reliably; fails file-backed assurance intent |

Recommendation: first row. No arbitrary external link qualifies as durable evidence;
the intended reviewer must retain access to the actual supporting content.

## 8. Deferred scope and remaining uncertainty

No runtime code is changed by this document. Existing legacy state/comment mismatches,
unused core lifecycle values, duplicate historic debt IDs, and unrelated provider
defects are not opportunistically refactored. Address only the mechanisms needed by
an approved increment. Existing Copilot capability debt still applies.

Exact record grammar and checkpoint candidate-hash exclusions are ASSURANCE-0 refinements under the approved choices above; independent review still precedes code.
Do not market structural validity as correct requirements, a different model as
certification independence, or a passing smoke run as complete regression freedom.
