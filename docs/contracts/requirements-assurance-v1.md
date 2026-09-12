# Requirements Assurance v1 — stage-1 record contract

Status: PROPOSED by ASSURANCE-0; requires independent review and operator-recorded
acceptance before implementation. Maturity: PROTOTYPE. Version: 1. Date: 2026-09-11.

## 1. Purpose and enforcement level

This contract defines the smallest machine-readable input closure needed by
[ASSURANCE-1](../slices/assurance-1-baseline-admission.md) to refuse an invalid
requirements baseline before implementation dispatch. It refines the approved
[D-FORMAT and D-AUTH decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code)
without changing their authority model.

Version 1 stage 1 validates:

1. one H identity, its L identities and explicit L parents in each requirement file;
2. local source links and exact input bytes;
3. an acyclic manifest -> review -> approval chain produced during MANUAL BOOTSTRAP;
4. required decision IDs and the exact records that resolved them; and
5. an explicitly persisted `baseline-admission` mode before each provider dispatch.

It does **not** validate the semantic quality of requirement prose, structured
per-ID review coverage, implementation evidence, candidate identity, final
acceptance, change impact, typed recovery, or reverse trace. Those are the named
ASSURANCE-2 through ASSURANCE-5 increments. A stage-1 success means **baseline
admitted**, not “v1 assured”, software verified, accepted, or released.

The grammar is target-relative and project-independent: no Agent Manager path,
provider name, programming language, test framework, or other project's domain
rule is built into the record types.

## 2. Common lexical and validation rules

### 2.1 JSON and text

- JSON records and JSON metadata use UTF-8 JSON as defined by RFC 8259. A byte
  order mark is invalid. Numbers, comments, trailing commas and non-JSON values
  are not accepted where the exact record below does not permit them.
- Every object is **closed**: a member not listed by this contract is an
  `unknown-field` error. Every listed member is required unless explicitly
  marked optional.
- Duplicate object member names are a `duplicate-field` error before normal JSON
  decoding; last-member-wins behavior is forbidden. Duplicate identities, paths
  where a record below requires path uniqueness, exact source references, L
  entries, or decision IDs in an array are also errors even when their surrounding
  JSON members are unique. Dependency roles may repeat; each dependency path may
  not.
- Array order is part of the raw record bytes, but identity/coverage comparisons
  use sets after duplicate detection. An empty array is valid only where stated.
- Strings must not contain NUL. IDs are case-sensitive. A parser must not trim or
  case-fold an ID to make an invalid record pass.
- `formatVersion` is the JSON integer `1`. Any other integer is
  `unsupported-version`; a missing/wrongly typed version is `invalid-field`.
- `kind` must equal the literal specified for that record. Another value is
  `unsupported-kind`; a missing/wrongly typed kind is `invalid-field`.
- Timestamps, where present, are UTC RFC 3339 strings in the form
  `YYYY-MM-DDTHH:mm:ss.sssZ`. They are provenance, never content identity.

### 2.2 Identifiers

| Name | Rule |
|---|---|
| H ID | `^[A-Z][A-Z0-9-]*-REQ-[0-9]{3}$` |
| L ID | exact parent H ID followed by `-L[0-9]{2}` |
| record/baseline/project/actor/decision/run ID | `^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$` |

An ID is stable identity, not an approval or completion state. Retired IDs remain
reserved and are never reassigned.

### 2.3 Target-relative paths

A `path` is a POSIX-style path relative to the target repository root supplied to
`relay-target`:

