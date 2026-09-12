<!-- requirements-assurance-implementation-v1
{
  "formatVersion": 1,
  "kind": "implementation-allocation",
  "workItemId": "ASSURANCE-3",
  "baselinePath": "docs/requirements/baselines/ASSURANCE-3-INPUT-1.json",
  "parentRequirementIds": [
    "AM-REQ-003",
    "AM-REQ-004",
    "AM-REQ-005",
    "AM-REQ-007"
  ],
  "implements": [
    "AM-REQ-003-L01",
    "AM-REQ-003-L03",
    "AM-REQ-003-L05",
    "AM-REQ-003-L06",
    "AM-REQ-004-L04",
    "AM-REQ-004-L05",
    "AM-REQ-005-L01",
    "AM-REQ-005-L02",
    "AM-REQ-005-L03",
    "AM-REQ-005-L04",
    "AM-REQ-005-L05",
    "AM-REQ-005-L07",
    "AM-REQ-007-L03"
  ],
  "preserves": [],
  "preservationObligationIds": [
    "P-A3-01",
    "P-A3-02",
    "P-A3-03",
    "P-A3-04",
    "P-A3-05",
    "P-A3-06",
    "P-A3-07",
    "P-A3-08"
  ],
  "changes": [],
  "acceptanceBoundary": "targetRelayLoop structured implementation review and freshly built relay-target CLI over an isolated target fixture",
  "candidatePaths": [
    "src/core/assurance.ts",
    "src/application/use-cases/relay-target.ts",
    "src/application/use-cases/relay-target.test.ts",
    "src/cli/relay-target.ts",
    "prompts/roles/builder-target.md",
    "prompts/roles/reviewer-target.md",
    "docs/contracts/target-owned-relay.md"
  ],
  "postReviewRecordPaths": [
    "docs/assurance/ASSURANCE-3/verification.json",
    "docs/assurance/ASSURANCE-3/implementation-review.json"
  ],
  "candidateExclusions": [
    { "pathPrefix": ".agent-manager/", "reason": "local relay state and raw run evidence" },
    { "pathPrefix": "logs/", "reason": "raw operational logs" },
    { "pathPrefix": "dist/", "reason": "reproducible build output" },
    { "pathPrefix": "node_modules/", "reason": "dependency installation outside the reviewed deliverable" }
  ],
  "checks": [
    {
      "checkId": "A3-C01",
      "obligationIds": ["AM-REQ-003-L01", "AM-REQ-003-L06", "AM-REQ-005-L01", "AM-REQ-005-L02"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand -t 'ASSURANCE-3 pure allocation, evidence and review policy'", "cwd": ".", "environment": "existing isolated dependency installation", "inputs": "closed valid and invalid record fixtures" },
      "expected": "exit 0; exact implement/preserve/change allocation, evidence-outcome, coverage, reference and aggregate rules accept valid fixtures and reject every named counterexample; a preservation-only allocation with explicit no-behavior-change checks is eligible without requiring a candidate edit"
    },
    {
      "checkId": "A3-C02",
      "obligationIds": ["AM-REQ-004", "AM-REQ-003-L01", "AM-REQ-004-L04", "AM-REQ-004-L05", "AM-REQ-005-L05", "P-A3-01"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand -t 'ASSURANCE-3 candidate identity and scope'", "cwd": ".", "environment": "disposable Git fixture", "inputs": "clean initial tree; persisted implementation base; tracked, staged, unstaged, deleted and in-scope/out-of-scope untracked files; same-porcelain/same-working-bytes/different-index and mode-only mutations" },
      "expected": "exit 0; a clean initial tree records its exact HEAD before builder dispatch; a pre-existing non-excluded change or later HEAD change is refused; canonical identity separately binds index state and working-tree state, changes when an index blob changes while porcelain status and working bytes stay fixed, changes for Git-relevant mode or in-scope byte/status changes, includes in-scope untracked files, rejects unsupported/conflicted or out-of-scope states, and ignores only declared operational exclusions"
    },
    {
      "checkId": "A3-C03",
      "obligationIds": ["AM-REQ-005", "AM-REQ-005-L01", "AM-REQ-005-L02", "AM-REQ-005-L05", "AM-REQ-005-L07"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand -t 'ASSURANCE-3 evidence outcomes and completion readiness'", "cwd": ".", "environment": "headless in-memory policy fixtures", "inputs": "passed, failed, not-run, execution-failed and unrelated-check records; empty and non-empty candidate checkpoints" },
      "expected": "exit 0; only a passed, planned, candidate-bound check covers its declared obligations; every other outcome remains distinct and prevents readiness; actual candidate entries and change justifications match exactly, including the valid empty/empty case, without treating an empty diff as proof of either success or failure"
    },
    {
      "checkId": "A3-C04",
      "obligationIds": ["AM-REQ-003", "AM-REQ-003-L05", "AM-REQ-003-L06", "AM-REQ-005-L03", "AM-REQ-005-L05", "P-A3-02", "P-A3-03"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand -t 'ASSURANCE-3 target relay evidence gate'", "cwd": ".", "environment": "stub providers and disposable target", "inputs": "clean first dispatch, pre-existing dirty refusal, persisted-base building resume, evidence-bound index-only drift on resume, two revise cycles, structured builder evidence and structured reviewer results; no-change preservation-only and no-change current-slice cases" },
      "expected": "exit 0; a clean target reaches the builder while a seeded non-excluded predecessor change yields zero provider calls; building resume preserves an in-scope partial candidate against the same base without reusing evidence, while evidence-bound resume rejects a changed staged blob even when porcelain status and working bytes are unchanged; the public relay rejects an unrelated pass and failed preservation check, retains original obligations/findings across revision, and records a fully covered stable candidate; a preservation-only no-change item can pass its explicit no-behavior-change checks, while this slice's no-change case returns for refinement when review observes that the required target-relay behavior is absent"
    },
    {
      "checkId": "A3-C05",
      "obligationIds": ["AM-REQ-005-L03", "AM-REQ-005-L04", "AM-REQ-005-L05", "AM-REQ-007-L03"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand -t 'ASSURANCE-3 implementation reviewer contract'", "cwd": ".", "environment": "stub reviewer with read-only request", "inputs": "grounded and invented fixtures, misleading names, unjustified paths and adapter/core placement cases" },
      "expected": "exit 0; accepted output covers every obligation/check/path and records reliance; ungrounded fixture, misleading new name, out-of-scope hunk, unearned abstraction or unsupported positive prose blocks"
    },
    {
      "checkId": "A3-C06",
      "obligationIds": ["AM-REQ-004-L04", "AM-REQ-004-L05", "AM-REQ-005-L02", "AM-REQ-005-L05", "P-A3-04"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand -t 'ASSURANCE-3 mutation and publication ordering'", "cwd": ".", "environment": "disposable filesystem/Git fixture with injected record-write failures", "inputs": "working-tree and index-only candidate mutations before review, during review and before publication; either fixed record path pre-existing; first- and second-write failure after a successful two-path preflight" },
      "expected": "exit 0; stale evidence/review never passes when either working-tree or index identity changes; both fixed paths are preflighted absent after the final identity recheck; a pre-existing-path collision writes neither record and replaces nothing; create-only writes occur verification then review; injected first- or second-write failure withholds review-activity completion and reports publication failure; any created subset or incomplete record bytes are unaccepted partial publication"
    },
    {
      "checkId": "A3-C07",
      "obligationIds": ["AM-REQ-003-L03", "AM-REQ-005-L07", "P-A3-05", "P-A3-06", "P-A3-07"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm test -- --runInBand", "cwd": ".", "environment": "repository test environment", "inputs": "complete deterministically enumerated Jest suite" },
      "expected": "exit 0; all stage-1, stage-2, legacy, decision-review and new stage-3 cases pass without changed legacy provider routing"
    },
    {
      "checkId": "A3-C08",
      "obligationIds": ["AM-REQ-005-L03", "AM-REQ-005-L05", "AM-REQ-005-L07", "P-A3-05", "P-A3-08"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm run build && npm test -- --runInBand -t 'ASSURANCE-3 built CLI evidence gate'", "cwd": ".", "environment": "fresh build and disposable target/prompt roots; no real provider", "inputs": "valid and sabotaged stage-3 CLI fixtures" },
      "expected": "both commands exit 0; valid CLI output reports reviewed-inputs plus candidate/evidence/review identities and an awaiting-operator-acceptance limitation, while each sabotaged invocation exits nonzero before a dependent provider plan"
    },
    {
      "checkId": "A3-C09",
      "obligationIds": ["AM-REQ-007", "AM-REQ-007-L03", "P-A3-08"],
      "owner": "builder",
      "method": { "kind": "inspection", "subject": "complete candidate diff and import graph", "criterion": "every changed path/hunk serves an allocated H/L or P obligation; core imports no adapter/CLI/filesystem/Git mechanism; no new package, module, dependency, registry or dormant support exists", "inputs": "git diff --check, git status --short, source imports and test consumers" },
      "expected": "inspection finds no unallocated hunk, cycle, dependency inversion violation, misleading new name or abstraction lacking a current consumer"
    },
    {
      "checkId": "A3-C10",
      "obligationIds": ["AM-REQ-005-L03", "AM-REQ-005-L07", "P-A3-08"],
      "owner": "builder",
      "method": { "kind": "command", "command": "npm run typecheck && git diff --check", "cwd": ".", "environment": "actual candidate working tree", "inputs": "TypeScript project and complete tracked/untracked deliverable set" },
      "expected": "both commands exit 0; no type or whitespace error and no extra deliverable path remains unexplained"
    }
  ]
}
-->
# ASSURANCE-3 — Evidence-linked implementation review

Status: PROPOSED implementation slice; requires structured requirements/design
review and operator approval of `ASSURANCE-3-INPUT-1` before code. Maturity:
PROTOTYPE. Date: 2026-09-12.

## 1. Outcome, authority and bounded claim

This slice implements the ASSURANCE-3 increment approved in the
[rollout](requirements-assurance-rollout.md#assurance-3--evidence-linked-implementation-review).
The existing target relay will bind a prepared implementation allocation, the
builder's check results, the complete changed-file candidate and a separate
implementation review before it accepts the **review activity**. A passing
unrelated test, failed preservation check, stale candidate, uncovered obligation,
unjustified changed path or bare `STATUS: approved` cannot pass this path.

The visible user outcome is an inspectable answer to: *which accepted obligation
authorized each change, what check was expected, what actually happened on which
candidate, and what did the independent reviewer inspect or rely on?* This moves
the human out of evidence transport while retaining the human/operator as the
later acceptance authority, directly serving VISION's file-backed traceability
and critic-independence principles.

The stage-3 success label is **implementation review ready for operator
acceptance**. It is not final implementation acceptance, full assurance,
qualification, release or deployment. ASSURANCE-4 remains responsible for the
`awaiting-acceptance` state, target-aware final approval, typed recovery/change
control and durable acceptance. Until that successor exists, the existing
`TargetPhase.done` may only mean that the provider review loop ended; it is not a
completion predicate. That legacy name is broader than its true semantics and is
surfaced here rather than renamed across stored states. Stage-3 CLI output must
print the narrower outcome and the missing operator-acceptance gate.

No new authority decision is proposed. D-FORMAT, D-AUTH, D-ADOPTION, D-DISPATCH,
D-EVIDENCE, D-A1-DIAGNOSTICS and A1-LEGACY-POINTER-BEHAVIOR remain unchanged.

## 2. Allocation and acceptance interpretation

The metadata block is the machine allocation and check plan. The prose explains
its contract; it does not duplicate requirement wording. The four
`parentRequirementIds` plus 13 `implements` L IDs are exactly the v2 baseline's
17 submitted review IDs. Parents are reviewed for consistency with the partial
increment but are not falsely listed as wholly implemented. `preserves` is empty
because this slice delivers new behavior; the separately identified P obligations
protect affected existing behavior. `changes` is empty: this slice changes relay
behavior under explicit reviewed-input operation but changes no approved H/L
statement. A later non-empty `changes` array is valid only when the selected
approved baseline already authorizes that changed obligation; stage 3 does not
implement requirement-change approval.

Contribution by obligation:

| Obligation | Stage-3 contribution and independent oracle |
|---|---|
| AM-REQ-003 / L01 | Closed slice metadata binds baseline, implements/preserves/changes, P obligations, boundary, candidate paths, exclusions and checks. Missing/duplicate/unknown allocation data blocks before builder; preservation-only work remains eligible through explicit preserved H/L IDs and no-behavior-change checks. |
| AM-REQ-003-L03 | Output reports this bounded slice only; no parent H or later roadmap item becomes complete. |
| AM-REQ-003-L05 | Every revise request is rebuilt from the original allocation plus the complete accumulated finding set; a later review cannot drop an original H/L, P or check. |
| AM-REQ-003-L06 | Every planned check names obligations and an independent expected assertion. Builder results and reviewer assessments must cover the declared sets exactly; an unrelated green command cannot cover an ID. |
| AM-REQ-004 / L04 / L05 | Candidate base, porcelain status, stage-0 index bytes/mode and regular working-tree bytes/mode are snapshotted after build and rechecked on resume, after review and before publication. In-scope untracked files participate; only explicit operational prefixes are excluded. Unsupported/conflicted nodes block. Records claim checkpoints, never continuous immutability. |
| AM-REQ-005 / L01 | Allocation fixes owner, method/command, environment, inputs and expected result before implementation admission. |
| AM-REQ-005-L02 | Evidence outcomes are an exhaustive sum: passed, failed, not-run or execution-failed. Runtime supplies actual run identity and candidate identity; provider claims remain labelled as such. |
| AM-REQ-005-L03 | A mandatory target-relay/CLI check proves the support is used at the acceptance boundary; pure policy remains headless and mechanism checks remain isolated. |
| AM-REQ-005-L04 | Structured review covers obligations, checks and changed paths; each check records reproduction or explicit reliance on builder evidence. |
| AM-REQ-005-L05 | Stage 3 implements baseline/candidate/check/finding readiness and refuses a positive verdict when any is missing. Operator final acceptance remains deliberately false, so stage 3 withholds the final completion claim and hands the exact candidate to stage 4. |
| AM-REQ-005-L07 | Output separately states review activity, verification evidence, operator acceptance and deployment. Unknown/unrun scope remains visible. |
| AM-REQ-007 / L03 | Review classifies core policy, application coordination and Git/filesystem/provider mechanisms using this project's real boundaries; speculative structure is a finding. |

The parent H assessments establish that the partial increment is consistent with
its H. They do not claim unsubmitted sibling Ls or the whole H are implemented.

## 3. Preservation obligations and impact boundary

| ID | Preserved behavior | Evidence / falsifier |
|---|---|---|
| P-A3-01 | Stage-1/v2 manifest, source, review, approval, containment, allocation and mutation admission remain byte-compatible. | Existing A1/A2 fixtures plus full suite; any changed error/label on an unchanged fixture fails. |
| P-A3-02 | Valid legacy and v1 implementation work retains prose `STATUS:` review routing, models, permissions, cwd, argv and limitation labels. | Captured normalized legacy/v1 requests and current decision-review tests. |
| P-A3-03 | V2 requirements-document author/reviewer routing, exact H/L coverage and create-only review/approval operation remain unchanged. | Existing A2-C01–C07 tests and accepted document fixture. |
| P-A3-04 | Common reviewed input equality and immutable adapter delivery receipts remain the gate before any stage-3 review result is considered. | Existing v2 provenance/mutation tests; stage 3 reuses, not replaces, those DTOs. |
| P-A3-05 | Reviewer stays read-only by default; no real provider, operator target, home artifact, install, commit or deployment is used by automated tests. | Captured request permissions and disposable-root inspection. |
| P-A3-06 | Decision-review still triggers only on decisions surfaced by this slice, and `awaiting-ratification` retains decision—not final acceptance—semantics. | Existing trigger/classification/integration tests. |
| P-A3-07 | Missing/malformed active state retains conscious-recovery refusal; stage 3 adds no automatic recovery or new resume authority. | Existing stage-1 recovery tests and source inspection. |
| P-A3-08 | Core policy imports no Git/filesystem/provider mechanism and no provider-name branch controls evidence eligibility. | Import inspection, parameterized stub-provider cases and typecheck. |

Impact analysis stops at the existing target-relay DTO/use case, its injected Git
tree observation, pure assurance policy, role prompts, CLI output and the sole
enumerated test file. All provider adapters already transport the stage-2 raw
snapshots and structured text unchanged; stage 3 requires no adapter or provider
port change. Provider internals, hostile concurrent writers and semantic code
indexing remain outside the claim.

## 4. Current implementation evidence and naming findings

Direct inspection of the inherited reviewed ASSURANCE-2 candidate at Git base
`322eba42b1687b15f288a2099af909207aa32211` found:

- `parseWorkItemPosture` recognizes admitted `IMPLEMENTATION` and enforces only
  `IMPLEMENT_OBLIGATION_IDS`; it has no check-plan or evidence contract.
- `runImplement` stores the provider's prose build artifact, then advances to
  `review-impl`; it does not identify a Git candidate or validate check outcomes.
- `runReview` selects strict JSON only for `REQUIREMENTS_DOCUMENT`. Every
  implementation review still uses `parseVerdict`, so positive prose can reach
  `done` without evidence coverage.
- `changedPaths` returns only best-effort path names for the decision-review
  trigger. It cannot bind bytes, staged state, deletions, base revision or
  in-scope untracked content.
- `inputProvenance` proves bytes Agent Manager delivered to a provider. It does
  not prove test execution or identify the candidate being reviewed.
- `FilesystemArtifactStore.readContainedFile` remains the bounded raw-byte
  mechanism for tracked assurance records. It does not expose staged blobs or
  non-following working-file modes, so the stage-3 observer obtains that paired
  candidate state at its explicit Git/filesystem mechanism seam instead of
  widening the record store contract.
- `relay-target.test.ts` supplies pure, stub-provider, disposable filesystem,
  built-CLI and legacy-capture seams. No new test facade is required.

Existing name mismatch: `TargetRunRecord` and `RunRecord` comments call local
records “authoritative”, but target-relay records live below gitignored
`.agent-manager/`. Their true contract is operational run provenance; durable
approval evidence lives in tracked target records. Renaming crosses stored/caller
boundaries and is outside this slice. New names below use the bounded terms
`candidateCheckpoint`, `implementationVerification` and
`implementationReview`; none implies final acceptance.

## 5. Exact stage-3 allocation grammar

The parser recognizes exactly one byte-zero block delimited by
`requirements-assurance-implementation-v1`, using v1 duplicate-key, UTF-8,
closed-object, path, ID and diagnostic-continuation rules. It is not a generic
Markdown parser.

The root fields are exactly those in this document's metadata. Arrays are
duplicate-free. `parentRequirementIds` contains each contextual parent H exactly
once. `implements`, `preserves` and `changes` each contain reviewed H/L IDs and
may individually be empty, but their union is non-empty and the three sets are
pairwise disjoint. That union equals the future implementation packet's existing
`IMPLEMENT_OBLIGATION_IDS` set; every member occurs in the admitted v2 manifest's
`reviewObligationIds`. The union of contextual parents and all three allocation
sets equals that manifest's review scope. `preserves` classifies existing H/L
behavior that the item must leave unchanged, including a legitimate
preservation-only or refactoring item; each such ID must be covered by a mandatory
check whose stated oracle makes the no-behavior-change duty explicit. `changes`
classifies only an intentionally changed obligation already authorized by the
selected approved baseline. Stage 3 does not approve requirement changes.
`preservationObligationIds` is non-empty and uses `^P-[A-Z0-9-]+$`. Every P ID
has a same-ID H3/table entry in this document.

`candidatePaths` and `postReviewRecordPaths` are non-empty, target-relative,
unique and disjoint. The former is the only deliverable path set the builder may
change; the latter is written create-only by Agent Manager after a successful
final recheck. Each exclusion is exactly `pathPrefix` plus non-empty `reason`;
prefixes are target-relative, end `/`, and match both the directory entry without
that terminal slash and its descendants. They may exclude operational/generated
trees only. An exclusion cannot contain or equal a candidate or post-review path.

Every check has exactly `checkId`, `obligationIds`, `owner`, `method` and
`expected`. Check IDs are unique; owner is `builder` or `reviewer` (all current
mandatory product checks are builder-owned). `obligationIds` is non-empty and
contains only allocated H/L or P IDs. The union across checks must cover every
allocated H/L and P ID. There is no optional-check flag: every listed check is
mandatory.

`method` is an exhaustive JSON sum:

```json
{ "kind": "command", "command": "npm test", "cwd": ".", "environment": "isolated fixture", "inputs": "named fixture set" }
```

or

```json
{ "kind": "inspection", "subject": "candidate diff", "criterion": "falsifiable statement", "inputs": "named records" }
```

All strings are non-empty. A method cannot carry fields belonging to the other
variant. This prevents a bare command from masquerading as an oracle.

## 6. Candidate checkpoint and Git mechanism

### 6.1 Starting-tree precondition and boundary value

The document-authoring target used by A2-C09 deliberately contains the frozen
14-path ASSURANCE-2 candidate while these two stage-3 input documents are being
reviewed. It is **not** an eligible stage-3 implementation target. After
ASSURANCE-2 and this input chain are accepted and operator-committed, the manager
must start ASSURANCE-3 in a checkout at that accepted predecessor revision with
no non-excluded Git changes. This clean-start rule is the bounded separation
between predecessor work and the stage-3 candidate; stage 3 never claims the
inherited ASSURANCE-2 diff as its own.

Immediately before the first stage-3 builder call, the application asks the
injected Git/filesystem observation boundary for one `CandidateTreeObservation`.
It contains the exact 40-hex HEAD and every porcelain-v1
`-z --untracked-files=all --no-renames` entry. For every changed path it also
contains two independent raw states: the stage-0 index entry, when one exists,
and the working-tree node, when one exists. The CLI mechanism executes the
bounded Git commands and non-following filesystem reads; pure policy sees only
the resulting DTO. After removing only paths under the declared operational
exclusions, the entry set must be empty. Otherwise admission blocks with the
changed paths and zero builder calls. A clean observation causes this
closed operational value to be persisted in the active slice status before the
builder is invoked:

```json
{
  "contract": "requirements-assurance/v3-candidate-tracking",
  "state": "building",
  "baseRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

The tracking value is a closed state sum. `building` carries only the contract,
state and base revision. After a builder result is validated against a captured
checkpoint, the application persists this alternative before any review call:

```json
{
  "contract": "requirements-assurance/v3-candidate-tracking",
  "state": "evidence-bound",
  "baseRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "candidateSha256": "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
}
```

`baseRevision` is the observed HEAD, not a content-approval substitute; the
already accepted v2 baseline binds the input bytes and the manager records which
predecessor was accepted. On resume, HEAD must equal the persisted base in either
state. `building` means no prior evidence may be reused; in-scope partial edits
may remain and are recaptured before a resumed builder continues them.
`evidence-bound` means the current observation must reproduce the exact persisted
checkpoint digest, including separate index and working-tree states, before a
review or publication action. Before a refinement builder is invoked, the relay
atomically returns tracking to `building` and invalidates the prior evidence
subject. A missing, malformed or unknown state after stage-3 work began blocks
implicit dispatch for conscious recovery; it never chooses a new base. This
preserves interrupted work without allowing evidence from one candidate to apply
to another.

After the builder exits, and on every later recheck, the application obtains a
new observation and requires the same HEAD. The concrete observer uses
`git status --porcelain=v1 -z --untracked-files=all --no-renames`,
`git ls-files --stage -z -- <changed paths>`, and `git cat-file --batch` for the
reported index blobs. It uses `lstat` plus a non-following read for each present
working-tree node. An ordinary candidate file has either no index entry or
exactly one stage-0 blob entry. Multiple index stages, a nonzero stage, a gitlink,
directory, device, socket or other unsupported node is an explicit invalid
candidate state; it is never collapsed to absence. A missing index entry is
valid for an untracked file or staged deletion, and a missing working node is
valid only when porcelain reports deletion. Symbolic links are rejected for
this slice rather than followed because all seven authorized outputs are regular
source/document files. Git process/read failures retain their failure cause and
block; an empty observation is not substituted.

For a present index state the observer retains the Git mode and hashes the raw
blob bytes with SHA-256. For a present working state it retains the Git-relevant
regular-file mode (`100644` or `100755`) and hashes the raw file bytes with
SHA-256. Thus an executable-bit change, an index-only blob change, and a working-
content change remain distinguishable even when the two-character porcelain
status itself is unchanged. Pure policy rejects duplicate/escaping paths,
malformed two-byte status, inconsistent present/absent combinations, paths
outside `candidatePaths`, and candidate paths concealed by an exclusion.
`candidatePaths` is an allowed maximum, not a demand for cosmetic edits: only
actual changed paths become checkpoint entries, and every such entry must be
justified. The entries array may therefore be empty. Its emptiness is neither
proof that an allocated outcome was delivered nor an automatic failure: a
preservation-only item may legitimately have no diff, while an `implements` item
still requires accepted obligation assessments and passed acceptance-boundary
checks. That semantic judgment belongs to the independent implementation review;
the runtime enforces the declared identities, exact coverage and outcomes rather
than inventing a minimum-diff rule. In-scope untracked files participate when
present; an untracked source outside scope blocks rather than disappearing from
`git diff`.

The checkpoint record is:

```json
{
  "contract": "requirements-assurance/v3-candidate-checkpoint",
  "baseRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "entries": [
    {
      "path": "src/core/assurance.ts",
      "porcelainStatus": "MM",
      "index": {
        "kind": "present",
        "gitMode": "100644",
        "stage": 0,
        "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "byteLength": 120
      },
      "workingTree": {
        "kind": "present",
        "gitMode": "100644",
        "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
        "byteLength": 123
      }
    },
    {
      "path": "docs/obsolete.md",
      "porcelainStatus": " D",
      "index": {
        "kind": "present",
        "gitMode": "100644",
        "stage": 0,
        "sha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
        "byteLength": 80
      },
      "workingTree": { "kind": "absent" }
    }
  ],
  "sha256": "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
}
```

Entries are sorted by raw UTF-8 path bytes. Each entry has exactly `path`,
`porcelainStatus`, `index`, and `workingTree`. Each state is the closed sum
`{"kind":"absent"}` or the present shape shown above; `stage` occurs only on a
present index and must be zero. `gitMode` is part of the identity, not descriptive
prose. `sha256` hashes UTF-8 compact JSON of exactly
`{contract,baseRevision,entries}` in that field order; it does not hash itself.
Index and working-tree present states use independent raw-byte SHA-256 and byte
length values. The record binds the Git-visible regular-file candidate at one
checkpoint. It does not identify ignored files, arbitrary filesystem metadata,
Git object-store bytes, or continuous immutability, and it makes no claim about
unsupported nodes that it refuses.

`changedPaths` is not silently widened: it remains for the legacy decision
trigger. A sibling injected `observeCandidateTree` supplies the richer Git and
regular-file DTO only for stage 3. This is a documented mechanism/test boundary
change and must be wired in the CLI composition root; no Git port package is
added.

### 6.2 Recheck order

1. Before the first builder, require a clean non-excluded observation and persist
   `building` with its HEAD. On resume require the same HEAD; recapture partial
   work in `building`, or require the complete checkpoint digest in
   `evidence-bound` before any dependent action.
2. Capture candidate after builder return; require the persisted HEAD, validate
   scope, and bind both index and working-tree state.
3. Validate and bind the builder result to that checkpoint, then persist
   `evidence-bound` with its digest before review.
4. Deliver allocation, candidate, evidence and original baseline to reviewer.
5. Capture again immediately after reviewer return; any index or working-tree
   mismatch blocks before the result is accepted.
6. Validate the structured review. Before a refinement builder call, persist
   `building` so the superseded evidence cannot be reused.
7. Capture a third time immediately before publication; any index or working-
   tree mismatch blocks.
8. Render the verification bytes and the implementation-review bytes that
   reference their digest, then preflight **both** fixed record paths as absent.
   A missing result for each is the only success; an existing, unreadable or
   otherwise indeterminate path refuses before either write and replaces nothing.
9. Call the injected `createTrackedFileExclusively` mechanism for
   `verification.json`, then for `implementation-review.json`. Its Node CLI
   implementation creates the parent and uses `writeFile` with `flag: 'wx'`;
   tests replace that same dependency to fail the first or second call
   deterministically. Only both successful writes permit the narrow
   review-activity completion output. A race, I/O failure or interruption after
   preflight may leave zero or one complete record, or incomplete record bytes;
   any created subset/incomplete pair is an **unaccepted partial publication**,
   not accepted paired evidence. When the write returns an error, report that
   publication failure and withhold completion; a process interruption produces
   no completion claim. Leave recovery/retry disposition to ASSURANCE-4 rather
   than deleting, overwriting or treating any individual file as success. No
   candidate or other post-review write occurs between the final recheck,
   preflight and these writes.

The reviewer remains read-only, but the rechecks detect another writer at those
checkpoints. They do not claim to prevent mutation between them.

### 6.3 Empty-checkpoint predicates and semantic boundary

The following counterexamples define the no-change contract without turning diff
size into a proxy for correctness:

| Case | Structural predicates | Semantic predicate | Result |
|---|---|---|---|
| Preservation-only item, no changed paths | `implements` and `changes` empty; `preserves` non-empty; allocation/packet sets match; explicit no-behavior-change checks pass; empty justifications and changed-path assessments exactly cover empty checkpoint | Reviewer accepts the preserved obligation and its check | Eligible for the review-activity handoff; no padding is required |
| This ASSURANCE-3 item, no changed paths, predecessor still lacks the evidence gate described in section 4 | Non-empty `implements`, all declared check/result and assessment IDs may still be structurally present | Reviewer observes A3-C04/A3-C08 acceptance-boundary behavior is absent and marks the affected obligation/check `refinement-required` | Aggregate refinement; no durable publication |
| Any item with all three H/L allocation sets empty | Allocation union does not match a non-empty packet/review scope | Not reached | Refused before builder |
| Any empty-checkpoint item with a missing/non-pass mandatory check or omitted obligation/check assessment | Evidence/readiness or exact-coverage predicate fails | Not needed to establish refusal | Refused before publication |

Thus the reviewer finding's proposed universal “non-empty `implements` implies a
non-empty checkpoint” rule is not adopted. It would reject the first valid case
and encourage cosmetic edits, while a non-empty diff would still not prove the
second case. The actual stage-3 no-change fixture is rejected by the required
acceptance-boundary assessment grounded in the observed predecessor behavior, not
by path count. A reviewer that incorrectly accepts evidence contrary to the
subject remains a review defect; structural validation cannot infer semantic truth
from the number of changed files.

## 7. Builder evidence result and durable verification

### 7.1 Provider result

For a v2-admitted implementation whose slice has the metadata contract, the
builder returns one JSON object and no leading `STATUS`, fence or trailing prose:

```json
{
  "formatVersion": 3,
  "kind": "implementation-evidence-result",
  "allocation": {
    "path": "docs/slices/assurance-3-evidence-linked-review.md",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "checks": [
    {
      "checkId": "A3-C01",
      "outcome": {
        "kind": "passed",
        "actual": "Jest exited 0; 12 assertions passed.",
        "supportingEvidence": [".agent-manager/slices/ASSURANCE-3/build-progress.md#A3-C01"]
      }
    }
  ],
  "changeJustifications": [
    {
      "path": "src/core/assurance.ts",
      "obligationIds": ["AM-REQ-005-L02"],
      "summary": "Adds closed evidence-outcome validation used by targetRelayLoop."
    }
  ],
  "limitations": [],
  "report": "All declared checks were attempted against the final working candidate."
}
```

The object is closed. `allocation` must equal the loaded slice bytes. Checks
cover every planned check exactly once. `changeJustifications` covers every
actual candidate entry exactly once and contains no other path; both arrays may
be empty together. Obligation IDs must be allocated H/L or P IDs. `limitations`
is an array of non-empty strings and `report` is non-empty. Neither an empty nor
a non-empty justification set substitutes for required check outcomes or the
reviewer's obligation judgment.

`outcome` is one of four closed variants:

```json
[
  { "kind": "passed", "actual": "observable result", "supportingEvidence": ["location"] },
  { "kind": "failed", "actual": "observed mismatch", "supportingEvidence": ["location"] },
  { "kind": "not-run", "reason": "why no attempt occurred" },
  { "kind": "execution-failed", "failure": "environment/tool failure before an oracle result" }
]
```

Each array member illustrates one alternative; an actual `outcome` is exactly
one object, never the array. No sentinel, nullable field or inferred pass exists. `supportingEvidence` is
non-empty for attempted checks. A provider-reported path is diagnostic evidence,
not automatic proof that a command ran; runtime records the actual builder run
identity and the reviewer states whether it reproduced or relied on the report.

### 7.2 Durable verification record

After accepted review and the last candidate recheck, Agent Manager constructs
`verification.json`; the provider cannot forge its actor or checkpoint fields:

```json
{
  "formatVersion": 3,
  "kind": "implementation-verification",
  "verificationId": "verification-ASSURANCE-3-0",
  "workItemId": "ASSURANCE-3",
  "baseline": {
    "path": "docs/requirements/baselines/ASSURANCE-3-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "allocation": {
    "path": "docs/slices/assurance-3-evidence-linked-review.md",
    "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
  },
  "candidateCheckpoint": {
    "contract": "requirements-assurance/v3-candidate-checkpoint",
    "baseRevision": "322eba42b1687b15f288a2099af909207aa32211",
    "entries": [
      {
        "path": "src/core/assurance.ts",
        "porcelainStatus": " M",
        "index": {
          "kind": "present",
          "gitMode": "100644",
          "stage": 0,
          "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          "byteLength": 120
        },
        "workingTree": {
          "kind": "present",
          "gitMode": "100644",
          "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
          "byteLength": 123
        }
      }
    ],
    "sha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
  },
  "performer": {
    "role": "builder",
    "provider": "codex",
    "model": "gpt-5.6-sol",
    "effort": "high",
    "runId": "build-ASSURANCE-3-0"
  },
  "checks": [
    {
      "checkId": "A3-C01",
      "obligationIds": ["AM-REQ-003-L01", "AM-REQ-003-L06", "AM-REQ-005-L01", "AM-REQ-005-L02"],
      "owner": "builder",
      "method": {
        "kind": "command",
        "command": "npm test -- --runInBand -t 'ASSURANCE-3 pure allocation, evidence and review policy'",
        "cwd": ".",
        "environment": "existing isolated dependency installation",
        "inputs": "closed valid and invalid record fixtures"
      },
      "expected": "exit 0; exact allocation, evidence-outcome, coverage, reference and aggregate rules accept valid fixtures and reject every named counterexample",
      "candidateSha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
      "basis": "provider-run-report",
      "outcome": {
        "kind": "passed",
        "actual": "Jest exited 0; expected cases passed.",
        "supportingEvidence": [".agent-manager/slices/ASSURANCE-3/build-progress.md#A3-C01"]
      }
    }
  ],
  "changeJustifications": [
    {
      "path": "src/core/assurance.ts",
      "obligationIds": ["AM-REQ-005-L02"],
      "summary": "Adds the closed evidence outcome used by the live relay."
    }
  ],
  "completedAt": "2026-09-12T18:00:00.000Z",
  "limitations": [],
  "report": "Runtime-bound copy of the validated provider evidence result."
}
```

The illustrative one-entry arrays stand for the complete validated sets. Each
check object has exactly the fields shown; `method` is copied byte-for-byte in
meaning from the allocation, `basis` is the literal `provider-run-report`, and
the outcome is the builder's closed result. Each change justification has exactly
the three shown fields. `performer` comes from the completed request/result, not
JSON prose. This binding states which final checkpoint the runtime associated
with the report; it does not claim Agent Manager independently observed command
execution.

## 8. Structured implementation review

### 8.1 Reviewer result

The reviewer receives immutable common v2 inputs plus role-specific allocation,
candidate checkpoint, complete diff, verification draft, build report and all
prior findings. It returns one closed object:

```json
{
  "formatVersion": 3,
  "kind": "implementation-review-result",
  "subject": {
    "candidateSha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
    "verificationSha256": "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012"
  },
  "result": "accepted",
  "obligationAssessments": [
    { "obligationId": "AM-REQ-005-L02", "result": "accepted", "findingIds": [], "decisionIds": [] }
  ],
  "checkAssessments": [
    {
      "checkId": "A3-C01",
      "result": "accepted",
      "findingIds": [],
      "verification": { "kind": "relied-on-builder-evidence", "limitation": "Reviewer inspected assertions and output but sandbox prevented an independent Jest run." }
    }
  ],
  "changedPathAssessments": [
    { "path": "src/core/assurance.ts", "result": "accepted", "findingIds": [], "decisionIds": [] }
  ],
  "findings": [],
  "decisions": [],
  "report": "Every allocated obligation, check and actual changed path was inspected."
}
```

Every allocated H/L and P ID occurs exactly once in
`obligationAssessments`; every planned check occurs exactly once in
`checkAssessments`; and every actual candidate checkpoint entry occurs exactly
once in `changedPathAssessments`, with no assessment for an unchanged allowed
path. The obligation and check arrays are non-empty. The changed-path array is
empty exactly when the checkpoint entries are empty. Assessment results use the v2 closed
`accepted | refinement-required | decision-required` meanings and reference
existing findings/decisions consistently.

Check `verification` is either:

```json
{ "kind": "reproduced", "outcome": { "kind": "passed", "actual": "independent observable", "supportingEvidence": ["review log location"] } }
```

where outcome uses the same four-way sum, or:

```json
{ "kind": "relied-on-builder-evidence", "limitation": "specific reliance and reason" }
```

The reviewer may rely on builder evidence, but cannot call that reproduction.
An accepted check assessment requires the implementation evidence outcome to be
`passed`; a reproduced non-pass requires refinement regardless of builder result.

A finding has exactly `findingId`, non-empty `obligationIds`, non-empty
`locations`, `category`, `evidence`, `consequence` and `requiredAction`.
Categories are `correctness`, `preservation`, `evidence`, `integration`, `scope`,
`naming`, `architecture` or `traceability`. Locations may name a path, check or
record pointer. Decisions retain the v2 risk/reward matrix and must reference
allocated obligations. The aggregate outcome follows v2 precedence: any decision
required, else any refinement required, else accepted. Positive prose cannot
override structure.

### 8.2 Runtime outcome

- Invalid builder/reviewer JSON or mismatched coverage blocks with specific
  diagnostics and no durable verification/review publication.
- Any failed, not-run or execution-failed mandatory check prevents reviewer
  acceptance; the runtime does not turn infrastructure failure into product fail
  or pass.
- `refinement-required` increments the cycle and sends the original allocation,
  every P/check, and accumulated findings back to the builder.
- `decision-required` follows the existing visible human-decision block. It does
  not manufacture authority or invoke another builder.
- `accepted` still requires baseline revalidation, a stable candidate, every
  mandatory check passed, exact obligation/check/actual-changed-path coverage and
  no blocking finding/decision. For each `implements` ID the reviewer must judge
  the delivered outcome at its declared acceptance boundary; for each `preserves`
  ID it must judge the explicit no-behavior-change evidence. An empty checkpoint
  satisfies no obligation merely by being empty, but it is not rejected solely
  for having no entries. This division is deliberate: software validates the
  record contract, while the separate reviewer supplies semantic judgment. An
  accepted result makes the two records eligible for the section-6.2 publication
  protocol; it does not itself complete the review activity.
- After the final candidate recheck, both fixed paths must preflight absent and
  both create-only writes must succeed before the runtime emits the narrow
  review-activity completion outcome. A deterministic collision publishes
  neither record. A post-preflight write failure is reported as publication
  failure; any created subset or incomplete bytes are explicitly an unaccepted
  partial publication and cannot satisfy the completion predicate. An abrupt
  interruption emits no completion claim.

The tracked `implementation-review.json` has this exact root shape (the array
members are the complete section-8.1 structures, not the shortened one-entry
sample):

```json
{
  "formatVersion": 3,
  "kind": "implementation-review",
  "reviewId": "review-ASSURANCE-3-0",
  "workItemId": "ASSURANCE-3",
  "baseline": {
    "path": "docs/requirements/baselines/ASSURANCE-3-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "allocation": {
    "path": "docs/slices/assurance-3-evidence-linked-review.md",
    "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
  },
  "subject": {
    "candidateSha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
    "verification": {
      "path": "docs/assurance/ASSURANCE-3/verification.json",
      "sha256": "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012"
    }
  },
  "reviewer": {
    "role": "reviewer",
    "provider": "codex",
    "model": "gpt-5.6-terra",
    "effort": "high",
    "runId": "review-ASSURANCE-3-0"
  },
  "independence": {
    "invocations": "separate",
    "providerDiversity": "same-provider"
  },
  "reviewerInputProvenance": {
    "contract": "requirements-assurance/v2-input-delivery",
    "roots": { "target": "/target/agent-manager", "prompt": "/runner/agent-manager" },
    "baseline": {
      "path": "docs/requirements/baselines/ASSURANCE-3-INPUT-1.json",
      "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    },
    "commonInputs": [],
    "roleSpecificInputs": [],
    "channels": []
  },
  "result": "accepted",
  "obligationAssessments": [],
  "checkAssessments": [],
  "changedPathAssessments": [],
  "findings": [],
  "decisions": [],
  "completedAt": "2026-09-12T18:05:00.000Z",
  "acceptanceStatus": "not-recorded",
  "report": "Implementation review passed; operator acceptance remains separate."
}
```

The three provenance arrays and three assessment arrays are shown empty only to
avoid repeating the v2 provenance and section-8.1 members. Actual provenance is
non-empty and copied from the completed review run; obligation/check assessments
are non-empty and complete. `changedPathAssessments` is complete but may be empty
when, and only when, the bound candidate checkpoint has no entries. The record references the
fixed verification path and digest, so the graph is baseline/allocation ->
verification -> review and remains acyclic. `acceptanceStatus` has only the
stage-3 literal `not-recorded`; it cannot be rewritten to approved. The later
acceptance record references this immutable review. The CLI prints:

```text
implementation review: accepted
verification: required checks passed for <candidate sha256>
operator acceptance: not recorded; ASSURANCE-4 gate not delivered
release/deployment: not performed
```

The existing `done` phase may terminate this stage-3 bootstrap loop, but neither
the records nor output calls the implementation accepted. ASSURANCE-4 replaces
that transitional use with its already allocated `awaiting-acceptance` state.
If a post-preflight write reports failure, the CLI instead identifies publication
failure and `review activity completion: withheld`; it lists any path the current
attempt successfully created as unaccepted partial publication. An abrupt process
interruption cannot promise an error message, but it also cannot emit the success
lines above.

## 9. Placement and smallest implementation

### Pure product policy — `src/core/assurance.ts`

Extend the existing file directly with allocation, checkpoint, evidence and
implementation-review sums/parsers plus readiness evaluation and exhaustive
error rendering. It receives raw DTOs and makes no filesystem, Git, provider or
CLI call. Do not add a schema library or generic Result framework.

### Application coordination — `relay-target.ts`

Load the allocated slice, preserve the original packet across cycles, require and
persist the clean implementation base before first dispatch, request later Git
observations against that base, select the structured implementation posture only
for a v2-admitted allocation, compose role inputs, validate results, compare the
separate index/working identities, preflight both post-review paths and invoke
the injected exclusive-create function twice in the specified order. Existing
document and legacy paths remain separate exhaustive branches.

### Mechanisms and composition — `src/cli/relay-target.ts`

Implement `observeCandidateTree` as the bounded deterministic Git/filesystem
routine in section 6.1 and wire it into the use case. It obtains porcelain state,
stage-0 index blobs/modes and non-followed working-file bytes/modes; it does not
decide eligibility. Wire `createTrackedFileExclusively` to the existing Node
`mkdir` plus `writeFile(..., {flag: 'wx'})` mechanism; it decides no completion
policy. The CLI only formats scoped stage-3 outcomes. Existing adapters, provider
port, filesystem port and run-record DTO need no change.

Role prompts describe the exact structured builder/reviewer duties and honest
evidence limits. The target-owned relay contract documents only behavior that
the implementation and tests deliver.

## 10. Earned structures

- **Implementation allocation metadata** — current users: stage-3 admission,
  builder packet composition and completion coverage; variation: implements,
  preserves and authorized behavior changes across real slices; rejected prose
  extraction because an omitted ID/check would not be deterministically visible.
- **Evidence and review outcome sums** — current users: builder result validation,
  reviewer routing and readiness; variation: passed/failed/not-run/execution-failed
  and accept/refine/decision states; rejected nullable fields because invalid
  combinations would be representable.
- **Candidate checkpoint value** — current users: evidence binding, reviewer
  subject and pre-publication drift check; variation: independent stage-0 index
  and regular working-tree content/mode across tracked, staged, unstaged, deleted
  and in-scope-untracked states; rejected Git HEAD, porcelain status or `git diff`
  alone because each can leave one of those states unidentified.
- **`observeCandidateTree` injected seam** — current users: live stage-3 candidate
  capture and disposable-Git tests; boundary: concrete Git/index/filesystem
  observation versus pure checkpoint policy; rejected direct mechanism calls in
  core/application and rejected widening decision-only `changedPaths` into a
  misleading byte-identity API.
- **Persisted candidate-tracking value** — current users: first stage-3 dispatch,
  interrupted in-scope resume and every identity recheck; variation: work that has
  no reusable evidence (`building`) versus evidence bound to one complete index/
  working checkpoint; rejected a base-only value because it cannot detect index-
  only drift before reusing evidence, and rejected process-local storage because
  an interrupted manager run would lose the candidate base/subject.
- **Verification and implementation-review records** — current users: stage-3
  operator handoff and stage-4 final acceptance input; variation: provider report
  versus runtime-bound subject/actor identity; rejected raw logs alone because
  local cleanup would erase the evidence needed by later acceptance.
- **Injected exclusive-create function on existing target-relay dependencies** —
  current users: stage-3 two-record publication and its deterministic first-/
  second-write failure tests; variation: Node's real create-only file mechanism
  versus injected I/O failure at either ordered call; rejected direct
  application-layer `writeFile`, because it crosses the existing mechanism
  boundary and provides no deterministic failure seam without mocking a module.

No new module, package, dependency, adapter, port interface, registry, database,
daemon, workflow phase or test facade is introduced.

## 11. Implementation scope and immutable inputs

Only the seven `candidatePaths` may be edited for runtime implementation. The two
post-review records are product outputs created by the delivered flow, not source
edits or candidate members. Operational progress stays under `.agent-manager/`.
No requirement H file, approved baseline/review/approval, v1/v2 contract,
architecture/process/roadmap, provider adapter/port, package manifest, schema,
template, README, legacy CLI or other repository is in scope.

`ASSURANCE-3-INPUT-1` and all of its dependencies are immutable implementation
inputs. It deliberately excludes every candidate and post-review path so the
authorized change cannot invalidate its own admission. The implementation runs
only after ASSURANCE-2 runtime acceptance and operator publication/commit of the
accepted predecessor plus this reviewed input chain. It starts in a clean checkout
of that revision, using a fresh process whose reviewed role-prompt bytes are
separately identified. The current A2-C09 authoring copy's 14 inherited changes
are therefore evidence used to design this slice, not part of the later stage-3
candidate. This prepared baseline does not by itself claim that prerequisite exists.

## 12. Ordered verification and system demonstration

The future builder updates
`.agent-manager/slices/ASSURANCE-3/build-progress.md` after each step:

1. Revalidate baseline, allocation and frozen input identities in a clean checkout
   of the operator-accepted predecessor revision. Assert zero non-excluded changes,
   persist the exact HEAD before builder dispatch, and refuse a seeded inherited
   change with zero provider calls.
2. Implement pure closed records/readiness and run A3-C01/A3-C03.
3. Wire candidate observation/scope and run A3-C02/A3-C06, including the
   same-porcelain/same-working-bytes/different-index fixture and mode-only cases.
4. Wire actual structured builder/reviewer routing and run A3-C04/A3-C05.
5. Run full Jest, typecheck, build and diff inspection (A3-C07–C10).
6. Exercise the freshly built CLI only against disposable fixtures: valid,
   unrelated pass, failed preservation, unrun, out-of-scope untracked, stale
   candidate and misleading-name/architecture reviewer findings. Include a
   preservation-only no-change positive case and a no-change ASSURANCE-3 case
   whose required public evidence-gate behavior is absent and therefore receives
   a substantive refinement assessment; neither outcome depends on minimum diff
   size.
7. Let the separate reviewer inspect the actual diff/evidence. Recheck the exact
   candidate, preflight both fixed record paths absent, and retain the two
   create-only records only after both writes succeed. Exercise a pre-existing
   second-path collision (neither write occurs) and an injected second-write
   failure (any created subset is reported as unaccepted partial publication and
   review-activity completion is withheld). Inject first-write failure as the
   other ordered case; it likewise emits no completion outcome, regardless of
   whether the filesystem mechanism left incomplete bytes.

Commands run synchronously without output pipelines. Automated tests use stub
providers and disposable Git roots; no provider process or operator-owned target
is touched. The real vertical demonstration is this own-repo ASSURANCE-3 change
being built and reviewed through the accepted stage-2 runner, with stage 3's own
new gate visible at the built CLI boundary on the isolated sabotage/positive
fixtures. Final operator acceptance remains the manager's separately recorded
bootstrap action until ASSURANCE-4 implements it.

## 13. Stop conditions and deferred scope

Stop dependent implementation rather than improvise if:

- this slice or its v2 candidate lacks accepted structured review and explicit
  operator baseline approval, or the ASSURANCE-2 runner is not accepted;
- the first implementation dispatch has any non-excluded Git change, the manager
  has not supplied the operator-accepted predecessor checkout, a resume's HEAD
  differs from its persisted candidate base, or an evidence-bound resume differs
  from its persisted index/working checkpoint;
- implementation needs to edit an immutable manifest dependency, H/L wording,
  settled D-* decision, or any path outside the seven candidates;
- a candidate cannot represent staged index and working-tree state separately,
  including modes, deletions and in-scope untracked files, without changing the
  documented Git/application boundary;
- a provider report would have to be treated as independently observed execution,
  a missing output as empty, or a non-pass as pass;
- the reviewer cannot receive the complete candidate diff/evidence or cannot
  report exact reliance without a provider-specific policy branch;
- publication would overwrite an existing record, precede final candidate
  recheck/two-path absence preflight, treat a partial pair as completed, hash
  itself, or imply operator acceptance;
- valid legacy, v1, v2 document, decision-review or conscious-recovery routing
  changes outside the explicit scoped output text;
- a new module/package/dependency/adapter/registry/schema service/test facade or
  workflow phase appears necessary; or
- validation would require a real provider in automated tests, operator state,
  install, commit, deployment or another repository.

ASSURANCE-4 retains final acceptance, atomic/idempotent publication recovery and
disposition/retry of a stage-3 unaccepted partial publication, typed blocker
recovery and controlled requirement change. ASSURANCE-5 retains
reverse trace/readiness, full dogfood and any full-assurance label. No work in
this slice may silently pull either forward.
