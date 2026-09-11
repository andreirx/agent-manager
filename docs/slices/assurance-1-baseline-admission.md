# ASSURANCE-1 — Baseline admission on the real dispatch path

Status: PREPARED (not self-authorizing). Eligibility is established only after
ASSURANCE-0 independent review is accepted and the manager publishes the exact
manifest/review/approval chain. Maturity: PROTOTYPE implementation slice.

Authority: [2026-09-11 human authorization](../assurance/ASSURANCE-0/human-authorization.md).
Design/grammar: [Requirements Assurance v1 stage 1](../contracts/requirements-assurance-v1.md).
Parent rollout: [ASSURANCE-1](requirements-assurance-rollout.md#assurance-1--baseline-admission-on-the-real-dispatch-path).

## 1. Intended outcome and acceptance boundary

Add an explicit `--baseline <target-relative-manifest-path>` entry to the
existing `relay-target` command. On the real `targetRelayLoop` path:

- an invalid input closure is refused before **any** provider call and the CLI
  prints the exact failing record/cause;
- a fresh selection whose `SLICE_DOC` is not the manifest's approved allocation
  is refused after selection but before the builder (zero builder calls);
- a valid approved closure reaches the expected provider request;
- the selected manifest identity and `baseline-admission` enforcement survive
  resume even when the flag is omitted; and
- a run with no flag and no persisted assurance selection follows the existing
  legacy routing and reports its limited enforcement honestly.

This is baseline admission only. It must not print or persist `v1 assured`,
`verified`, `accepted`, or any equivalent full-methodology claim. This outcome
serves the [VISION](../VISION.md#traceability-model) by binding dispatch to
inspectable target-owned bytes while preserving the existing role/provider relay.

### Eligibility gate for this packet

After ASSURANCE-0 review, the manager must publish and record the exact identities
of:

- manifest: `docs/requirements/baselines/ASSURANCE-1-INPUT-1.json`;
- manual review: `docs/assurance/ASSURANCE-1-INPUT-1/requirements-review.json`;
- approval: `docs/assurance/ASSURANCE-1-INPUT-1/baseline-approval.json`; and
- the accepted ASSURANCE-0 reviewer/manager record identities.

Absence, draft state, digest mismatch, unresolved review findings, or an
unresolved decision keeps this packet ineligible. The ASSURANCE-1 builder does
not author or approve those prerequisites. Exact digests live in the acyclic
review/approval chain and the manager's operational selection packet, not in this
slice document: the manifest hashes this document as its allocation input, so
embedding the manifest's own digest here would create a circular identity.

## 2. Requirement allocation

### Implements in this increment

- AM-REQ-001-L01, AM-REQ-001-L02, AM-REQ-001-L04, AM-REQ-001-L06
- AM-REQ-004-L01, AM-REQ-004-L02, AM-REQ-004-L06
- AM-REQ-008-L01, AM-REQ-008-L02, AM-REQ-008-L04

For AM-REQ-004-L02, stage 1 verifies the manually reviewed input/decision chain
and that the active `SLICE_DOC` is the manifest's `allocation` dependency. It
does not claim ASSURANCE-2 structured review coverage or ASSURANCE-3 structured
allocation/evidence gates. The accepted allocation bytes are frozen and checked;
their semantics must have been manually reviewed during bootstrap before this
packet becomes eligible.

### Preserves

| ID | Existing contract to preserve | Evidence source / regression oracle |
|---|---|---|
| P-A1-01 | Without `--baseline` and without persisted assurance state, select -> implement -> review routing, phase results, model/provider/permission choices, retry/cycle behavior, and decision-review trigger remain unchanged. | `docs/contracts/target-owned-relay.md`; existing `relay-target.test.ts`; normalized stub requests and dry-run invocation lines before/after. |
| P-A1-02 | `--supervisor` still selects and reviews; it is not renamed or represented as the persistent manager. | CLAUDE.md authorization and `src/cli/relay-target.ts`. |
| P-A1-03 | Provider-specific argv and prompt delivery remain in adapters; admission does not branch on provider names or call a real provider in tests. | ARCHITECTURE sections 3/8; adapter request tests and dry-run parity. |
| P-A1-04 | The existing decision-review path and `DECISION_REQUIRED` behavior remain additive and unchanged. | `docs/contracts/target-owned-relay.md`; all existing decision-review tests. |
| P-A1-05 | A missing optional shared prompt continues to warn-and-run in legacy mode; stage-1 baseline validation does not claim ASSURANCE-2 instruction snapshot enforcement. | `src/cli/relay-target.ts`; legacy CLI test/dry run. |
| P-A1-06 | No command commits, deploys, installs over an operator environment, launches overlapping writers, or migrates existing target records. | Current relay contract; inspection plus isolated tests. |
| P-A1-07 | Existing target `.agent-manager/` scaffolds are not rewritten. Newly created scaffolds make the whole local directory invisible to Git and describe it as local-only. | `ensureScaffold` write-if-absent behavior; new-target filesystem test and existing-scaffold preservation test. |

### Not implemented here

All remaining Ls, especially structured per-ID review (ASSURANCE-2), structured
slice/check/evidence and candidate completion (ASSURANCE-3), final acceptance and
typed recovery/change publication (ASSURANCE-4), and reverse trace/full assurance
(ASSURANCE-5). No status enum is added for a later gate.

## 3. Risk and design basis

Impact is consequential because this changes pre-dispatch eligibility, persisted
local run state, and reads across the filesystem boundary. Once independently
reviewed and operator-accepted, the
[stage-1 contract](../contracts/requirements-assurance-v1.md) is the pre-code
design note. No new product decision remains for the builder after that gate.

### Policy, orchestration and mechanism

1. `src/core/assurance.ts` holds pure closed record types and pure parsing/
   eligibility functions. It receives raw byte snapshots and plain path facts;
   it performs no filesystem, Git, provider or clock calls. Expected validation
   failures are a discriminated error sum and every renderer exhaustively handles
   its variants. `targetRelayLoop` imports this policy file directly; the increment
   does not add an otherwise-unused export to the existing core barrel.
2. `src/application/use-cases/relay-target.ts` orchestrates ordered admission at
   entry, after fresh selection, before build, and before review. It persists the
   exact assurance object in `status.json` and `current.json`, rejects conflicts,
   and supplies only admitted work to the existing request composition.
3. `ArtifactStorePort` gains the narrow contained-file snapshot operation needed
   by this use case. `FilesystemArtifactStore` implements raw-byte read,
   realpath/root containment and I/O error classification. Policy remains in core.
4. `src/cli/relay-target.ts` parses the target-relative `--baseline` value and
   injects the store. Live execution and assured dry-run both call the same local
   admission operation; only the live path persists state or invokes a provider.
   An assured dry-run requires an explicit preprepared `--slice <id>`, loads that
   slice's existing `status.json`, and validates its `SLICE_DOC`
   allocation before printing `baseline-admission` plus manifest identity. A dry
   run that has validated only the upstream closure must not call it admitted.
   Absent mode prints `legacy (requirements assurance not enforced)`.
5. `ensureScaffold` changes only the content generated for a **new**
   `.agent-manager/.gitignore`: `*` ignores that entire local operational tree.
   `writeIfAbsent` preserves every existing target scaffold.

The implementation may keep small parser helpers private in `assurance.ts`; it
must not add a generic JSON/schema framework. No dependency is added.

### Persisted mode behavior

`assurance` is absent for legacy or is the complete object from contract section
7. It is never a boolean plus optional manifest fields. The same object is written
to status and current pointer; a mismatch, malformed assured object, or current
pointer to a missing/malformed status blocks rather than selecting a legacy run.
If both local state files were deleted, recovery is outside stage 1 and no resume
claim is made; AM-REQ-006-L06 remains allocated to ASSURANCE-4.

### Guard ordering

1. CLI syntax/target checks.
2. If `--baseline` is supplied for live execution, validate the manifest's entire
   content/authority chain (contract algorithm steps 1-5) before fresh selection
   or another provider call. Allocation admission is not yet claimed because a
   fresh selector's `SLICE_DOC` is not known.
3. Resolve explicit slice/resume/fresh selection through the existing flow. For
   assured `--dry-run`, require explicit `--slice`, load its preprepared
   status fixture through the same local admission path as live
   execution, and do not run selection or any provider.
4. When the slice is known, check that `sliceDoc` exactly names a manifest
   dependency with role `allocation`; only after this check may output say
   `baseline-admission`. Live execution persists/compares mode; dry-run performs
   no writes.
5. Immediately before each builder or reviewer call, reread and revalidate the
   whole chain. Drift blocks. Selection is the sole permitted earlier provider
   call when its returned allocation was not knowable in advance.
6. Legacy flow bypasses these new guards but prints the legacy limitation.

All files read within one validation attempt are immutable in-memory byte
snapshots for that attempt. No continuous immutability or hostile-writer claim is
made.

## 4. Files in scope

- `src/core/assurance.ts` (new pure stage-1 policy)
- `src/application/ports/artifact-store.ts` (contained raw-byte snapshot port)
- `src/adapters/filesystem/artifact-store.ts` (filesystem mechanism)
- `src/application/use-cases/relay-target.ts` (actual pre-dispatch wiring,
  persistence, new-target scaffold text)
- `src/application/use-cases/relay-target.test.ts` (pure/use-case/filesystem
  fixture coverage; split into an existing test convention only if test size
  requires it, without adding a framework)
- `src/cli/relay-target.ts` (flag, composition, truthful output)
- `docs/contracts/target-owned-relay.md` (document the additive stage-1 CLI and
  legacy boundary after code behavior exists)
- `.agent-manager/slices/ASSURANCE-1/build-progress.md` (local incremental report)

No other source, prompt, schema, package, root README, roadmap, legacy relay, or
target repository is in scope. A necessary extra file or dependency is a stop
condition, not implied permission.

## 5. Acceptance checks and oracles

All product invocations use a disposable target/state tree whose name begins
`ASSURANCE-1-`; no real provider is launched. The builder records each result
incrementally before moving to the next group and deletes owned disposable roots.

### A1-C01 — Pure grammar and policy

**Command:** the narrow Jest test file/pattern added for `assurance.ts`, then
`npm test -- --runInBand`.

**Oracle:** valid requirement/manifest/review/approval snapshots yield one
`baseline-admission` value; cases cover every required error code from contract
2.5, duplicate JSON keys before `JSON.parse`, unknown fields at every object
level, wrong/missing/type/version/kind, global H/L/path/decision duplicates,
parent/heading/source mismatch, stale subjects and unaccepted review/approval.
Source-closure cases accept a metadata source resolved by a single
`requirements` entry or by a single role-`source` dependency, and reject the
same path in both arrays, a path absent from both, or a path present only under
a non-`source` dependency role. No provider or filesystem is needed for these
pure cases.

### A1-C02 — Filesystem boundary

**Command:** targeted Jest filesystem cases, then the full Jest suite.

**Oracle:** disposable trees distinguish missing, unreadable and other I/O
failure as the platform seam permits; reject `..`, absolute/backslash and
symlink escape; accept a contained file; hash exact bytes; expose no framework or
filesystem object to core. A test that cannot induce host permission denial uses
the existing injected port/fake for `unreadable` and says so.

### A1-C03 — Use-case dispatch and resume

**Command:** targeted `targetRelayLoop` Jest cases, then full Jest.

**Oracle:** stub counts show (a) malformed/stale/missing initial baseline = zero
selector/builder/reviewer calls, (b) valid baseline + selection allocation
mismatch = one selector and zero builders, (c) valid prepared slice = exactly one
builder and one reviewer as the verdict requires, (d) digest mutation before
review = reviewer zero and blocked, (e) flag omission on resume revalidates the
persisted baseline, and (f) a conflicting flag or corrupted assured state blocks.

### A1-C04 — Running CLI, isolated

**Commands:** build with `npm run build`; invoke the fresh built CLI or the
project's `tsx` entry against the smallest disposable fixture using only stubbed/
non-dispatching negative paths. Run legacy `--dry-run` without assurance state.
Run assured `--dry-run --baseline <manifest> --slice <prepared-id>` against a
fixture whose existing slice status names the manifest's allocation;
also run it with a mismatched allocation and without explicit `--slice`.

**Oracle:** invalid baseline exits nonzero before provider execution and prints
error code + record. Valid assured dry-run prints `baseline-admission` and the
exact manifest digest only after the prepared slice allocation passes the same
local admission operation used by live dispatch. Mismatched allocation and an
assured dry-run without explicit `--slice` exit nonzero, print the specific cause,
and print no admission label; no dry-run writes state or invokes a provider.
Absent mode prints the legacy limitation. Planned legacy provider command, args,
cwd, mode, permission, model and prompt source remain byte-for-byte equal to the
captured pre-change routing lines apart from the added enforcement label.

### A1-C05 — Repository gates

Run synchronously on the fresh candidate:

```sh
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

**Oracle:** every command exits 0 without filtering its status. Inspect `git
status --short` for scope and inherited edits. There is no real-provider or
operator-environment E2E in this slice; the live boundary is the built CLI over a
disposable target and injected provider call counts.

## 6. Stop conditions

Stop and report rather than improvise if:

- the accepted ASSURANCE-0 manifest/review/approval chain is absent, stale,
  rejected, or names unresolved decisions;
- implementing the grammar reveals a contradiction with any approved H/L prose
  or requires changing the record shape/authority choice;
- a new package/dependency/module boundary, provider-specific assurance branch,
  future-stage record/state, or file outside section 4 appears necessary;
- valid absent-mode legacy routing cannot be preserved; or
- a test would require a real provider, the operator's live `.agent-manager`
  state, deployment, commit, or another repository.

## 7. Earned abstractions

- `assurance.ts` pure policy — current users: initial admission, resume and
  pre-review revalidation in `targetRelayLoop`; variation: closed stage-1
  eligibility outcomes over exact target snapshots; rejected alternative:
  duplicate conditionals in filesystem branches, because core tests would then
  require disk and the three guards could drift.
- shared local admission operation — current users: live `targetRelayLoop` and
  assured CLI dry-run; variation: effectful dispatch versus no-write/no-provider
  inspection over identical content and allocation rules; rejected alternative:
  a separate dry-run validator, because its verdict could drift from dispatch.
- contained-file snapshot port operation — current user: baseline closure loader
  in `targetRelayLoop`; variation/boundary: Node filesystem missing/read-failed/
  symlink-containment behavior; rejected alternative: importing Node filesystem
  APIs into core, which violates the documented dependency rule.

No new service, package, registry, adapter family, config layer, schema library,
or workflow engine is earned by this increment.
