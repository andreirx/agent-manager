STATUS: revise

The refinement resolves the prior phase, semantic-command, zero-call apply, and tracked-attribution concerns. Two preservation details remain:

1. **Clarification must re-deliver the admitted input closure.**  
   `--clarify-pending` currently specifies session, provider/model, and read-only posture, but not the same reviewed inputs/baseline validation required by SPS-P01 and MMI-P01. Before the clarification provider call, revalidate current inputs and deliver the same applicable role context plus the focused clarification text. Session memory is not an input substitute. Candidate/input drift must refuse before that call.

2. **Clarification lacks a manager identity input.**  
   `--clarify-pending <text-file> --slice <id>` cannot populate the required immutable audit entry’s manager identity if the clarification remains pending or fails. Add `--manager-id <id>`; retain the text-file digest and request/result identities as the clarification evidence. The text itself is the focused question/rationale; no provider envelope or digest re-entry is needed.

The attribution correction is otherwise sound: runtime-appended, explicit manager/rationale/source-run/raw-output statements in existing durable `limitations`/`report` text preserve frozen schemas and provider performer identity. It must be generated from the pending state, not accepted as provider-authored text.

No new interpreter service, tracked artifact family, or session-design change is required.