# Manager interpretation: reviewed scope

Authority: human 2026-09-17 explicitly added Manager interprets messages; runtime constructs records. Interpretation remains an agent responsibility; uncertainty must stay explicit. The human also requires unfinished slices without role IDs to continue their existing work.

Reviewed scope: docs/slices/manager-message-interpretation-1.md (sha256:2f5da13c1338d9e9deda5d444980298cdb002bc0f46a369a0296621163fe3630). Independent reviewer: Codex gpt-5.6-terra/high, same reviewer conversation across two clarifications; final STATUS approved. Original findings and follow-ups are retained here. This is document/design approval, not implemented/runtime assurance.

Prerequisite: accept SLICE-PROVIDER-SESSIONS-1 before dispatching implementation. Manager will record the actual implementation input source identity and pre-existing inventory at dispatch; source is still changing under that first slice. No new interpreter service or broad ASSURANCE-4/5 implementation is authorized. Machine JSON command data is distinct from agents' natural-language output.

Compatibility amendment independently approved by the same Terra reviewer: preserve pinned shared/role prompt file bytes; put new output-format guidance in existing generated task directives. This keeps otherwise-valid interrupted v2 work admissible after upgrade. See requirements-review-compatibility.md.

Final reviewed slice identity after compatibility amendment: sha256:c780fe15f73469e994a9bbe8b08c652eef7397dd1d07071e8e1e1044337a92ee. Implementation predecessor is the accepted uncommitted session-support candidate, whose exact source identities are recorded in ../SLICE-PROVIDER-SESSIONS-1/accepted-source-identities.json.