- it is non-empty, does not start with `/`, and uses `/`, never `\`;
- every segment is non-empty and is neither `.` nor `..`;
- it contains no NUL; and
- resolving the existing file through symlinks must remain within the real target
  root followed by a path separator (or equal the root, where a directory is
  explicitly allowed). A symlink that escapes is `path-escape`.

The selected manifest itself and every referenced record must satisfy the same
containment rule. Stage 1 reads regular files only. An absent path is `missing`;
permission denial is `unreadable`; other I/O failures retain an `io-failure`
cause. These outcomes are never converted to empty content.

This containment check is a checkpoint guard, not a hostile-administrator or
time-of-check/time-of-use security claim. The implementation hashes the bytes it
actually read and revalidates at every dispatch.

### 2.4 Content references

Every `ContentRef` has exactly:

```json
{
  "path": "docs/example.md",
  "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

`sha256` matches `^sha256:[0-9a-f]{64}$` and is SHA-256 over the file's raw bytes,
with no line-ending, Unicode, whitespace, or final-newline normalization. A byte
change is a `digest-mismatch`. Git revision and filesystem timestamps are not
substitutes for this digest; Git HEAD alone omits uncommitted and untracked input.

### 2.5 Failure reporting

Validation is fail-closed. For a successfully read JSON record, including the
delimited JSON metadata in a requirement file, diagnostic continuation depends
on whether that record parses unambiguously:

- an unambiguously parsed record returns all independently discoverable
  structural errors, so one readable error does not hide another;
- malformed JSON or any duplicate object member name rejects that record and
  stops deeper field, identity and cross-record diagnostics that would depend on
  decoding it; the applicable `malformed-json` and/or `duplicate-field` errors
  are still reported; and
- a duplicate-key record is never decoded with last-member-wins semantics for
  validation or admission. Repairing malformed or duplicate-key JSON may expose
  additional errors on a later validation pass.

Stopping at one ambiguous record does not discard errors already collected from
other unambiguously parsed records, but validation need not discover records or
identities reachable only by decoding the ambiguous record.

Each reported error includes:

- stable code: `missing`, `unreadable`, `io-failure`, `path-escape`,
  `malformed-json`, `metadata-delimiter`, `duplicate-field`,
  `duplicate-identity`, `unknown-field`, `invalid-field`,
  `unsupported-version`, `unsupported-kind`, `digest-mismatch`,
  `source-not-found`, `source-ambiguous`, `heading-mismatch`, `parent-mismatch`,
  `review-not-accepted`, `approval-not-approved`, or `subject-mismatch`;
- the record path;
- a JSON Pointer when the error is in JSON, otherwise the relevant Markdown line;
  and
- both locations for a duplicate identity/path.

No provider is called when the selected manifest or its upstream content closure
fails. If selection is needed, a selected slice/allocation mismatch may be known
only after the read-only selector returns; that mismatch permits zero **builder**
calls. The [ASSURANCE-1 packet](../slices/assurance-1-baseline-admission.md)
states the ordered guard points explicitly.

## 3. Requirement Markdown record

### 3.1 Delimited metadata

Each H requirement file starts at byte zero with exactly one block:

```text
<!-- requirements-assurance-v1
{<one JSON object>}
-->
```

The opening and closing delimiters occupy their own lines. The JSON object begins
on the next line and ends immediately before the closing delimiter. Another
opening delimiter, a missing delimiter, text before the opening delimiter, or
non-whitespace between the JSON object and closing delimiter is a
`metadata-delimiter` error. The Markdown prose begins after the delimiter; it is
the sole statement of behavior and verification criteria.

### 3.2 Metadata object

The object has exactly these fields:

| Field | Type | Contract |
|---|---|---|
| `formatVersion` | integer | `1` |
| `kind` | string | `requirement` |
| `requirementId` | H ID | identity of this file |
| `sources` | non-empty `SourceRef[]` | origins of the H |
| `lowLevelRequirements` | non-empty `LowLevelRef[]` | L identities and parents in this file |

A `SourceRef` has exactly `kind`, `path`, and `fragment`:

```json
{
  "kind": "document-section",
  "path": "docs/VISION.md",
  "fragment": "traceability-model"
}
```

`kind` is `document-section`. `path` follows section 2.3. `fragment` matches
`^[a-z0-9]+(?:-[a-z0-9]+)*$`. It resolves to a Markdown ATX heading by removing
the heading's leading `#` characters and surrounding whitespace, lowercasing
ASCII letters, removing ASCII punctuation other than spaces and hyphens, changing
each run of spaces to `-`, and collapsing repeated `-`. Duplicate matching
headings are `source-ambiguous`. This is the
v1 local-document source type; external URLs and free-form source prose are not
machine source identities.

A `LowLevelRef` has exactly:

```json
{
  "id": "AM-REQ-001-L01",
  "parentId": "AM-REQ-001"
}
```

The parser also performs the deliberately narrow Markdown checks below; it does
not interpret arbitrary prose:

- the first H1 after metadata must start `# <requirementId> —`;
- every H3 beginning `### <H-ID>-L<two digits> —` is an L declaration;
- the set of those H3 IDs must equal `lowLevelRequirements[*].id`; and
- every `parentId` must equal `requirementId` and the L prefix.

Across a manifest, requirement IDs and L IDs are globally unique. The metadata
does not repeat statements, criteria, status, evidence, or approval.

### 3.3 Valid example

```markdown
<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "EX-REQ-001",
  "sources": [
    { "kind": "document-section", "path": "docs/VISION.md", "fragment": "problem" }
  ],
  "lowLevelRequirements": [
    { "id": "EX-REQ-001-L01", "parentId": "EX-REQ-001" }
  ]
}
-->
# EX-REQ-001 — Example

### EX-REQ-001-L01 — Observable rule
```

Invalid examples include an unlisted `status` member (`unknown-field`), version
`2` (`unsupported-version`), two `EX-REQ-001-L01` entries
(`duplicate-identity`), parent `EX-REQ-002` (`parent-mismatch`), or a metadata L
absent from the H3 headings (`heading-mismatch`).

## 4. Baseline manifest

### 4.1 Location and acyclic identity chain

A manifest lives at
`docs/requirements/baselines/<baselineId>.json`. It identifies only upstream
input bytes. It does not reference its review or approval, so it cannot hash
itself through a downstream record.

For stage-1 deterministic lookup, its downstream records have fixed locations:

- `docs/assurance/<baselineId>/requirements-review.json`; and
- `docs/assurance/<baselineId>/baseline-approval.json`.

The review binds the manifest; the approval binds the manifest and review. The
graph is therefore `manifest -> input files`, `review -> manifest`, `approval ->
manifest + review + authority/decision records`. No record contains its own
digest. The `--baseline` argument names the manifest path; fixed downstream paths
avoid a registry or repository-wide search.

### 4.2 Exact manifest object

```json
{
  "formatVersion": 1,
  "kind": "requirements-baseline-manifest",
  "baselineId": "ASSURANCE-1-INPUT-1",
  "target": {
    "projectId": "agent-manager",
    "root": "."
  },
  "requirements": [
    {
      "path": "docs/requirements/am-req-001-target-owned-requirements.md",
      "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
  ],
  "dependencies": [
    {
      "role": "source",
      "path": "docs/VISION.md",
      "sha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
    },
    {
      "role": "source",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "sha256": "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012"
    },
    {
      "role": "allocation",
      "path": "docs/slices/assurance-1-baseline-admission.md",
      "sha256": "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
    }
  ],
  "requiredDecisionIds": ["D-FORMAT", "D-AUTH", "D-ADOPTION", "D-DISPATCH", "D-EVIDENCE"]
}
```

The manifest object has exactly the seven fields shown. `target` has exactly
`projectId` and `root`; `root` is the literal `.` and means the actual target root
passed to the command, while `projectId` is a stable declared ID, not proof of
repository ownership. Each `requirements` item is exactly a `ContentRef`.

Each `dependencies` item has exactly `role`, `path`, and `sha256`. `role` is one
of `source`, `governance`, `design`, or `allocation`. A path occurs exactly once
across `requirements` and `dependencies`; one file cannot be represented twice
under different roles in v1. Arrays `requirements` and `dependencies` are
non-empty. `requiredDecisionIds` may be empty but cannot contain duplicates.

Every requirement metadata source path must occur exactly once in the manifest's
input closure: either as a `requirements` item or as a `dependencies` item with
role `source`. A path already present in `requirements` therefore satisfies a
source reference without a duplicate `dependencies` entry. A dependency carrying
another role does not satisfy a source reference. The active work item's
`SLICE_DOC` must occur with role `allocation`. Additional approved parent/design/
governance inputs use their matching role. Stage 1 does not infer the closure from
Markdown links.

For example, if `docs/requirements/ex-req-001.md` contains a heading whose fragment
is `ex-req-001`, this source on another requirement is valid when that path already
appears once in `requirements`:

```json
{
  "kind": "document-section",
  "path": "docs/requirements/ex-req-001.md",
  "fragment": "ex-req-001"
}
```

Adding the same path to `dependencies` with role `source` is invalid because one
file would then have two content references (`duplicate-identity`). Omitting the
path from `requirements` and listing it only with role `governance` is also invalid
(`source-not-found`); a single `dependencies` entry with role `source` is valid.

### 4.3 Invalid manifest examples

| Input/fixture | Required result |
|---|---|
| `{"formatVersion": 1,` | `malformed-json` at the manifest path |
| add `"futureEvidence": []` | `unknown-field` at `/futureEvidence` |
| set `"formatVersion": 99` | `unsupported-version` |
| repeat one raw `"kind"` member | `duplicate-field` before ordinary decoding |
| repeat an H/L ID or referenced path in an array | `duplicate-identity` with both locations |
| reference a file removed from the fixture | `missing` naming that path |
| use `../outside.md` or `/absolute.md` | `path-escape` before the outside file is read |
| use `windows\\path.md` | `invalid-field` because v1 paths use `/` only |
| make `docs/linked.md` a symlink to a file outside the real target root | `path-escape` |
| change one referenced raw byte | `digest-mismatch` |
| omit a metadata source from both `requirements` and role-`source` `dependencies` | `source-not-found` |
| repeat a source path in `requirements` and role-`source` `dependencies` | `duplicate-identity` with both locations |
| list a source path only as a non-`source` dependency | `source-not-found` |
| use dependency role `evidence` | `invalid-field`; later-stage fields are not accepted |

A missing or malformed review/approval is an admission error, not permission to
treat the manifest as a legacy run.

## 5. MANUAL BOOTSTRAP review record

Stage 1 consumes one exact, operator-published record of the independent review.
It validates structure, declared distinct author/reviewer run IDs and identities,
subject identity, and result. It does **not** verify that those declarations came
from separate provider invocations, parse the prose report into per-ID coverage,
or independently judge semantic adequacy. During MANUAL BOOTSTRAP, the manager
verifies actual invocation separation from the launched processes and run records;
ASSURANCE-2 replaces the manual per-ID coverage posture with a structured contract.

```json
{
  "formatVersion": 1,
  "kind": "manual-requirements-review",
  "reviewId": "ASSURANCE-0-REVIEW-1",
  "subject": {
    "path": "docs/requirements/baselines/ASSURANCE-1-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "author": {
    "role": "builder",
    "provider": "codex",
    "model": "gpt-5.6-sol",
    "effort": "high",
    "runId": "build-ASSURANCE-0-0"
  },
  "reviewer": {
    "role": "reviewer",
    "provider": "codex",
    "model": "gpt-5.6-terra",
    "effort": "high",
    "runId": "review-ASSURANCE-0-0"
  },
  "result": "accepted",
  "completedAt": "2026-09-11T20:00:00.000Z",
  "report": "Verbatim final reviewer report retained for manual-bootstrap audit."
}
```

The object has exactly the nine fields shown. `subject` is a `ContentRef`.
`author` and `reviewer` each have exactly `role`, `provider`, `model`, `effort`,
and `runId`; their role literals are as shown, every other string is non-empty,
and their `runId` values must differ. Same-provider review is valid but remains
visible in these fields. `result` is `accepted`, `rejected`, or
`decision-required`; only `accepted` is admissible. `report` is the non-empty
reviewer final artifact copied without claiming that stage 1 validated its IDs.

## 6. Baseline approval record

The operator publishes this record only after review and resolution of the
manifest's required decisions. The approving actor may be the human or an
operator acting under an explicit authority basis; the record must say which.

```json
{
  "formatVersion": 1,
  "kind": "requirements-baseline-approval",
  "approvalId": "ASSURANCE-1-BASELINE-APPROVAL-1",
  "subject": {
    "path": "docs/requirements/baselines/ASSURANCE-1-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "review": {
    "path": "docs/assurance/ASSURANCE-1-INPUT-1/requirements-review.json",
    "sha256": "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
  },
  "decision": "approved",
  "approvedBy": {
    "actorType": "operator",
    "actorId": "in-place-manager"
  },
  "recordedBy": {
    "actorType": "operator",
    "actorId": "in-place-manager"
  },
  "authorityBasis": {
    "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "resolvedDecisions": [
    {
      "id": "D-FORMAT",
      "record": {
        "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
        "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      }
    }
  ],
  "decidedAt": "2026-09-11T20:05:00.000Z",
  "rationale": "Accepted after the recorded independent review."
}
```

The object has exactly the twelve fields shown. `subject`, `review`, and
`authorityBasis` are `ContentRef`s. `approvedBy` and `recordedBy` each have
exactly `actorType` (`human` or `operator`) and `actorId`. `decision` is
`approved` or `rejected`; only `approved` is admissible. `rationale` is non-empty.
Each `resolvedDecisions` item has exactly `id` and `record`; its `record` is a
`ContentRef`. The set of resolved decision IDs must equal the manifest's
`requiredDecisionIds` set. Stage 1 checks content identity and presence; it does
not infer a decision from prose omitted by the authorized recorder.

For admission, `subject` in both downstream records must equal the selected
manifest's root-relative path and raw-byte digest. The approval's `review` must
equal the fixed review path and its raw-byte digest. Every authority/decision
record must exist, match its digest, and remain under the target root. Any
mismatch is `subject-mismatch` or `digest-mismatch`; editing a status line cannot
manufacture approval.

## 7. Persisted stage-1 selection

Legacy is represented by the **absence** of an `assurance` member in the existing
local target-relay status. Baseline admission is represented by this complete
object, never by a boolean plus nullable fields:

```json
{
  "contract": "requirements-assurance/v1-stage1",
  "enforcement": "baseline-admission",
  "manifest": {
    "path": "docs/requirements/baselines/ASSURANCE-1-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  }
}
```

All three fields are required and closed. On the first assured invocation,
`--baseline <target-relative-manifest-path>` validates the whole chain before it
is persisted. On resume, the persisted object is authoritative even when the
flag is omitted; the relay reloads and revalidates the same path and digest.
Supplying a different path/digest is a blocked conflict. A malformed or partially
present object blocks; it never falls back to legacy. A run with neither a flag
nor a persisted object normally follows unchanged legacy behavior and prints
`legacy (requirements assurance not enforced)`.

Stage 1 persists the same mode object in the active slice `status.json` and the
active `current.json` pointer. A mismatch blocks; the duplicate is limited to the
minimum needed to stop an implicit resume from losing assurance when the slice
status is malformed. These local records are operational continuity, not durable
approval; durable authority remains the tracked chain above.

There is one narrow compatibility exception to otherwise unchanged legacy
routing. During implicit dispatch, an existing malformed `current.json` or a
readable current pointer whose referenced `status.json` is missing or malformed
blocks before any provider call, whether or not either record declares assurance.
The relay must not silently select different legacy work from a corrupted active
pointer. This refusal stops unsafe dispatch; it does not by itself require a human
decision or stop evidence-based manager investigation and recovery. Valid legacy
state still resumes or routes exactly as before.

If the entire local state directory, including both records, is absent, stage 1
cannot reconstruct or claim the position of an interrupted run. That distinct
case remains deferred to ASSURANCE-4; any explicit recovery or new run must use
the available durable evidence and pass its applicable admission again.

## 8. Ordered admission algorithm

When `--baseline` is supplied, baseline-specific steps 1–5 below run before
implicit dispatch checks the active local pointer and its referenced status as
section 7 requires. Malformed/dangling active state returns a refusal with zero
selector, builder, or reviewer calls, including in legacy mode. Absence of an
active pointer retains the established fresh-selection path and is not presented
as reconstruction of a lost run.

Before any provider call when `--baseline` is supplied, and before every provider
call when an assured status already exists:

1. validate/contain/read the manifest and compute its raw-byte digest;
2. validate all manifest fields, uniqueness, file containment and file digests;
3. parse each requirement metadata block; validate headings, IDs, parents and
   local source fragments; validate global H/L uniqueness;
4. derive, read and validate the fixed manual review and approval records;
5. verify their subject/review chain, authority bytes and decision-ID closure;
6. when a slice is already known, require its `sliceDoc` to equal an
   `allocation` dependency; then persist/reuse the assured status; and
7. only then compose and invoke the applicable provider request.

For a fresh assured selection, steps 1–5 run before the selector, then step 6
runs on its result before any builder. The same closure is reread for review
dispatch; a changed byte blocks. Reads used for one validation attempt are held
as in-memory byte snapshots so one check does not validate different reads of
the same path.

## 9. Deferred record contracts

The following are deliberately **not** v1 stage-1 fields or parser behavior:

| Deferred increment | Contract still to define with its consumer |
|---|---|
| ASSURANCE-2 | structured per-H/L review results, findings and composed-context identity; operator baseline publication command |
| ASSURANCE-3 | slice allocation schema, check plan/evidence, candidate identity and completion predicate |
| ASSURANCE-4 | final acceptance, change/delta records, typed blocker/recovery records and atomic durable publication |
| ASSURANCE-5 | reverse trace/readiness report and full `--assurance v1` claim |

Unknown fields intended for those stages are rejected today rather than silently
stored. Later contracts require a new supported version or kind and the accepted
migration/adoption rule. Stage 1 adds no schema registry, generic document parser,
database, package, provider-specific gate, or dormant lifecycle state.

## 10. Verification obligations for ASSURANCE-1

Pure in-memory tests exercise JSON/metadata parsing, exact fields, duplicate keys
and identities, versions/kinds, parent/heading/source closure, digest matching,
review/approval binding and exhaustive error rendering. For requirement,
manifest, review and approval records, malformed or duplicate-key JSON must be
rejected without harvesting deeper identities or field diagnostics from the
ambiguous record; unambiguously parsed objects must retain aggregate diagnostics,
including a readable duplicate identity alongside an unrelated structural error.
Disposable filesystem tests separately exercise missing/unreadable files,
traversal, symlink escape, root containment and reread mutation. Use-case tests
inject stub providers and assert call counts: invalid initial closure -> zero
provider calls; allocation mismatch after fresh selection -> zero builder calls;
valid closure -> exactly the expected request. CLI tests invoke the built entry
point on a disposable target and check the emitted enforcement label and reason.

Legacy regression tests run without `--baseline` and compare the existing
selection/build/review request shape, phase outcome, provider/model/permission
routing and dry-run output except for the explicitly approved legacy label and
the narrow corrupted-active-state exception in section 7. They additionally
assert that malformed active current state and a current pointer to missing or
malformed status produce zero implicit provider calls in legacy mode, while an
intact legacy state resumes unchanged. A recovery fixture preserves an interrupted
assured slice's partial work, repairs only operational state justified by retained
records, and explicitly resumes that same slice; admission is revalidated before
the next provider call. No test may invoke a real provider or the operator's live
target state. These are ASSURANCE-1 verification obligations, not claims that this
document amendment executed them.

## 11. Earned structures

- Requirement metadata block — current users: the nine H files and ASSURANCE-1
  admission; variation: exact H/L/source identities across target projects;
  rejected alternative: parse arbitrary prose, because headings alone cannot
  distinguish source/parent links deterministically.
- Baseline manifest plus manual review/approval chain — current users:
  ASSURANCE-1 admission and the in-place manager's bootstrap publication;
  variation: exact approved input revisions and actual authority actors; rejected
  alternative: an editable `approved` status flag, because it binds no bytes or
  independent review.
- Persisted assurance object — current users: first dispatch and resume in the
  existing target relay; variation: explicit legacy versus baseline-admission
  operation; rejected alternative: infer mode from file presence, because a
  missing file would silently downgrade the run.

These are record types at already approved storage/workflow boundaries. No new
package, service, adapter registry, or provider abstraction is introduced.
