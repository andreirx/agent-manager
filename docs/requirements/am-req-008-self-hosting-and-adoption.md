<!-- requirements-assurance-v1
{
  "formatVersion": 1,
  "kind": "requirement",
  "requirementId": "AM-REQ-008",
  "sources": [
    {
      "kind": "document-section",
      "path": "docs/ARCHITECTURE.md",
      "fragment": "11-self-hosting-requirement"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "near-term-vision"
    },
    {
      "kind": "document-section",
      "path": "docs/VISION.md",
      "fragment": "non-goals"
    },
    {
      "kind": "document-section",
      "path": "docs/assurance/ASSURANCE-0/human-authorization.md",
      "fragment": "source"
    }
  ],
  "lowLevelRequirements": [
    {
      "id": "AM-REQ-008-L01",
      "parentId": "AM-REQ-008"
    },
    {
      "id": "AM-REQ-008-L02",
      "parentId": "AM-REQ-008"
    },
    {
      "id": "AM-REQ-008-L03",
      "parentId": "AM-REQ-008"
    },
    {
      "id": "AM-REQ-008-L04",
      "parentId": "AM-REQ-008"
    },
    {
      "id": "AM-REQ-008-L05",
      "parentId": "AM-REQ-008"
    },
    {
      "id": "AM-REQ-008-L06",
      "parentId": "AM-REQ-008"
    }
  ]
}
-->
# AM-REQ-008 — Self-hosting, bounded adoption, and demonstrated assurance

Status: APPROVED by human 2026-09-11 for the staged rollout; independent review pending.
Maturity: PROTOTYPE (requirements record).
Date: 2026-09-11.

## Source and intent

Sources: [ARCHITECTURE — Self-Hosting Requirement](../ARCHITECTURE.md#11-self-hosting-requirement); [VISION — Near-Term Vision](../VISION.md#near-term-vision); [VISION — Non-Goals](../VISION.md#non-goals); the human's 2026-09-11 request for requirements-linked delivery. These origins do not imply ratification of the detailed refinements below.

## High-level requirement

Agent Manager shall demonstrate the methodology by using its existing target-owned relay to deliver and verify successive assurance capabilities into its own repository, without claiming that unimplemented gates protected their own creation.

**Scope:** Bootstrap, product acceptance, migration boundaries, and maturity. No database, GUI, generic requirements service, or replacement of existing provider adapters.

**High-level acceptance:** demonstrate the allocated low-level criteria below through the [rollout](../slices/requirements-assurance-rollout.md), including both acceptance and refusal where specified. Partial slice completion does not satisfy this whole H.

## Low-level requirements

All L entries below refine AM-REQ-008; their parent is this H. Their stable IDs are independent of filenames and section titles.

### AM-REQ-008-L01 — Explicit bootstrap

The first requirements and gate implementation shall record which prerequisites were checked by the operator because the software did not yet enforce them. Later increments shall use the accepted earlier gates; no increment shall retrospectively claim self-verification by its own new code.

**Verification criterion:** The rollout record identifies the runner revision, baseline and operator checks for the first code slice, then shows the next slice running under the previously accepted gate.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-008-L02 — Vertical increments

Each increment shall ship its support logic wired to a current workflow action and a visible operator result in the same increment. A schema, validator, prompt, or report generator unused by the exercised flow shall not count as delivered capability.

**Verification criterion:** The admission increment rejects an invalid own-repo fixture before a provider call and emits a reason on the real CLI path, rather than merely passing a private parser test.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-008-L03 — Positive and negative dogfood

Self-host acceptance shall include a real authorized requirements-to-implementation-to-review flow plus isolated negative cases for missing approval, stale baseline, failed preservation evidence, and unresolved human decisions.

**Verification criterion:** Recorded runs show the positive path and each refusal with invocation counts or equivalent evidence. Sabotage fixtures never alter the operator's real accepted baseline or installed environment.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-008-L04 — Compatibility boundary

Adoption shall be explicitly scoped. Existing legacy target runs shall retain their ratified behavior until a separately approved migration changes it, and shall be labelled as legacy rather than assured. No automatic rewrite of existing target requirements or local histories is permitted.

**Verification criterion:** Existing target-relay tests and dry-run invocation parity remain valid in legacy mode; an assured self-build retains its mode on resume and an untouched external fixture remains unchanged.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-008-L05 — Independent product gate

Before declaring the methodology mature, a reviewer shall assess whether the dogfood records demonstrate useful requirements decisions, preserved behavior, and reasonable maintenance burden, not merely populated fields and green structural checks.

**Verification criterion:** The gate can reject a mechanically complete record that demonstrates no meaningful acceptance check or adds unearned structure. Outcome, limitations, and open debt are preserved.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

### AM-REQ-008-L06 — Qualified claims

New assurance components shall remain PROTOTYPE until their stated promotion checks are accepted. Test-double validation, a dry run, real provider execution, and durable acceptance shall be reported separately. The product shall not claim DO-178C compliance or safety qualification from this protocol.

**Verification criterion:** The final report labels each evidence level and states what has not been exercised; documentation-only work is never recorded as an operational assurance feature.

**Evidence:** NOT RUN — proposed acceptance case, not a claimed result.

## Review and approval

Independent requirements review: NOT PERFORMED.
Human approval: [2026-09-11 authorization](../assurance/ASSURANCE-0/human-authorization.md).
Implementation and verification: NOT CLAIMED.

Common lifecycle and source/identity conventions: [catalog](README.md) and [process proposal](../PROCESS.md). Proposed formats and authority choices are in the [rollout decisions](../slices/requirements-assurance-rollout.md#7-decisions-required-before-code).
