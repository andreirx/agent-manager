# Requirements-based delivery — process proposal

Status: APPROVED process design; not yet the current relay state machine. Maturity: PROTOTYPE.
Date: 2026-09-11. [Human authorization](assurance/ASSURANCE-0/human-authorization.md) accepts the recommended rollout decisions; exact grammar and independent review precede code.

## 1. Purpose and actors

Serve [VISION](VISION.md): remove the human from transporting artifacts while
retaining human authority over consequential choices. Requirements, design,
implementation, and evidence remain inspectable in files and Git.

| Actor | Responsibility | Must not impersonate |
|---|---|---|
| Human | Product direction, consequential choices, delegated authority, final acceptance policy | A provider's agreement is not a human decision |
| Persistent manager session | Orient, prepare requirements/slices, assess readiness, launch relays, monitor, steer, coordinate acceptance and commits | Builder, independent reviewer, or human when recording their evidence |
| Builder invocation | Author the assigned requirements/design artifact or implement the assigned change | Its own independent reviewer |
| Reviewer invocation | Validate requirements/design or review implementation/evidence under its assigned posture | Human ratifier |
| Agent Manager runtime | Load files, check structural gates, route roles, retain records, enforce supported transitions | A semantic proof engine |

The existing CLI option --supervisor names the provider performing selection and
review, not the persistent manager session. No rename is applied in this proposal.
The manager can itself use any human-selected capable model; examples in conversation
do not change current builder/reviewer assignments or authorize automatic escalation.

SYSTEM.txt holds project-independent discipline and naming correctness. CLAUDE.md
is this repository's sole instruction entry point. This document proposes its
lifecycle reference. [MANAGER.md](MANAGER.md) describes the manager operating method.
Role prompts assign duties and output syntax; runtime checks enforce structural
prerequisites. Other targets retain their domain rules and technology conventions.

Only instruction consolidation, H/L file granularity, and authoring these documents
are settled here. Until each increment is accepted, follow current CLAUDE.md and
the target-relay contract. Label manual checks separately from automated enforcement.

## 2. Where records belong

Paths below are target-relative; in self-build the target is Agent Manager itself.
Never store another project's requirements in Agent Manager's own catalog.
FUTURE paths are proposals, not files created or machinery implemented in this pass.

| Record | Home | Purpose |
|---|---|---|
| General instructions | SYSTEM.txt here, selected explicitly as shared prompt | General discipline; not yet the CLI default |
| Project instructions | CLAUDE.md | Single local instruction source |
| Product intent | docs/VISION.md | Scope/outcomes, not detailed acceptance |
| H and its Ls | docs/requirements/am-req-NNN-title.md | Requirement wording |
| Catalog | docs/requirements/README.md | Navigation, not approval ledger |
| Delivery order | docs/ROADMAP.md | Slice order/prerequisites |
| Slice/design | docs/slices/<slice-id>.md | Allocation, approach, scope, preservation, checks |
| Input baseline | docs/requirements/baselines/<baseline-id>.json — FUTURE | Manifest of paths/content digests |
| Durable assurance records | docs/assurance/<work-item-id>/ — FUTURE | Reviews, approvals, verification, acceptance, necessary evidence |
| Manager handoff/progress | .agent-manager/slices/<ID>/ — local-only | Current operational position; no sole durable decisions |
| Raw logs | .agent-manager/logs/ — local-only | Diagnostics and detailed provider traces |
| Format contracts/templates | docs/contracts/ and templates/ — FUTURE additions | Added with the parser/routing that consumes them |

Proposed assurance records are requirements-review.json, baseline-approval.json,
verification.json, implementation-review.json, and acceptance.json, only when
the corresponding work exists. External evidence must be durable and accessible
to the intended reviewer; otherwise retain the necessary excerpt/output in tracked
records. Bulk raw traces need not all be committed.

The future layout/grammar is subject to D-FORMAT. Adoption must explicitly amend
older storage wording in ARCHITECTURE.md and the relay contract. An authorized
publisher may write designated tracked records; it must not auto-commit. This is
not permission for builders to write arbitrary tracked progress reports.

## 3. Proposed lifecycle

These are activities and gates, not a requirement for an enum member per activity.

### A. Need and requirements preparation

The manager records the actual request/source and prepares a bounded document
work item. The builder authors/refines H/L records and identifies derived proposals.
A requirement can originate in vision, a user request, a defect, or a system
constraint. Do not invent a vision citation to justify implementation convenience.

Inspect a defect's mechanism and affected behavior before selecting a fix. Code
is evidence, not an automatically correct specification. Preserve existing accepted
requirements by reference rather than rewriting them for each slice.

### B. Requirements and design validation

A separate reviewer receives the original need, all submitted obligations, source
evidence, and design where needed. It assesses correctness, necessity, scoped
completeness, consistency, feasibility, and verifiability. Per-ID results expose
omissions. The runtime validates coverage/shape, not semantic truth.

