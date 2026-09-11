# Requirements-assurance catalog

Status: APPROVED requirements; ASSURANCE-0 independent requirements/design review ACCEPTED. Implementation/verification pending. Maturity: PROTOTYPE. Date: 2026-09-11.

## Authority and scope

The human accepted one file per high-level requirement with individually identified
low-level requirements, removal of AGENTS.md in favor of CLAUDE.md, and requested
this actual requirements set, component rollout, and an encoded in-place manager
operating method.

The human approved the requirements and recommended rollout decisions: see the
[authorization](../assurance/ASSURANCE-0/human-authorization.md). Exact record grammar
and independent review are ASSURANCE-0 work; no runtime gate is claimed yet. This is an
avionics-inspired engineering protocol, not a compliance or qualification claim.

## Catalog

| High-level ID | Required outcome | L entries | Evidence |
|---|---|---:|---|
| [AM-REQ-001](am-req-001-target-owned-requirements.md) | Target-owned, identifiable requirements | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-002](am-req-002-requirements-and-design-review.md) | Requirements validation and proportionate design review | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-003](am-req-003-traceable-delivery-planning.md) | Requirements-linked roadmap and slices | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-004](am-req-004-baseline-bound-execution.md) | Baseline-bound implementation and review | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-005](am-req-005-verification-and-acceptance.md) | Evidence-based verification and acceptance | 7 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-006](am-req-006-controlled-requirement-change.md) | Controlled change and recovery | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-007](am-req-007-project-aware-engineering.md) | Project-aware engineering and honest role contracts | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-008](am-req-008-self-hosting-and-adoption.md) | Self-hosting, bounded adoption, and demonstrated assurance | 6 | Human-approved; design reviewed; implementation pending |
| [AM-REQ-009](am-req-009-in-place-manager.md) | Persistent manager-led delivery | 7 | Human-approved; design reviewed; implementation pending |

There are **9 H requirements and 56 individually identified L requirements**.
Each L has a verification criterion; these are not executed software tests.
[ASSURANCE-0 acceptance](../assurance/ASSURANCE-0/manager-acceptance.md) records
Terra review of 9 H / 56 L entries. Frozen individual files retain their
authoring-time pending-review labels; this exact-revision record supersedes them.
A completed slice does not automatically satisfy its whole parent H.

## Record conventions

- An H file owns its statement, sources, scope, and subordinate Ls.
- An L's parent is the H in its file. Do not renumber IDs on wording changes.
- A source link identifies origin, not automatic authorization of the refinement.
  Explicit requests and approved design-derived needs may also be sources.
- Approval labels here reference the manual authorization; they are not a runtime approval mechanism.
- Requirement content, approval of its revision, implementation progress, and
  evidence are separate concepts. A status word cannot manufacture acceptance.
- Future approval will bind a content manifest and review/decision records.
- Retire an ID rather than reuse it for an unrelated obligation.
- Preservation lists reference enduring obligations, not duplicate their wording.

## Links and ownership

Intended chain: vision/request -> H -> L -> slice/design/code -> evidence.
Requirements own parent/source links. Slices own implement/preserve/change
allocations. Verification records own check-to-requirement links. The roadmap
owns ordering and prerequisites, not approval or a copy of requirement text.
Reverse navigation will be derived from forward references; this index is not
a second status ledger.

The source anchors use existing VISION sections without turning every vision
sentence into a requirement. Product intent remains distinct from this proposed
precise specification.

## Read next

- [Process](../PROCESS.md): actors, baselines, approval, storage.
- [Manager playbook](../MANAGER.md): the human's existing operating method encoded.
- [Rollout design](../slices/requirements-assurance-rollout.md): source evidence,
  component changes, decisions, and ordered vertical increments.
- [Roadmap](../ROADMAP.md): prerequisites and explicit readiness.
- [Current relay contract](../contracts/target-owned-relay.md): implemented routing,
  which this proposal does not silently supersede.

Future parser contracts/templates will be created with their first consumer,
rather than adding unused schemas and templates in this documentation pass.
