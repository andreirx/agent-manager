STATUS: revise

### Findings

1. **MMI-L02/L04 — command and attribution contract is not yet concrete enough.**  
   Define one slice-local `manager-interpretation` command payload: semantic result content plus manager ID/rationale only. The runtime must derive envelope/version, run identity, allocation/subject/candidate identities, and durable-record fields from retained state—not accept them from the manager.  
   - For stage-3 evidence: manager provides checks, change justifications, limitations, report.  
   - For requirements/implementation review: manager provides outcome, assessments, findings, decisions, report.  
   - For legacy unknown verdict: manager provides `approved|revise|escalate` plus rationale.  
   Existing assurance parsers then validate the runtime-constructed complete object. This preserves coverage checks and prevents a bare approval from becoming acceptance.

2. **MMI-L04/L05 — pending state needs an exact restart-safe identity binding.**  
   Add an `awaiting-manager-interpretation` target phase and a compact, closed `pendingInterpretation` record in existing `.agent-manager/slices/<id>/status.json`. It should reference:
   - role, pending run ID and existing `runs/<name>.json`;
   - immutable raw-output artifact path and digest;
   - applicable output contract and structural diagnostics;
   - manager interpretation audit entries: manager identity, timestamp, rationale, semantic input digest, and resulting route.  
   This is durable operational evidence across restarts, distinct from provider text, without introducing a tracked cross-target artifact or a new service. The slice should explicitly state this meaning of “durable”; it is not human acceptance or an ASSURANCE-4 record.

3. **MMI-L03/L05 — the exact interrupted-step routing must be specified.**  
   Applying an interpretation must itself make no provider call:
   - malformed builder evidence → construct/validate evidence → `review-impl`;
   - malformed implementation review → construct/validate review → existing refinement/decision/publication route;
   - malformed requirements review → construct/validate review → existing refinement/decision/create-only requirements-review route;
   - legacy unknown verdict → existing verdict route.  
   Before application, re-read and reject changed raw output, run/status mismatch, input drift, or stage-3 candidate drift. Pending state survives restart and a plain relay resume must stop with the concrete manager action rather than dispatching a builder.

4. **MMI-P02 — preserve the defined legacy verdict contract; do not expand regex interpretation.**  
   `parseVerdict`’s existing recognized `STATUS:` values may retain automatic routing as the defined legacy contract. Unknown verdicts and non-contract/free-form drift become pending manager work. No alias catalogue or new regex extraction is justified; this reconciles “manager, not regex, interprets” with preservation of existing correct routing.

### Smallest integration

Keep this inside existing `src/application/use-cases/relay-target.ts` and `src/cli/relay-target.ts`.

- At the three strict provider-result sites—builder evidence around `relay-target.ts:1583`, implementation review around `:1743`, and requirements review around `:1813`—retain the existing raw artifact and run record first, then replace parse-failure blocking with persisted pending interpretation.
- The raw final text is already retained as `build-<n>.md` or the `raw` member of `review-<n>.json`; the corresponding `runs/<name>.json` supplies actual provider/run/model identity (`makeRunRecord`, `:1236`). Do not rewrite either as provider-authored normalized output.
- Add CLI operations such as `--apply-manager-interpretation <file> --slice <id> --manager-id <id>` and `--clarify-pending --slice <id> ...`. The JSON file is a machine command input, not a provider-response schema.
- Clarification uses the prerequisite slice’s saved same-role session binding, with `mode: review` and `permission: read-only`; it neither increments iteration nor permits builder edits. It appends a retained clarification result to the same pending record. If session binding is unavailable/mismatched, remain pending—never start a fresh conversation.
- Reuse `parseImplementationEvidenceResult`, `parseImplementationReviewResult`, and `parseRequirementsReviewResult` by injecting runtime-owned references before validation. No new parser, normalization model, provider branch, module, port, or service is needed.
- Update `docs/contracts/target-owned-relay.md`, `docs/MANAGER.md`, and fresh-dispatch builder/reviewer role instructions: semantic completeness and evidence remain required; exact provider JSON envelopes, hashes, and field spellings do not.

### Paths and preservation

- **Normal:** valid structured results continue through current automatic paths.
- **Alternate:** framing tolerance remains `extractProviderResultJson` (`src/core/assurance.ts:607`); field-shape/prose drift becomes retained pending state.
- **Error:** incomplete manager content, fabricated coverage, stale run/raw/candidate, changed reviewed inputs, unavailable session, or contradictory evidence refuses application and leaves the item pending.
- **Preserved:** stage-3 candidate checks/publication ordering (`relay-target.ts:1745–1800`), reviewer independence, input admission, create-only durable publication, and human decision routing remain unchanged.

### Required verification additions

Hermetic target-relay/CLI tests only:

- TD-020-style alternate evidence/review output → pending → manager interpretation → correct next state, with no repeated builder/reviewer call.
- incomplete “accept” interpretation remains pending;
- stale raw/run/input/candidate refuses;
- restart retains pending state with zero provider calls;
- same-role read-only clarification uses the saved prerequisite session and does not increment the implementation cycle;
- all three structured paths plus legacy unknown verdict;
- retained raw provider text and separate manager attribution are inspectable.

This directly serves the VISION: runtime remains responsible for inspectable workflow state and routing, while the manager retains semantic judgment and the human stays out of transport work.