Small settled changes may use a short approach in the slice. Consequential or
uncertain changes need independent design review before dependent code work.
Review architectural placement against this project's actors and volatility, and
reject speculative abstractions. Naming is part of contract review.

The reviewer accepts the document, requests specific refinement, or surfaces
authority-level decisions. Human approval is not implied by reviewer acceptance.
The manager routes decisions and records who actually made each one.

### C. Approve a requirements/design baseline

Recommended initial policy: explicit operator-recorded human approval of each
new/amended input baseline, after independent review. Record manifest digest,
review outcome, resolved decisions, actor, and rationale. This is a local workflow
authority record, not a cryptographic identity or hostile-administrator defence.

Avoid self-referential digests: the manifest hashes source inputs; approval references
the manifest and review; the run references those records. Do not hash approval as
part of its own subject. Later delegation can be ratified explicitly.

### D. Allocate and select slices

Slices reference exact H/L IDs and a baseline, distinguishing implements, preserves,
and changes. They name acceptance boundary, file scope, exclusions, dependencies,
and verification owners/methods. The roadmap references slices without duplicating
requirement wording or declaring approval.

Selection remains read-only. Requirements authoring uses a separately authorized
document builder invocation, not a side effect of selection. Partial H delivery is
reported as partial. The manager checks readiness before buying another build cycle.

### E. Admit, implement, verify

Before each implementation invocation, validate the baseline, approvals, allocation,
design readiness, and delivered gate prerequisites. Give builder and reviewer the
same frozen authoritative context. Add prior findings without dropping the original
obligations. Failed reads are not valid empty documents.

The builder implements the bounded vertical change and records checks incrementally
in the assigned local report. Pure-policy tests use raw inputs/headless seams;
integration and system checks verify that delivered behavior uses the support logic.
The target's domain determines required environments and methods.

Evidence distinguishes pass, fail, not-run, and execution failure; it names performer,
method, expected/actual result, input/build identity, and retained output. An inspection
or analysis needs a falsifiable criterion, not an invented test count.

### F. Review and accept the candidate

The reviewer inspects requirements, preservation, code, test oracles, names, scope,
and earned architecture. It reproduces key checks when permitted and labels reliance
on builder evidence. New contradictory evidence may challenge an accepted requirement,
but cannot silently redefine it.

The completion check rejects stale subjects, incomplete mandatory evidence, and
blocking findings. A positive text verdict is insufficient. Final acceptance binds
the reviewed candidate and evidence, followed by operator-authorized publication
of durable records and a separately authorized commit.

Candidate identity covers reviewed code/tests/configuration, including relevant
untracked files. Exclude declared operational outputs and the acceptance record
being written, not arbitrary difficult-to-hash files. After commit verify that the
deliverable bytes still match. Release/deployment remains a distinct decision.

### G. Change or recover

A changed obligation produces a new baseline candidate and impact report, preserving
historical evidence. Inspect recorded descendants plus actual affected consumers.
Review the delta and changed assumptions; reusing unaffected evidence requires a
reason. Relaxed acceptance criteria need the corresponding authority.

Separate a refusal of unsafe implicit dispatch from a stop to investigation. The
manager first inspects available status and progress records, the worktree, approved
inputs, and owned processes. When that evidence establishes a non-destructive repair
within existing authority, the manager explains and records the cause/action, restores
only supported operational state, and explicitly resumes the same work. Admission is
revalidated before dispatch, and the builder continues preserved partial work rather
than restarting unnecessarily.

Ask the human only after that investigation reveals a consequential ambiguity or
missing authority, requires changing approved inputs, or makes recovery risk losing
work. Separate infrastructure retry from missing approval, stale inputs, and human
decisions; generic resume must not release the latter blockers. Missing local state
permits inspection of prior durable acceptance, not an invented run position,
approval, or continuation of interrupted work.

## 4. Current runner versus proposal

Today relay-target supports selection, build/review cycles, and optional post-artifact
decision review. It does not enforce the baseline/evidence gates above. Preparation
and reviews can initially use existing document-only slices and manager handoffs.
Add only transitions needed for real blocking and acceptance; do not activate the
unused full-lifecycle core enum as if it already drives this runner.

The [rollout design](slices/requirements-assurance-rollout.md) specifies the source
changes and staged enforcement. Reusing existing roles does not imply that today's
role prompts already perform complete requirements validation.

## 5. Acceptance of the methodology itself

- Exercise it on Agent Manager through relay-target, not merely in documents.
- Retain a real positive path: need, accepted requirements, code, evidence, acceptance.
- Exercise isolated negative cases demonstrating refused progression.
- Reconstruct accepted outcomes from committed target files.
- Preserve legacy behavior within the ratified migration boundary.
- Obtain independent product review of usefulness and maintenance cost, not just fields.
- Show a manager handoff that another session can follow without the prior conversation.

Authoring these documents does not satisfy those product acceptance criteria.
