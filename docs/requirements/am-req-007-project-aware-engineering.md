<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-007",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "1-roles-before-providers"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "6-tool-provider-openness"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "product-boundary"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-007-L01",
      "parentId": "AM-REQ-007"
    },
    {
      "id": "AM-REQ-007-L02",
      "parentId": "AM-REQ-007"
    },
    {
      "id": "AM-REQ-007-L03",
      "parentId": "AM-REQ-007"
    },
    {
      "id": "AM-REQ-007-L04",
      "parentId": "AM-REQ-007"
    },
    {
      "id": "AM-REQ-007-L05",
      "parentId": "AM-REQ-007"
    },
    {
      "id": "AM-REQ-007-L06",
      "parentId": "AM-REQ-007"
    }
  ]
}
-->
# AM-REQ-007 — Project-aware engineering and honest role contracts

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Roles before providers](../VISION.md#1-roles-before-providers); [VISION — Tool-provider openness](../VISION.md#6-tool-provider-openness); [VISION — Product Boundary](../VISION.md#product-boundary); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

The same requirements-assurance process shall operate across projects and supported providers without importing another project's domain rules or forcing unnecessary architecture, while preserving names that accurately communicate behavior.

**Scope:** Shared discipline, role obligations, architectural judgment, and provider delivery. Not a universal software architecture or additional provider implementation.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-007; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-007-L01 — Governance ownership

For Agent Manager, CLAUDE.md shall be the sole project-instruction source; the shared prompt and active role instructions shall explicitly read it. For other targets, roles shall honor the target's documented governance and additional execution-environment instructions without requiring a duplicate Agent Manager AGENTS.md.

**Verification criterion:** A target containing only CLAUDE.md is usable. Changing provider does not select a stale duplicate instruction file; external target instructions are not overwritten.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-007-L02 — Shared versus specific

The shared prompt shall state general requirements, review, naming, and architecture discipline. Target contracts shall provide domain rules and verification obligations; role prompts shall provide responsibilities and output formats. No unrelated project's incident or tool name shall be required to follow the shared process.

**Verification criterion:** Review the prompt bundle using two differently structured fixture projects: neither needs the other's tools, directory assumptions, or incident-specific predicates.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-007-L03 — Architectural judgment

Design review shall distinguish pure domain policy, application coordination, and mechanisms using the project's actors, constraints, established boundaries, and actual reasons for change. New abstractions shall name their current or explicitly approved users, concrete force, and simpler alternative.

**Verification criterion:** A proposed interface justified only by hypothetical future replacement receives a refinement finding; an existing hardware boundary or concrete provider variation is evaluated on its real contract.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-007-L04 — Naming contract

Builders shall introduce names matching actual behavior, scope, material side effects, and implied guarantees. Reviewers shall check those names against code and tests without conversational context. Existing misleading names shall be surfaced, with cross-boundary renames approved before execution.

**Verification criterion:** A mutating operation named as a read, or a partial check named complete validation, is a blocking contract finding when introduced by the slice; unrelated legacy renames are proposed separately.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-007-L05 — Provider-neutral gates

Admission, requirement review coverage, and acceptance policy shall not branch on provider names. All supported providers shall receive equivalent authoritative inputs; provider-specific permission and prompt-delivery mechanisms shall remain in adapters and be honestly reported.

**Verification criterion:** Parameterized normalized-request tests cover provider assignments. Invalid structured role output blocks under every assignment, without requiring vendor-native schema support.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-007-L06 — Versioned instructions

For assured runs, the shared prompt, role prompts, relevant governance, and their composition shall be identifiable by content, not only a machine-local path. A missing required prompt or a changed prompt after snapshotting shall not silently remove the discipline.

**Verification criterion:** Delete the selected shared file before an assured run: it fails before provider dispatch. Mutating the live source after snapshotting cannot make one role receive unrecorded different instructions.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
