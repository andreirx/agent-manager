# REVIEW-UNINSPECTED-1 — the reviewer is told which code neighbors the builder never opened

Status: built 2026-11-08 (human direction the same day). Additive to the LEXMAP-1 reviewer hints; the relay's
invocations are unchanged (dry-run parity).
Maturity: PROTOTYPE.

## The question that led here (human, after TRANSCRIPT-1)

Is there value in feeding the builder's transcript to the reviewer? Measured on glamCRM (99 slices): the reviewer
context is the selection packet (median 3.7 KB), the builder's run report with its EXECUTED evidence (7.1 KB), the
lexical hints (3–5 KB), the task and contract, plus 38 KB of fixed prompts; the reviewer reads the diff itself. A
condensed transcript is a median 25 KB (p90 47 KB) and carries the builder's *path* — which files it opened, how it
reasoned. For a reviewer that is anchoring, not evidence. Declined.

The one piece of the transcript's information that is evidence: **what the builder did not look at**. ACTIVITY-1
already derives it for the viewer from the recorded events (never from prose): the candidate's code neighbors minus
the paths the run read or edited. Fed to the reviewer it is a directive about what to check, ~0.5 KB.

## What changed

- `core/lexmap/lexmap.ts`: `uninspectedNeighbors(report, touched)` — one rule, two callers (the viewer's block, which
  now uses it, and the reviewer context); `renderUninspectedSection(rows, seenCount, totalCode)` — the section text,
  which states the basis ("of the N code neighbors, the builder read or edited K; the M below it never opened") and
  that a shared name is a lexical match, not a finding. Empty rows print "None — the builder opened every code
  neighbor", so the reviewer knows coverage was complete rather than unknown.
- `adapters/activity/ndjson-log.ts`: `readActivityEvents(workingDir, runId)` — the run's events; `[]` when absent.
- `adapters/lexmap/git-working-tree.ts`: `candidateLexicalHints(targetDir, builderRunId?)` appends the section when
  the run's first event says `provider: claude`. Any other provider: nothing is added — Codex reads happen inside
  shell commands (TD-038), so a list would call every neighbor "unopened". No run log: nothing is added.
- `application/use-cases/relay-target.ts`: the `lexicalHints` dependency receives `build-<slice>-<iteration>` — the
  builder run whose review this is. One argument; the dependency's old shape still type-checks.

## Abstractions introduced (one line each)

- `uninspectedNeighbors`: a function lifted from the server into the core because a second caller appeared; axis:
  none; rejected: duplicating the filter in the adapter.
- `readActivityEvents`: the read side of the log writer that already existed in the same module; two callers (the
  adapter here; the viewer still parses inline — folding it in is a follow-up, not a behavior change).

## Live proof (glamCRM, 2026-11-08)

`candidateLexicalHints('../glamCRM', 'build-GC-WS-ACQUISITIONS-2-0')` — the builder run under review at the time:
the LEXMAP-1 hints are 6.1 K characters; the new section adds 3.3 K: "Of the 20 unchanged code files above …, the
builder's recorded activity shows it read or edited 0. The 20 below it never opened", headed by
`frontend/workspace/src/pages/OfferDetailPage.tsx` (136.5, 113 shared rare names with the changed lines) and
`features/tablou/TablouPage.tsx` (79.7). That builder read 4 and edited 4 files, none of them a neighbor — a real
signal for the reviewer, not an artifact. A run with no Read/Edit at all (`build-GC-WS-ACQUISITIONS-2-1`: 22 shell
commands, nothing else recorded) gets the 356-character unobservable note instead. On the nine Claude builder runs
recorded on glamCRM, three have no Read/Edit event (verify-and-report iterations), six have 1–15.

## Known limits

- Claude builders only; a Codex builder's reviewer gets the LEXMAP-1 hints as before and no coverage statement.
- "Read" means a `Read` tool call; a file the builder inspected through `cat`/`grep` inside Bash is not recorded.
  A run with no Read/Edit at all (glamCRM `build-GC-WS-ACQUISITIONS-2-1`: 22 shell commands, nothing else) is
  reported as *unobservable* — "none can be subtracted; treat every row above as unconfirmed" — never as "opened
  nothing". The test for "blind" is the number of files the run touched anywhere in the tree, not the overlap with
  the neighbors: the first live proof keyed on the overlap and called `-2-0` (4 reads, 4 edits, no neighbor among
  them) blind, which hid a real signal. Found on the live run; fixed before commit.
- Runs whose activity log is missing (none observed; TD-039 concerns the raw logs, the ndjson exists) get no section.
