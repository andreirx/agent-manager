# Manager checkpoint after review 0

Date: 2026-09-12T13:21:34.648Z
Disposition: focused document correction, not operator acceptance. Terra review-0 remains approved verbatim; this is separate manager evidence.

## M-A2-PREP-01 — predecessor bridge is not executable as specified

Source: src/core/assurance.ts:1024-1026 requires the selected sliceDoc to be an allocation dependency; src/application/use-cases/relay-target.ts admitBaseline reads every dependency and revalidates before each role. A2-C09 currently proposes the accepted ASSURANCE-2 implementation baseline admitting a document item that CREATES docs/slices/assurance-3-evidence-linked-review.md. That file cannot be both absent/new output and existing hash-bound allocation input. The current legacy SPEC convention also points sliceDoc at the document authored, so changing the pointer silently is not a solution.

Required correction: make the actual document-posture bridge precise and executable, distinguishing its existing authorizing allocation input from its newly authored review subject/output, with exact prepared fields and test oracle. Preserve v1 grammar, frozen inputs and legacy SPEC decision discovery. Use the already-ratified document posture and existing allocation mechanism where possible; do not weaken/bypass admission or invent approval. Demonstrate the proposed setup against the actual predecessor checks in the document's reasoning. If a genuinely new consequential choice remains, surface it; do not invent one merely to solve a local packet detail.

## M-A2-PREP-02 — specify input/output separation for the self-modifying increment

Stage2 explicitly edits builder-target.md and reviewer-target.md, while the previous INPUT-3 manifest hashes them as target governance. The new implementation baseline must not freeze intended target outputs then block their authorized edits before review. Specify which starting prompt bytes come from the accepted runner snapshot, which target paths are mutable outputs, which baseline dependencies remain immutable, and how the subsequent fresh candidate runner supplies the new reviewed prompts. Do not reuse INPUT-3 or rehash it in place. Check all runtime output paths versus the future input closure, including target-owned-relay.md. The user authorized a new implementation baseline, not an impossible input/output identity collision.

Scope remains exactly the two allocated draft documents. No source/H/prompt/roadmap edits. No new human decision is required for an evidence-supported refinement already implied by admitted document work. Preserve all original obligations.
