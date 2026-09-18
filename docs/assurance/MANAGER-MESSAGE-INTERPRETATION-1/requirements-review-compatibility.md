STATUS: approved

The correction is feasible and preserves v2 admission:

- `buildBuilderContext` and `buildReviewerContext` already create the final generated task directive; `roleSpecificInputs` appends it after the unchanged captured role-prompt and selection bytes.
- For v2 delivery, existing captured prompt paths/digests and `acceptedCommonInputs` remain the admission basis. Updating only generated directive text therefore avoids instruction-digest drift on interrupted admitted slices.
- The directive can explicitly supersede historical exact-envelope wording while retaining complete semantic evidence/assessment duties. No prompt-file edit, new prompt path, registry, or baseline rewrite is needed.
- The compatibility rule is stated generically for unfinished v2 work and MMI-L05 already covers requirements review; it therefore applies to requirements/design items as well as implementation when the prerequisite’s missing-ID guard is corrected.

This is a bounded runtime/directive change, not a weakening of input or candidate-drift checks.