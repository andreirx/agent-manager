# Requirements Assurance v2 — reviewed inputs and delivered-context contract

Status: PROPOSED by ASSURANCE-2-PREP; document review and operator acceptance are
required before runtime implementation. Maturity: PROTOTYPE. Version: 2.
Date: 2026-09-12.

## 1. Purpose and bounded claim

This contract extends, and does not replace, the accepted
[stage-1 contract](requirements-assurance-v1.md). It defines the stage-2 records
and input-delivery behavior used by
[ASSURANCE-2](../slices/assurance-2-reviewed-inputs.md):

1. a separate requirements-authoring and requirements-review posture over the
   existing builder/reviewer transport;
2. a locally validated, structured review result covering every H and L
   explicitly submitted from a baseline candidate;
3. a target-aware operator operation that records approval of that exact
   reviewed baseline without dispatching a provider or committing;
4. immutable in-memory snapshots of the accepted baseline, shared instruction,
   role instructions, and target governance actually composed for an assured
   provider request; and
5. run provenance that distinguishes common authoritative inputs from
   intentionally different role material and records the bytes delivered through
   each provider channel.

The runtime validates record structure, content identity, coverage, outcome
consistency, and authority prerequisites. A substantive reviewer still judges
correctness, scoped completeness, consistency, feasibility, verifiability, and
necessity. A structurally valid review is not semantic proof. A same-provider,
different-model review is recorded as such; neither a different model nor an
editable `runId` is certification independence.

A stage-2 success means **reviewed inputs delivered**. It is not evidence or
candidate completion, final implementation acceptance, controlled change or
recovery, reverse trace, release, or the later full-assurance contract. Those
remain allocated to ASSURANCE-3 through ASSURANCE-5.

## 2. Relationship to published stage 1 and adoption

### 2.1 Unchanged records

The following v1 records and rules remain byte-for-byte contractual:

- `requirements-assurance-v1` Markdown requirement metadata;
- `formatVersion: 1` baseline manifests;
- `manual-requirements-review` v1 records;
- `requirements-baseline-approval` v1 records;
- `requirements-assurance/v1-stage1` persisted mode; and
- every v1 lexical, containment, duplicate-member, diagnostic-continuation,
  source, authority-chain, allocation, and legacy rule.

The stage-2 reader dispatches on an unambiguously decoded record's
`formatVersion` and `kind`. It continues to admit a published all-v1 chain only
as `baseline-admission`. It never rewrites, upgrades, or reports that chain as
stage 2. Malformed JSON, duplicate keys, a mixed v1/v2 chain, or an unsupported
version is an error, not a fallback to v1 or legacy.

A stage-2-capable runner may use the section-8 snapshot transport and record its
input provenance while executing work admitted by an unchanged v1 chain. That
transport improvement does not change the persisted v1 assurance object or its
`baseline-admission` label, and it does not claim the v1 manual review had v2
coverage.

The predecessor bridge uses a **new** operator-published v1 implementation
baseline for ASSURANCE-2; it neither reuses nor edits any published
`ASSURANCE-1-INPUT-*` record. Its role-`allocation` dependency is the accepted
`docs/slices/assurance-2-reviewed-inputs.md`. That document authorizes both the
runtime increment and its required real next-increment document demonstration.
The baseline closure contains the accepted requirements/design/governance inputs
listed by that packet, but contains no path the runtime increment is authorized
to modify. In particular, the target copies of
`prompts/roles/builder-target.md`, `prompts/roles/reviewer-target.md`, and
`docs/contracts/target-owned-relay.md` are outputs, not frozen dependencies.

For the ASSURANCE-2 implementation invocation, the starting common and role
prompt bytes come from the separately accepted runner snapshot named in the
manager handoff and provider run records; the explicitly selected shared
`SYSTEM.txt` comes from its recorded contained root. This is stage-1 bootstrap
provenance, not a retroactive v2 delivery claim. After the runtime candidate and
its prompt changes pass implementation review, the manager copies those exact
reviewed bytes into an isolated candidate runner and starts a fresh process from
that copy. That fresh runner supplies the changed builder/reviewer prompt bytes
to the real ASSURANCE-3 document demonstration and records them through sections
8 and 9. The unchanged v1 implementation baseline remains admissible because it
never froze the intended output paths.

The document bridge separates three paths that previously happened to share one
legacy name:

- `SLICE_DOC` remains the primary document the item will author and the existing
  decision-review discovery subject;
- `ADMISSION_ALLOCATION` names an already-existing role-`allocation` dependency
  of the accepted `--baseline` manifest; and
- `REVIEW_BASELINE` names the v2 candidate manifest the builder will create or
  refine and the reviewer will judge.

Before the document builder, the application validates the accepted baseline
closure without requiring either output to exist, reads the mandatory prepared
packet, and re-runs v1 allocation admission with `ADMISSION_ALLOCATION`. It does
not pass `SLICE_DOC` to that check. Before every later role call it repeats that
same admitted-allocation check. After the builder, it loads `REVIEW_BASELINE`
and its subject closure and requires the authored `SLICE_DOC` to be that
candidate manifest's role-`allocation` dependency. This preserves the v1 grammar
and guard rather than bypassing either one. The accepted review then produces
the first operator-approved v2 baseline; subsequent implementation against that
baseline adopts section 2.2.

