<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-003",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "traceability-model"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "4-supervisor-as-protocol-authority"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-003-L01",
      "parentId": "AM-REQ-003"
    },
    {
      "id": "AM-REQ-003-L02",
      "parentId": "AM-REQ-003"
    },
    {
      "id": "AM-REQ-003-L03",
      "parentId": "AM-REQ-003"
    },
    {
      "id": "AM-REQ-003-L04",
      "parentId": "AM-REQ-003"
    },
    {
      "id": "AM-REQ-003-L05",
      "parentId": "AM-REQ-003"
    },
    {
      "id": "AM-REQ-003-L06",
      "parentId": "AM-REQ-003"
    }
  ]
}
-->
# AM-REQ-003 — Requirements-linked roadmap and slices

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Traceability Model](../VISION.md#traceability-model); [VISION — Supervisor as protocol authority](../VISION.md#4-supervisor-as-protocol-authority); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

An operator shall be able to determine which changes deliver or preserve each requirement and which evidence supports them, while the roadmap remains a delivery plan rather than a competing specification.

**Scope:** Recorded forward links and derived reverse navigation; not semantic code indexing.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-003; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-003-L01 — Slice allocation

Each assured implementation slice shall identify the baseline and H/L IDs it implements, preserves, or intentionally changes, together with acceptance boundary, scope, non-goals, and required checks.

**Verification criterion:** A slice without requirement allocations is not eligible; a legitimate preservation-only or refactoring slice is eligible when its existing obligations and no-behavior-change checks are explicit.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-003-L02 — Read-only selection

Selection shall choose only an eligible existing work item from the target's roadmap, explain its prerequisites, and remain read-only. If requirements or approval are missing, it shall report the missing preparation work rather than inventing an implementation packet.

**Verification criterion:** An unapproved next roadmap item yields a blocked selection naming the prerequisite, with no target-file mutation and no implementation invocation.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-003-L03 — Roadmap semantics

Roadmap entries shall reference deliverable slices and prerequisite slices. A completed slice shall not imply that an entire partially allocated requirement is satisfied or that later work is authorized.

**Verification criterion:** Two slices implement disjoint Ls under one H: completing the first leaves the second planned and the H's overall verification incomplete.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-003-L04 — Reverse trace

For a selected requirement or changed requirement record, Agent Manager shall report recorded descendants, affected slices, and verification references, including unresolved links. Reverse results shall be derived from authoritative forward references, not independently edited copies.

**Verification criterion:** Editing a fixture's forward allocation updates the next trace report. The report enumerates missing references and states that unrecorded semantic dependencies still require investigation.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-003-L05 — Preservation continuity

A revision packet shall retain the original accepted obligations and applicable preservation checks alongside new review findings; resolving the latest finding shall not silently remove earlier obligations.

**Verification criterion:** Across two revise cycles, the second builder and final reviewer receive both the original requirements and the first-cycle preservation obligation.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-003-L06 — Test trace

Verification references shall identify the obligation and expected assertion or analytical criterion, not merely a test filename. A change without an authorized obligation and an obligation without required evidence shall both be visible in the completion report.

**Verification criterion:** A passing unrelated test cannot fulfill an L; a substantive extra diff hunk without a requirement or mandatory project-rule justification is a reviewer finding.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
