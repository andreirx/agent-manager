# Standalone reviewer-model review (the E2E usefulness gate's second agent)

A template + discipline for running the **reviewer model (Codex) as an independent second opinion
OUTSIDE the relay loop** — e.g. the End-to-End Usefulness Protocol's two-agent gate (assess a smoke
run / a checkpoint against the VISION), or any one-off adversarial review of an analysis.

## Why this exists (the failure it prevents)

The relay's in-loop Codex reviews are reliable because they judge a **self-contained `git diff`** —
they never need facts outside the working tree. A standalone review that asks the model to *assess a
subject* (e.g. "is this nginx representation good?") will tempt it to fetch **external ground-truth**:
it issues `web search:` and MCP (`node_repl/...`) tool calls, and on a flaky connection loops on
`ERROR: Reconnecting... 1/5..5/5` indefinitely (observed 2026-06-29: ~3h, zero output). See
`docs/TECH-DEBT.md` ("standalone Codex review loops on web search").

The fix is to make the review **self-contained and tool-free**: inline the evidence, forbid tools,
and tell the model it does NOT need external ground-truth — judge OUTPUT QUALITY only.

## Invocation (read-only — safe alongside other work)

```
codex exec --sandbox read-only -C <target-dir> - < /tmp/review.txt
```

`--sandbox read-only` = the model can read local files but cannot write/build/commit. Prompt on stdin.

## Prompt skeleton (fill the «slots»; keep the constraints verbatim)

```
You are an independent senior reviewer giving a SECOND OPINION. This is a PURE-REASONING review of
evidence provided INLINE below.

CRITICAL CONSTRAINTS — READ FIRST:
- Do NOT use web search. Do NOT use node_repl or run code. Do NOT call ANY tools or fetch anything
  external. You do NOT need external/ground-truth knowledge of «the subject».
- Judge OUTPUT QUALITY — honesty, internal consistency, «criteria» — purely from the inlined evidence.
  (You MAY optionally open local files «paths», but everything essential is inlined; do not go looking.)
- Respond with your written verdict directly, now.

CONTEXT: «what this is — the product/VISION in 3-4 sentences».

============ RAW EVIDENCE (inlined) ============
«paste the actual captures / outputs / diffs — the model judges THESE, not a re-derivation»

============ MY ASSESSMENT (challenge each point, cite the inlined evidence) ============
«the analyst take: numbered claims»

============ RETURN ============
- VERDICT on «the decision».
- For each claim: CONFIRM / CHALLENGE / REFINE, with a cited line from the inlined evidence.
- Anything I OVERSTATED or got WRONG. Anything I MISSED.
- Your single highest-priority recommendation.
Be concise and evidence-cited.
```

## Discipline (the three rules that make it land)
1. **Inline the evidence.** The model reviews what you paste, not what it re-fetches. No "go read X".
2. **Forbid tools + state "no external ground-truth needed."** Removes the reason to web-search.
3. **Read-only sandbox.** No collisions with a concurrent build/release; the review can't mutate state.

A landed run looks like: `gpt-5.5 ... reasoning effort: high ... tokens used N` then the verdict —
NOT a `web search:` / `Reconnecting` loop. If you see the loop, kill it and re-run self-contained.