### 2.2 Explicit stage-2 adoption

A stage-2 chain consists of:

- a v2 baseline manifest from section 4;
- the v1 requirement files and exact dependencies named by that manifest;
- one accepted v2 structured requirements review from section 6; and
- one approved v2 baseline approval from section 7.

`--baseline <manifest>` remains the explicit opt-in. The manifest version makes
the requested contract unambiguous. After the whole v2 chain and selected
allocation pass, the persisted object is:

```json
{
  "contract": "requirements-assurance/v2-stage2",
  "enforcement": "reviewed-inputs",
  "manifest": {
    "path": "docs/requirements/baselines/EXAMPLE-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "instructions": {
    "shared": {
      "root": "prompt",
      "path": "SYSTEM.txt",
      "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
    },
    "commonRole": [
      {
        "root": "prompt",
        "path": "prompts/system/base.md",
        "sha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
      }
    ],
    "selectorRole": [
      {
        "root": "prompt",
        "path": "prompts/roles/supervisor-select.md",
        "sha256": "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012"
      }
    ],
    "builderRole": [
      {
        "root": "prompt",
        "path": "prompts/roles/builder-target.md",
        "sha256": "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123"
      }
    ],
    "reviewerRole": [
      {
        "root": "prompt",
        "path": "prompts/roles/reviewer-target.md",
        "sha256": "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234"
      }
    ],
    "challengerRole": [
      {
        "root": "prompt",
        "path": "prompts/roles/decision-challenger.md",
        "sha256": "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345"
      }
    ],
    "rebutterRole": [
      {
        "root": "prompt",
        "path": "prompts/roles/decision-rebutter.md",
        "sha256": "sha256:789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456"
      }
    ]
  }
}
```

The persisted object is closed. Every field shown is required. Each instruction
reference is a `RootedContentRef` from section 3.2; each of `commonRole`,
`selectorRole`, `builderRole`, `reviewerRole`, `challengerRole`, and
`rebutterRole` is non-empty, has unique `(root,path)` pairs, and no pair occurs
in two arrays. `commonRole` contains instructions intentionally shared by every
target-relay role. The complete object is
written to both active `status.json` and `current.json`, as stage 1 does.

The first v2 invocation snapshots these instructions and persists their identities.
Resume without the CLI flag revalidates the same manifest and instruction refs.
A conflicting flag, missing instruction, changed byte, partial object, or v1/v2
mode mismatch blocks. A v2 chain never resumes as v1 or legacy. Existing valid
legacy and v1 states retain their exact labels and routing.

For `ARTIFACT_KIND: IMPLEMENTATION` under a v2 chain, the packet must contain one
non-empty `IMPLEMENT_OBLIGATION_IDS: <comma-separated-H/L-IDs>` line using the
same lexical/parser rules as section 5's review list. Every implementation ID
must occur in the manifest's reviewed `reviewObligationIds`; a missing, unknown,
duplicate, or unreviewed ID blocks before the builder. This is the minimum
stage-2 allocation guard needed to avoid treating contextual but unreviewed Ls
as authorized. Rich implements/preserves/changes/check-plan records remain
ASSURANCE-3.

The active selection packet is mandatory input for either v2 posture and for the
v1 predecessor document bridge. A missing or unreadable `selection.md` blocks;
the current best-effort conversion to empty text remains legacy-only.

## 3. Common v2 lexical values

Unless this document says otherwise, v2 inherits v1 section 2: UTF-8 JSON, no
BOM, no duplicate object member names, closed objects, no NUL, exact raw-byte
SHA-256, target containment, timestamps, diagnostic continuation, and stable
identity rules.

### 3.1 Additional identifiers

| Name | Rule |
|---|---|
| finding ID | v1 general ID |
| decision ID | v1 general ID |
| review ID / approval ID / run ID | v1 general ID |
| obligation ID | an H ID or one of that H's declared L IDs |

Every ID comparison is case-sensitive. Arrays described as sets are compared as
sets only after duplicate detection; their serialized order still contributes to
the containing record's digest.

### 3.2 Rooted content reference

A `RootedContentRef` has exactly:

