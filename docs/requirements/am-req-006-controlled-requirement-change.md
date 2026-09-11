<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-006",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "4-supervisor-as-protocol-authority"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "traceability-model"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-006-L01",
      "parentId": "AM-REQ-006"
    },
    {
      "id": "AM-REQ-006-L02",
      "parentId": "AM-REQ-006"
    },
    {
      "id": "AM-REQ-006-L03",
      "parentId": "AM-REQ-006"
    },
    {
      "id": "AM-REQ-006-L04",
      "parentId": "AM-REQ-006"
    },
    {
      "id": "AM-REQ-006-L05",
      "parentId": "AM-REQ-006"
    },
    {
      "id": "AM-REQ-006-L06",
      "parentId": "AM-REQ-006"
    }
  ]
}
-->
# AM-REQ-006 — Controlled change and recovery

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [VISION — Supervisor as protocol authority](../VISION.md#4-supervisor-as-protocol-authority); [VISION — Traceability Model](../VISION.md#traceability-model); the human's 2026-09-11 request for requirements-linked, avionics-inspired delivery and project-specific architectural judgment. Vision section links describe origins, not proof that these refinements are already ratified.

## High-level requirement

Changes to accepted requirements, designs, or implementation candidates shall preserve their history and trigger the appropriate renewed review rather than silently reusing obsolete acceptance.

**Scope:** Baseline changes, blocker classification, and recovery; not a universal migration framework.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-006; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-006-L01 — Explicit change proposal

A proposed change to an accepted obligation shall identify the old baseline, changed IDs, reason, impacted behavior/consumers, and affected verification. The old baseline and its historical evidence shall remain identifiable.

**Verification criterion:** Amend an L after acceptance: the change report points to the prior content, lists affected recorded allocations, and does not rewrite the old acceptance as if it covered the new rule.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-006-L02 — Delta review

Review and approval shall cover the changed obligations and their affected assumptions/ancestors/consumers. Unchanged evidence may be reused only with an explicit relevance basis; an unchanged ID alone is insufficient.

**Verification criterion:** A changed error behavior under an unchanged H triggers affected checks; an unrelated untouched obligation is not re-ratified solely because it shares a directory.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-006-L03 — No silent weakening

A required check, threshold, preserved behavior, or scope restriction shall not be weakened to match the implementation without an explicit approved change or authorized exception naming the risk and scope.

**Verification criterion:** Changing a failing expected output without a linked approved obligation change produces a blocking finding; a documented authorized change causes only the relevant evidence to be renewed.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-006-L04 — Typed blockers

Recovery shall distinguish infrastructure interruption, fixable implementation findings, missing prerequisites, and authority-level decisions. Generic resume shall not convert every blocker into permission to build.

**Verification criterion:** A provider timeout can retry after valid preflight; a human-decision blocker remains blocked on the same invocation until its specific decision is resolved.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-006-L05 — Approval identity

Approval shall identify its subject content, decision, approving actor, and authority basis. Updating document text, a status label, or a provider result shall not manufacture a human approval. Repeated recording of the same approval shall not advance work twice.

**Verification criterion:** An approval for baseline A does not admit B; duplicate publication is idempotent; builder text claiming 'ratified' does not satisfy an operator approval requirement.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-006-L06 — Missing-state behavior

If local execution state is lost, the relay shall use durable records to explain the last accepted state but shall not invent the position of an interrupted run. Any new run/recovery shall be explicit and pass admission anew.

**Verification criterion:** Deleting a disposable local directory preserves the ability to inspect prior acceptance but does not cause a partly implemented candidate to be reported accepted or silently resumed.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
