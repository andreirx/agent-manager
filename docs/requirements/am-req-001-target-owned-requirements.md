<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-001",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "traceability-model"
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
      "id": "AM-REQ-001-L01",
      "parentId": "AM-REQ-001"
    },
    {
      "id": "AM-REQ-001-L02",
      "parentId": "AM-REQ-001"
    },
    {
      "id": "AM-REQ-001-L03",
      "parentId": "AM-REQ-001"
    },
    {
      "id": "AM-REQ-001-L04",
      "parentId": "AM-REQ-001"
    },
    {
      "id": "AM-REQ-001-L05",
      "parentId": "AM-REQ-001"
    },
    {
      "id": "AM-REQ-001-L06",
      "parentId": "AM-REQ-001"
    }
  ]
}
-->
# AM-REQ-001 — Target-owned, identifiable requirements

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Traceability Model](../VISION.md#traceability-model); [VISION — Product Boundary](../VISION.md#product-boundary); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

An operator shall be able to identify the target project's software obligations and their origins from version-controlled files, independently of an agent session or Agent Manager's local run state.

**Scope:** Catalog identity, source links, and record ownership. Does not define an application's domain requirements on its behalf.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-001; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-001-L01 — Individual identity

Each high-level requirement shall occupy one Markdown file and contain uniquely identified low-level requirements. IDs shall remain stable across wording changes; retired IDs shall not be reused.

**Verification criterion:** Provide two H files and several L entries; duplicate H/L IDs are rejected with both locations, while a title-only change preserves references.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-001-L02 — Authorized origin

Each H shall identify its source by document and section or recorded decision; each L shall identify its parent H. A design-derived obligation without an entailing parent shall identify its derivation and unresolved upstream decision rather than inventing a source.

**Verification criterion:** Inspection finds the original need for each H. A missing source or parent is a structural finding; an unsupported claimed derivation is a reviewer finding.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-001-L03 — Adequate statement

Each obligation shall state conditions, required behavior or constraint, and an acceptance criterion with a verification method. Relevant units, limits, and assumptions shall be explicit; implementation convenience shall not substitute for user/system purpose.

**Verification criterion:** Requirements review returns a refinement finding for 'improve reliability' without a falsifiable criterion and for a numerical target without its measurement basis.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-001-L04 — Separate meanings

Requirement content, approval of a particular revision, implementation progress, and verification outcome shall be distinguishable. A document's self-declared status shall not be sufficient authority to admit implementation.

**Verification criterion:** A draft marked 'implemented' or 'approved' without its matching approval record cannot pass admission; a reviewed requirement with no implementation evidence is not reported satisfied.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-001-L05 — Target ownership

Requirements, accepted baselines, durable review findings, and acceptance evidence shall be stored in the target's tracked tree. Local execution files may reference them but shall not be the sole durable evidence for acceptance.

**Verification criterion:** After committing an accepted fixture and removing only its disposable local run directory, a clean checkout still identifies the accepted obligations, decision authority, and supporting evidence.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-001-L06 — Bounded loading

Catalog loading shall distinguish missing, malformed, unreadable, and unsupported-format records; reject escaping paths; and report the failing record. It shall not convert a failed read to an empty valid catalog.

**Verification criterion:** Headless cases cover missing file, malformed metadata, denied read, unknown format version, '..' and symlink escape; each prevents admission and identifies the cause.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