```json
{
  "root": "prompt",
  "path": "prompts/roles/builder-target.md",
  "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

`root` is `target` or `prompt`. `target` means the real target root passed to
`relay-target`; `prompt` means the accepted runner's prompt root. `path` obeys v1
target-relative POSIX syntax relative to the selected root. Both roots are
realpath-contained independently. An absolute shared-prompt CLI value is accepted
for stage 2 only when its real file is contained by the target root or prompt
root and can be recorded relative to that root. It is recorded as `prompt` when
the two real roots are equal; containment by two different roots is an ambiguous
configuration and blocks. The self-host configuration may therefore select the
target's tracked `SYSTEM.txt` while provider role prompts come from a separate
accepted runner snapshot. This restriction does not alter legacy behavior.

### 3.3 Byte identity

A `ByteIdentity` has exactly:

```json
{
  "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "byteLength": 123
}
```

`byteLength` is a non-negative JSON integer and is the number of UTF-8 bytes in
the identified channel or input. It is diagnostic corroboration; SHA-256 remains
the content identity.

## 4. Version-2 baseline manifest

The fixed location remains
`docs/requirements/baselines/<baselineId>.json`. The v2 object adds one explicit
review-scope member to the v1 shape; `formatVersion` is the integer `2`:

```json
{
  "formatVersion": 2,
  "kind": "requirements-baseline-manifest",
  "baselineId": "EXAMPLE-INPUT-1",
  "target": {
    "projectId": "agent-manager",
    "root": "."
  },
  "requirements": [
    {
      "path": "docs/requirements/ex-req-001.md",
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
      "path": "docs/slices/assurance-3-evidence-linked-review.md",
      "sha256": "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123"
    }
  ],
  "reviewObligationIds": ["EX-REQ-001", "EX-REQ-001-L01"],
  "requiredDecisionIds": []
}
```

This valid-shape example assumes `ex-req-001.md` declares exactly one L
(`EX-REQ-001-L01`) and source headings in the two role-`source` dependencies.

The object has exactly eight fields: the seven v1 members plus
`reviewObligationIds`. All v1 manifest field, uniqueness, source-closure, role,
path, and location rules otherwise apply. Requirement files remain v1 Markdown
records. A v2 manifest is a baseline **candidate** until its fixed v2 review and
approval exist and pass. `reviewObligationIds` is a non-empty, duplicate-free
array. Every member must equal an H or L declared by a manifest requirement. If
an L is included, its parent H must also be included. The expected review coverage
set is exactly:

```text
set(manifest.reviewObligationIds)
```

IDs from those requirement files that are not submitted in
`reviewObligationIds` are available as context but require no assessment in this
review. This supports a real partial stage without re-reviewing every unchanged L
in an H file. No prose parser adds implicit obligations to the set. A derived
obligation to be submitted must first have an H/L identity under the accepted
authoring rules. Blocking assumptions discovered during review are represented
by a finding and, when authority is needed, a decision in the review result. This
makes the software check declared coverage without pretending to judge semantic
truth.

The v2 manifest has no review or approval member. The fixed downstream locations
remain:

- `docs/assurance/<baselineId>/requirements-review.json`; and
- `docs/assurance/<baselineId>/baseline-approval.json`.

The dependency graph remains manifest -> inputs, review -> manifest, approval ->
manifest + review + authority/decision records. No record hashes itself.

For a requirements-document item, this candidate manifest's role-`allocation`
dependency is the newly authored `SLICE_DOC`: it allocates the later
implementation the candidate is preparing. It is not the
`ADMISSION_ALLOCATION` that authorized the current document-authoring run. The
latter belongs to the already accepted input manifest and must exist before the
builder; the candidate manifest and its allocation subject may be declared
outputs that do not exist until the builder completes.

## 5. Provider requirements-review result

For a work item whose exact `ARTIFACT_KIND` is `REQUIREMENTS_DOCUMENT`, the
selection packet must also contain exactly one target-relative
`ADMISSION_ALLOCATION: <path>`, one target-relative
`REVIEW_BASELINE: <path>`, and one
`REVIEW_OBLIGATION_IDS: <comma-separated-H/L-IDs>` line. The latter is non-empty;
the parser trims ASCII space around each comma-delimited ID and rejects empty,
invalid, or duplicate items. Its set must equal the candidate manifest's
`reviewObligationIds` after both arrays pass duplicate detection. The packet is
therefore the submitted-scope authority; removing an L from only the manifest
cannot shrink coverage silently. `REVIEW_BASELINE` names the v2 candidate
manifest authored or refined by the document builder. These fields are mandatory
only in the stage-2 `REQUIREMENTS_DOCUMENT` posture, including its v1 predecessor
bridge; legacy packets keep their current interpretation.

`ADMISSION_ALLOCATION` obeys v1 target-relative path syntax and must name exactly
one role-`allocation` dependency in the currently accepted v1 or v2 input
manifest. It is validated before each author/reviewer dispatch. It may equal the
accepted input manifest's allocation for the enclosing runtime increment; it
must not equal an absent output merely because that output is named by
`SLICE_DOC`. `SLICE_DOC` and `REVIEW_BASELINE` retain their output meanings and
may be absent before the first builder call. After the builder, `SLICE_DOC` must
exist and occur exactly once as role `allocation` in the candidate
`REVIEW_BASELINE`. Missing or duplicate posture fields, an admission path absent
from the accepted manifest, or a candidate/allocation mismatch blocks with no
dependent provider call. Create-only review/approval publication, not output-path
presence, protects the durable downstream records across refinement cycles.

The reviewer returns one JSON object as its complete final artifact. Markdown
fences, a leading `STATUS:` line, trailing prose, duplicate members, and unknown
fields are invalid. The provider result has exactly:

```json
{
  "formatVersion": 2,
  "kind": "requirements-review-result",
  "subject": {
    "path": "docs/requirements/baselines/EXAMPLE-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "result": "accepted",
  "assessments": [
    {
      "obligationId": "EX-REQ-001",
      "result": "accepted",
      "findingIds": [],
      "decisionIds": []
    },
    {
      "obligationId": "EX-REQ-001-L01",
      "result": "accepted",
      "findingIds": [],
      "decisionIds": []
    }
  ],
  "findings": [],
  "decisions": [],
  "report": "The bounded requirements and design are correct and implementable."
}
```

The object has exactly the eight fields shown. `subject` is a v1 `ContentRef` and
must equal the reviewed candidate manifest path and raw-byte digest. `report` is
non-empty explanatory prose; it cannot override the structured result.

### 5.1 Assessment

Each assessment has exactly `obligationId`, `result`, `findingIds`, and
`decisionIds`. `result` is one of:

- `accepted` — this obligation needs no refinement or authority decision;
- `refinement-required` — the reviewer identified a correctable defect; or
- `decision-required` — an authority-level choice blocks acceptance.

The assessment array is non-empty. Each expected H/L ID occurs exactly once.
An omitted expected ID is `review-coverage-missing`; a duplicate is
`duplicate-identity`; an ID outside the derived expected set is
`review-coverage-unknown`. Overall positive prose or acceptance of the parent H
cannot conceal one missing L.

For an `accepted` assessment both ID arrays are empty. A
`refinement-required` assessment has one or more `findingIds` and no
`decisionIds`. A `decision-required` assessment has one or more `decisionIds`
and may also name refinement findings. Every referenced finding/decision exists,
and every finding/decision is referenced by at least one assessment.

### 5.2 Finding

Each finding has exactly:

```json
{
  "findingId": "F-EX-REQ-001-L01-1",
  "obligationId": "EX-REQ-001-L01",
  "category": "verifiability",
  "evidence": "The criterion names no observable output.",
  "consequence": "Independent readers cannot agree on pass or fail.",
  "requiredAction": "Name the output and an independent acceptance oracle."
}
```

`category` is exactly one of `correctness`, `completeness`, `consistency`,
`feasibility`, `verifiability`, `necessity`, `traceability`, `naming`, or
`architecture`. The three prose fields are non-empty. `obligationId` must be in
the expected coverage set. Finding IDs are unique.

### 5.3 Decision

Each decision has exactly:

```json
{
  "decisionId": "D-EXAMPLE",
  "obligationIds": ["EX-REQ-001-L01"],
  "question": "Which externally visible behavior is required?",
  "options": [
    {
      "option": "A",
      "reward": "Users receive a deterministic refusal.",
      "risk": "Previously accepted permissive inputs stop."
    },
    {
      "option": "B",
      "reward": "Existing permissive inputs continue.",
      "risk": "The requirement cannot make acceptance deterministic."
    }
  ],
  "recommendation": "A",
  "blockingReason": "The approved sources do not settle the compatibility rule."
}
```

`obligationIds` and `options` are non-empty arrays. Obligation IDs are unique and
in the expected coverage set. Each option has exactly `option`, `reward`, and
`risk`, all non-empty. Option labels and decision IDs are unique. Recommendation
is non-empty and must equal one option label. The runtime checks this shape, not
whether the option set is philosophically exhaustive.

### 5.4 Aggregate outcome

After all per-ID checks:

1. if any assessment is `decision-required`, overall `result` must be
   `decision-required`;
2. otherwise, if any is `refinement-required`, overall `result` must be
   `refinement-required`; and
3. otherwise every assessment is `accepted` and overall `result` must be
   `accepted`.

An inconsistent aggregate is `review-result-mismatch`. The runtime routes:

- `refinement-required` -> retain the structured local review, increment the
  document cycle, and return to its builder with every original obligation plus
  the findings;
- `decision-required` -> retain the structured local review, block the document
  item with its decision matrix visible to the manager, and do not publish an
  accepted review or approval; and
- `accepted` -> publish the durable review from section 6, finish the document
  work item, and print `reviewed baseline awaiting operator approval`. It does
  not dispatch an implementation.

Invalid output is not fed to the legacy verdict parser and does not become an
implicit `revise` or approval. JSON/shape/coverage failures retain their specific
codes (`malformed-json`, `duplicate-field`, `invalid-field`,
`review-coverage-*`, and so on). A completed provider result with no single text
output artifact is `invalid-field` at the provider-result pseudo-record; no new
generic wrapper code hides the cause.

After an authorized human/operator decision is recorded, the manager explicitly
resumes document work. The author adds the decision ID to
`requiredDecisionIds`, applies any authorized wording/design change, and the
changed manifest digest receives a complete new review. The eventual approval
references the decision record. A decision already present and unchanged in the
input authority chain is not reopened merely because the new baseline references
it.

## 6. Durable v2 requirements-review record

For an accepted provider result, Agent Manager constructs this record from the
validated result and the actual completed builder/reviewer requests. The provider
does not supply actor identities, timestamps, or the independence classification.
The JSON below is a field-shape illustration: each embedded provenance array shows
one representative member to keep the example readable. A record eligible for
publication contains the complete section-8 closure required by section 9.

```json
{
  "formatVersion": 2,
  "kind": "requirements-review",
  "reviewId": "review-ASSURANCE-3-PREP-1",
  "subject": {
    "path": "docs/requirements/baselines/EXAMPLE-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "author": {
    "role": "requirements-author",
    "provider": "codex",
    "model": "gpt-5.6-sol",
    "effort": "high",
    "runId": "build-ASSURANCE-3-PREP-1"
  },
  "reviewer": {
    "role": "requirements-reviewer",
    "provider": "codex",
    "model": "gpt-5.6-terra",
    "effort": "high",
    "runId": "review-ASSURANCE-3-PREP-1"
  },
  "independence": {
    "invocations": "separate",
    "providerDiversity": "same-provider"
  },
  "authorInputProvenance": {
    "contract": "requirements-assurance/v2-input-delivery",
    "roots": {
      "target": "/target/agent-manager",
      "prompt": "/runner/agent-manager"
    },
    "baseline": {
      "path": "docs/requirements/baselines/ASSURANCE-2-IMPLEMENTATION.json",
      "sha256": "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234"
    },
    "commonInputs": [
      {
        "origin": "file",
        "root": "prompt",
        "purpose": "shared-instruction",
        "path": "SYSTEM.txt",
        "sha256": "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
        "byteLength": 100
      }
    ],
    "roleSpecificInputs": [
      {
        "origin": "generated",
        "purpose": "task-directive",
        "label": "requirements-author-task",
        "sha256": "sha256:789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456",
        "byteLength": 200
      }
    ],
    "channels": [
      {
        "channel": "shared-instruction",
        "mechanism": "codex-developer-instructions",
        "sha256": "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
        "byteLength": 100
      },
      {
        "channel": "stdin",
        "mechanism": "stdin",
        "sha256": "sha256:89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
        "byteLength": 2048
      }
    ]
  },
  "reviewerInputProvenance": {
    "contract": "requirements-assurance/v2-input-delivery",
    "roots": {
      "target": "/target/agent-manager",
      "prompt": "/runner/agent-manager"
    },
    "baseline": {
      "path": "docs/requirements/baselines/ASSURANCE-2-IMPLEMENTATION.json",
      "sha256": "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234"
    },
    "commonInputs": [
      {
        "origin": "file",
        "root": "prompt",
        "purpose": "shared-instruction",
        "path": "SYSTEM.txt",
        "sha256": "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
        "byteLength": 100
      }
    ],
    "roleSpecificInputs": [
      {
        "origin": "generated",
        "purpose": "task-directive",
        "label": "requirements-reviewer-task",
        "sha256": "sha256:9abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678",
        "byteLength": 240
      }
    ],
    "channels": [
      {
        "channel": "shared-instruction",
        "mechanism": "codex-developer-instructions",
        "sha256": "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
        "byteLength": 100
      },
      {
        "channel": "stdin",
        "mechanism": "stdin",
        "sha256": "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        "byteLength": 2300
      }
    ]
  },
  "result": "accepted",
  "assessments": [
    {
      "obligationId": "EX-REQ-001",
      "result": "accepted",
      "findingIds": [],
      "decisionIds": []
    },
    {
      "obligationId": "EX-REQ-001-L01",
      "result": "accepted",
      "findingIds": [],
      "decisionIds": []
    }
  ],
  "findings": [],
  "decisions": [],
  "completedAt": "2026-09-12T12:00:00.000Z",
  "report": "Accepted after substantive requirements and design review."
}
```

The object has exactly the fifteen fields shown. `assessments` contains the
complete set described in section 5; the two-entry example assumes that is the
subject manifest's whole H/L set.
`findings`, `decisions`, `result`, and `report` are copied from the validated
provider result. `reviewId` equals the actual reviewer `runId`.

`authorInputProvenance` and `reviewerInputProvenance` are exact section-9 objects
copied from the two completed local run records. Their baselines and ordered
`commonInputs` must match before this accepted review can be published. Embedding
the identities in the tracked review keeps the review's inputs inspectable after
local run cleanup; it does not make the referenced prompt content target-owned.

`author` and `reviewer` each have exactly `role`, `provider`, `model`, `effort`,
and `runId`; every non-role string is non-empty and their run IDs differ.
`independence.invocations` is `separate`. `providerDiversity` is computed as
`same-provider` when provider IDs are equal and `different-provider` otherwise.
No stronger independence label exists in v2.

The fixed output is created only for `accepted`. An existing file is never
overwritten. Refinement and decision records remain in the local per-cycle trail
until a later accepted candidate is published; they do not masquerade as the
durable accepted review.

## 7. Version-2 baseline approval and recording operation

### 7.1 Exact record

```json
{
  "formatVersion": 2,
  "kind": "requirements-baseline-approval",
  "approvalId": "EXAMPLE-BASELINE-APPROVAL-1",
  "target": {
    "projectId": "agent-manager",
    "root": "."
  },
  "subject": {
    "path": "docs/requirements/baselines/EXAMPLE-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "review": {
    "path": "docs/assurance/EXAMPLE-INPUT-1/requirements-review.json",
    "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
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
    "sha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
  },
  "resolvedDecisions": [],
  "decidedAt": "2026-09-12T12:05:00.000Z",
  "rationale": "The operator approves this exact reviewed baseline."
}
```

The object has exactly the thirteen fields shown. Except for `target` and
`formatVersion`, v1 approval field rules apply. `target` must exactly equal the
subject manifest's target. The subject must be the selected v2 manifest; `review`
must be its fixed accepted v2 review. The set of resolved decision IDs equals the
manifest's required decision IDs, and each record is contained in the target and
matches its digest. A reviewer verdict cannot populate `approvedBy`.

### 7.2 Explicit target-aware operation

The existing `npm run human` command is legacy slice input and is not changed or
reinterpreted. Stage 2 adds this mutually exclusive mode to the existing target
CLI composition root:

```text
npm run relay-target -- <target> \
  --record-reviewed-baseline-approval <manifest> \
  --approval-id <id> \
  --project-id <id> \
  --approved-by-type human|operator --approved-by-id <id> \
  --recorded-by-type human|operator --recorded-by-id <id> \
  --authority-basis <target-relative-path> \
  [--decision-record <decision-id>=<target-relative-path>]... \
  --rationale <non-empty-text>
```

The positional target is resolved exactly as normal `relay-target`.

Each `--decision-record` value splits at its first `=` into a decision ID and
target-relative path; empty halves and duplicate IDs are invalid. All actor/ID/
path values use sections 3 and v1 rules.

The operation:

1. performs no scaffold write, selection, provider prewarm, provider call, phase
   transition, commit, or implementation dispatch;
2. requires a v2 manifest and its accepted v2 review, revalidates their upstream
   bytes and review coverage, and requires `--project-id` to equal the manifest;
3. validates actor fields, authority basis, the exact required decision set and
   every referenced byte before rendering the record;
4. refuses an existing approval path instead of overwriting it;
5. writes only the fixed target-relative approval path; and
6. prints `recorded reviewed-baseline approval`, target root, project ID,
   manifest path/digest, review path/digest, output path, and `commit: not
   performed`.

The flags record the operator's assertion and authority basis; they are not
authentication, signatures, or protection from a repository administrator. A
wrong target/project/subject, non-accepted review, missing decision, or stale byte
exits nonzero and writes nothing. Interrupted/idempotent atomic publication and
final candidate acceptance remain ASSURANCE-4.

## 8. Reviewed input snapshot and request DTO

### 8.1 Why existing references are insufficient

Current `RunRequest.prompts` contains path/digest references but each adapter
rereads the live role files. `inputArtifacts` is empty in target relay requests.
`contextText` is generated without identity. Codex/Copilot lazily cache the shared
file, while Claude passes its live path and prewarm reads nothing. A v2 run must
therefore carry the bytes to the adapter; a record of paths alone is not delivery.

### 8.2 Closed delivery sum

`RunRequest` uses an exhaustive delivery sum. Existing callers use the unchanged
legacy variant; a stage-2-capable target relay uses the reviewed variant for any
explicitly baseline-admitted role request. The active enforcement label still
comes from the admitted chain as section 2 says:

```ts
type RunInputDelivery =
  | {
      readonly kind: 'legacy-live-inputs';
      readonly prompts: readonly PromptRef[];
      readonly contextText?: string;
    }
  | {
      readonly kind: 'reviewed-input-snapshots';
      readonly contract: 'requirements-assurance/v2-input-delivery';
      readonly common: readonly RunTextInput[];
      readonly roleSpecific: readonly RunTextInput[];
    };

type RunTextInput =
  | {
      readonly origin: 'file';
      readonly root: 'target' | 'prompt';
      readonly purpose: RunInputPurpose;
      readonly path: string;
      readonly bytes: Uint8Array;
      readonly sha256: string;
    }
  | {
      readonly origin: 'generated';
      readonly purpose: RunInputPurpose;
      readonly label: string;
      readonly bytes: Uint8Array;
      readonly sha256: string;
    };
```

`RunInputPurpose` is the closed set `shared-instruction`, `common-role-instruction`,
`baseline-manifest`, `requirement`, `source`, `governance`, `design`, `allocation`,
`review`, `approval`, `authority`, `decision`, `role-instruction`,
`selection-packet`, `review-subject`, `build-report`, `prior-review`, and
`task-directive`.

The adapter verifies each digest over `bytes`. File paths are provenance only;
the adapter does not reread them in the reviewed variant. Mixing legacy live
prompts/context with reviewed snapshots is unrepresentable. `inputArtifacts`
remains an artifact-reference field for existing non-target callers and does not
stand in for these bytes.

### 8.3 Common snapshot closure and order

Immediately before the first stage-2-capable assured role dispatch (including
the v1 predecessor bridge), the application reads one in-memory snapshot closure.
For that bridge, the accepted-baseline closure is the new ASSURANCE-2
implementation baseline from section 2.1, not INPUT-3 and not the not-yet-created
ASSURANCE-3 candidate. `ADMISSION_ALLOCATION` selects its existing allocation;
the candidate outputs remain role-specific review-subject inputs after creation.
`common` is ordered:

1. selected shared instruction from the prompt root;
2. common role instructions in CLI order;
3. the selected v1 or v2 manifest;
4. manifest requirements in manifest order;
5. manifest dependencies in manifest order;
6. fixed accepted review;
7. fixed approval;
8. approval authority basis; and
9. resolved decision records in approval array order.

Repeated authority/decision paths are delivered once at their first occurrence
after all references have been validated. Each item retains its exact purpose.
Both requirements author and reviewer receive the same ordered common array.
Every dependency with role `governance`, including the target's `CLAUDE.md`, is
therefore delivered as content rather than trusted to provider auto-discovery.
The manifest for an Agent Manager assured run must list `CLAUDE.md` as governance;
other targets name their actual governance closure. Software does not infer
additional governance merely from a filename or Markdown prose.

`roleSpecific` contains, in order, that role's snapshotted instruction files,
the selection packet, relevant prior review/build evidence, and the generated
task directive. For a requirements-document review, the newly authored v2
candidate manifest and its upstream closure are `review-subject` inputs to the
reviewer: they cannot be common inputs because they did not exist in that form
before the builder edited them. `inputProvenance.baseline` and the common array
always identify the accepted baseline that authorized both roles; the durable
requirements review separately identifies the candidate it judges. Role
differences are required and visible. They are not included in the common-equality
assertion.

Each file is read once per snapshot attempt. Before every dependent role call the
live manifest/instruction closure is revalidated against the persisted identities.
Any mutation blocks before the call. A resumed process rebuilds snapshots only
after that revalidation. This is a checkpoint drift detector, not continuous
immutability or hostile-administrator protection.

### 8.4 Exact framing

Every reviewed input is UTF-8 decoded with fatal error handling. For stdin
composition, the adapter renders each item as this byte concatenation (quoted
`\n` is one LF byte, not two backslash characters):

```text
UTF8("AGENT_MANAGER_INPUT_V2 " + compactJsonHeader + "\n")
+ exactSourceBytes
+ UTF8("\nAGENT_MANAGER_INPUT_END_V2\n")
```

The compact header has members in this order: `origin`, `root` (file only),
`purpose`, `path` (file only) or `label` (generated only), `sha256`, and
`byteLength`. It contains no insignificant whitespace. `byteLength` permits the
source body to contain either marker without ambiguity. The common frames are
followed by role-specific frames. No whitespace is trimmed or normalized.

The shared instruction is not duplicated into the ordinary stdin frames. Provider
adapters deliver that one input through their actual mechanism:

- Claude writes the snapshotted bytes to a deterministic local operational file,
  verifies it, and passes that snapshot path to `--system-prompt-file`;
- Codex passes those exact bytes as `developer_instructions`;
- Copilot prepends the framed shared input to stdin because it has no system
  instruction flag.

Legacy adapter configuration, prewarm caching, argv, permissions, cwd, models,
effort, and prompt behavior remain unchanged for `legacy-live-inputs`. V2 dry-run
does not create the Claude snapshot; it prints the deterministic eventual path
and all planned channel/input digests. A live run creates the file under the
adapter's configured local logs directory (`input-snapshots/<sha256>.txt`) and
verifies its digest immediately before spawn. The adapter therefore does not need
to interpret the target slice directory layout.

Each adapter has one no-spawn `prepareRunDelivery` operation that returns the
provider invocation, exact stdin bytes, optional shared snapshot path/bytes, and
channel identities. Live `run`, dry-run, and composition tests consume that same
value; live `run` does not recompute it through a second path. This is a test seam
over the already documented adapter boundary, not a new provider interface.

`RunResult` carries the matching exhaustive receipt rather than an optional set
of channels:

```ts
type RunDeliveryReceipt =
  | { readonly kind: 'legacy-live-inputs' }
  | {
      readonly kind: 'reviewed-input-snapshots';
      readonly contract: 'requirements-assurance/v2-input-delivery';
      readonly channels: readonly RunChannelIdentity[];
    };
```

`RunChannelIdentity` is the in-memory form of the section-9 channel object.
Request and result `kind` must match. A legacy receipt makes no new byte-delivery
claim; a reviewed receipt must contain the exact channels returned by
`prepareRunDelivery`. This removes the invalid state in which a reviewed request
completes without a delivery receipt.

## 9. Run input provenance

Stage-2-capable target run records retain all existing fields and add required
`inputProvenance` for reviewed-input dispatches, including the one-time v1
predecessor bridge. Legacy run records omit it.
The object is closed. The example shows one representative common and role input;
a real value contains the complete section-8 closure:

```json
{
  "contract": "requirements-assurance/v2-input-delivery",
  "roots": {
    "target": "/target/agent-manager",
    "prompt": "/runner/agent-manager"
  },
  "baseline": {
    "path": "docs/requirements/baselines/EXAMPLE-INPUT-1.json",
    "sha256": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "commonInputs": [
    {
      "origin": "file",
      "root": "prompt",
      "purpose": "shared-instruction",
      "path": "SYSTEM.txt",
      "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
      "byteLength": 100
    }
  ],
  "roleSpecificInputs": [
    {
      "origin": "generated",
      "purpose": "task-directive",
      "label": "reviewer-task",
      "sha256": "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
      "byteLength": 200
    }
  ],
  "channels": [
    {
      "channel": "shared-instruction",
      "mechanism": "codex-developer-instructions",
      "sha256": "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
      "byteLength": 100
    },
    {
      "channel": "stdin",
      "mechanism": "stdin",
      "sha256": "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
      "byteLength": 2048
    }
  ]
}
```

The object has exactly `contract`, `roots`, `baseline`, `commonInputs`,
`roleSpecificInputs`, and `channels`. `roots` has exactly `target` and `prompt`,
the non-empty absolute real paths used for the request. They are execution
provenance, not portable content identity. `commonInputs` and
`roleSpecificInputs` are non-empty and contain exact identity projections of the
request snapshots.
File projections have exactly the six fields shown; generated projections have
exactly `origin`, `purpose`, `label`, `sha256`, and `byteLength`.

`channels` is a non-empty array. Each channel has exactly `channel`, `mechanism`,
`sha256`, and `byteLength`. `channel` is `shared-instruction` or `stdin` and is
unique. `mechanism` is a non-empty adapter-reported string; policy does not branch
on it. The adapter computes channel identities from the exact bytes/config value
handed to process spawn and returns them with `RunResult`; `makeRunRecord` records
the receipt. It may not reconstruct them later from mutable files.

The existing top-level run-record `prompts` array remains populated for
compatibility with the prompt-root file inputs that are instructions. Its
`digest` values equal the matching `inputProvenance` SHA-256 values. It is a
summary reference, not the v2 delivery oracle; generated, target, baseline and
channel identities live only in `inputProvenance`.

For builder/reviewer equivalence, software compares `baseline` and the complete,
ordered `commonInputs` identities. They must be equal. `roleSpecificInputs`, role,
provider/model, and delivery mechanism may intentionally differ and remain
visible. A mismatch blocks review completion as `role-context-mismatch`; it is not
hidden by a positive requirements result.

The provider can add its own undocumented harness context. This record claims the
inputs Agent Manager delivered, not exclusive control of the provider's complete
internal context.

## 10. V2 validation and failure behavior

V1 error codes retain their meanings. V2 adds:

- `review-coverage-missing`
- `review-coverage-unknown`
- `review-result-mismatch`
- `role-context-mismatch`
- `approval-already-exists`

Missing instructions use v1 `missing`/`unreadable`/`io-failure`; changed
instructions use `digest-mismatch`; a wrong target/project/subject uses
`subject-mismatch`. Reusing the existing precise causes keeps the error sum
smaller and its exhaustive renderer meaningful.

Every error has the v1 error shape: stable code, record path, JSON Pointer or
Markdown line, detail, and both locations for duplicates. Errors from an
unambiguously parsed v2 record aggregate where independent. Malformed or
duplicate-key JSON stops dependent diagnostics exactly as v1 does.

No stage-2 validation path silently warns and continues. In particular, an
assured missing shared prompt, missing role prompt, unreadable governance file,
invalid review result, stale subject, mismatched common context, or failed
approval write causes a nonzero/refused result and zero dependent provider calls.
The optional shared-prompt warning remains only on legacy operation.

## 11. Deferred contracts

V2 deliberately does not define:

- implementation slice allocation/check-plan records;
- candidate-tree identity, test/preservation evidence, or implementation-review
  completion;
- final implementation acceptance or deployment;
- typed blocked-cause recovery, change impact, or atomic/idempotent publication;
- reverse trace/readiness reports; or
- a full `--assurance v1` claim.

Unknown fields for those stages are rejected. No schema registry, new provider,
new workflow engine, database, daemon, signature service, or generic document
parser is introduced.

## 12. Earned structures

- **V2 manifest variant** — current users: candidate review, target approval, and
  v2 admission; variation: manually reviewed v1 chains versus structured-review
  chains; rejected alternative: reinterpret v1 bytes, because that would relabel
  published stage-1 evidence.
- **V2 structured review records** — current users: document review routing and
  reviewed-baseline admission; variation: per-H/L accept/refine/decision outcomes;
  rejected simpler alternative: a single prose verdict, because it can omit one
  required L while remaining globally positive.
- **`ADMISSION_ALLOCATION` document-posture field** — current user: the real
  ASSURANCE-3 author/review bridge; variation: an existing accepted input
  allocation versus the new `SLICE_DOC` output; rejected alternative: passing
  `SLICE_DOC` to v1 admission, because an absent output cannot satisfy its
  pre-dispatch hash check.
- **Rooted content and byte identities** — current users: persisted instruction
  selection, request snapshots, durable review provenance, and adapter channel
  receipts; variation: target-root versus prompt-root files and source versus
  composed bytes; rejected alternative: `ArtifactRef.path`, whose current
  contract leaves the root ambiguous and carries no content digest.
- **Reviewed input delivery sum** — current users: target-relay builder and
  reviewer requests across the three existing adapters; variation: legacy live
  file delivery versus v2 byte snapshots; rejected simpler alternative: more
  optional fields on `RunRequest`, because mixed live/snapshot state would permit
  an unrecorded fallback.
- **Run input provenance** — current users: builder/reviewer equality gate and
  local run audit; variation: common authoritative bytes versus intentional
  role-specific material and provider delivery channels; rejected simpler
  alternative: prompt path/digest references, because current adapters can
  deliver different live bytes after those references are formed.
- **Adapter delivery preparation seam** — current users: all three existing
  adapter `run` methods, CLI dry-run, and composition tests; variation:
  provider-specific instruction channels and argv; rejected alternative: test a
  duplicate renderer that could drift from the bytes handed to spawn.
- **Target-aware approval operation** — current users: the in-place manager
  approving a reviewed v2 baseline and subsequent v2 admission; variation:
  explicit target/subject/actor/authority values; rejected simpler alternative:
  reuse `npm run human`, because that command writes legacy slice state and has
  no target-baseline subject.

All eight structures serve concrete stage-2 consumers. No new module/package or
dependency is required by this contract.
