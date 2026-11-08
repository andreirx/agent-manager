# TRANSCRIPT-1 — the relay's trail in the viewer: condensed transcripts, indexed; raw logs, readable

Status: built 2026-11-08 (human direction the same day; no relay file touched — the adapters' capture gained one write at run end).
Maturity: PROTOTYPE.

## What was wrong (human, after VIEW-5c)

The sessions a user wanted to inspect — what the agents said and which files they touched — were on disk under
`<target>/.agent-manager/` the whole time and never in the tree. Cause: the index enumerates
`git ls-files --cached --others --exclude-standard`, and `.agent-manager/` is gitignored (ratified 2026-06-28 as the
local process trail). The tree is the index, so the trail was invisible by construction.

The raw run logs (`.agent-manager/logs/*.txt`, 753 files / 1.1 GB on glamCRM) have a uniform header and then the
provider's raw stream verbatim — Claude `stream-json`, Codex `--json` — of which the agent's own words are about a
tenth (PL-TOOLS-2 builder log, 2.17 MB body: prose 0.01 MB, tool calls 0.15, thinking 0.38, tool results 0.20,
1,233 `system` lines 0.28, the rest envelope). Too large to read, too large to index, and in two grammars.

## Ruling (human 2026-11-08)

Show the trail in the tree. Condense the transcripts with a script (strip what makes them hard to read), keep the FULL
version on disk but exclude it from indexing, and let the full version be opened as a text file in the interface.
Recommendations accepted: index `slices/**` + `transcripts/**` (not `logs/`, `activity/`, `journals/`); thinking blocks
out of the condensed form; the agent's prose into the live event log as `say` events.

## Design

**The uniform layer already existed.** `core/activity.ts` parses each provider's stream into one event shape
(read / edit / exec / search / note) for the live `.agent-manager/activity/<runId>.ndjson`. The only thing it dropped
was the agent's prose. TRANSCRIPT-1 adds the kind **`say`** (`text`): Claude `assistant.text` blocks, Codex
`agent_message` items. No new provider grammar was written.

**`core/transcript.ts`** (pure):

- `renderTranscript(events)` → Markdown: `# <runId> · <role> · <provider>`, a facts line (slice, started, ended,
  status, mode/model), then the prose as paragraphs and the tool calls as list lines in order —
  `- read \`path\``, `- edit \`path\``, `- $ \`command\` → exit n` (fenced when long, multi-line or carrying a
  backtick), `- search \`/pattern/\` in \`path\``. Never tool results, thinking or edit text.
- `eventsFromRawLog(text, root)` → the events the live capture would have written, for the backfill: the header
  (`Run ID`, `Slice ID`, `Role`, `Provider`, `Started`, `Completed`, `Exit Code`, `Timed Out`, `Error`) and the stream
  taken from the right fence (`## Transcript (stream-json events)` for Claude, `## STDOUT` for Codex — not the
  `## Final Text` block), fed through the same parsers. Times: the stream carries none, so every event gets the
  header's `Started`; `run-end` gets `Completed`.
- `transcriptTouches(markdown)` → the read/edit paths back out of a rendered transcript (round-trip tested), and
  `transcriptStarted(markdown)` → the start time from the facts line. These make a rendered transcript the single
  source for "which runs touched this path", with no second read of the events.

**Live path** (`adapters/activity/capture.ts`): the events are kept in memory; `end()` closes the ndjson and, when the
log was writable (an `.agent-manager/` exists), writes `.agent-manager/transcripts/<runId>.md`. Best-effort as before:
a transcript that cannot be written costs nothing. The four adapters ignore the new return value.

**Backfill** (`npm run transcript -- <target> (--all | <runId>…) [--force]`): replays every raw log under
`.agent-manager/logs/` through `eventsFromRawLog` and writes the transcript it would have had; existing transcripts
are kept unless `--force`. Result on glamCRM: see §Measured.

**Index** (`adapters/lexmap/git-working-tree.ts`): `WorkingTreeReadParams.includeTrail` (default **false**) adds
`.agent-manager/slices/**` and `.agent-manager/transcripts/**` to the enumeration. The viewer passes `true`; the relay's
reviewer hints (`candidateLexicalHints`) keep the default, so the reviewer context is byte-identical to before
(`renderPartitions` prints the sessions block only when rows exist).

**Core classes** (`core/lexmap/lexmap.ts`): `PathClass` gains **`session`** = everything under `.agent-manager/`
(transcripts, briefs, build reports, verdicts — the relay's sessions on this target). `NeighborRows.sessions` is a
fourth partition capped by `maxSessionRows` (8); sessions sort after docs in `where`; `bridge` skips sessions like
tests (a transcript names whatever the agent touched on both sides — no bridge).

**The trail is not population.** First measurement on glamCRM: with the trail counted in `N`, the file count went
1,117 → 2,904, the noise cutoff (5 % of N) from 56 to 146 files, so handler boilerplate (`withWarmup`,
`documentsBucket`, `APIGatewayProxyResultV2`) stopped being noise and the sibling handlers `products.ts`,
`estimates.ts`, `offers.ts` overtook `price-list-service.ts` as the top neighbor of `handlers/price-lists.ts` — the
ruled ranking degraded in the viewer. Second measurement, with slice reports as `doc`: the code rows were back, but
`PRICELIST-MODIFIER-1/build-progress.md` and three reports pushed `docs/API-SPEC.md` and `docs/ROADMAP.md` out of the
eight doc rows. Final rule: `buildLexmap` computes `df`, `N` and the noise cutoff over the **repository files only**;
trail files are indexed as locations and neighbors, earn no def-bonus, and a key the repository never uses is not
indexed (it has no rarity and links nothing). Verified: `lexmap neighbors` on that handler is byte-identical with
and without `--trail` for code, tests and docs; the trail appears only in the sessions block. `stats.files` is the
population; `stats.trailFiles` the rest (1,117 + 1,787 on glamCRM; the `runs/*.json` records are not indexed at all).

**Viewer** (`view/server.ts`, `static/index.html`): `.agent-manager/` is in the tree; `/api/files` adds `extra` — the
raw logs, in italics, opening as plain text with a "Raw log —" heading and identifiers unlinked past 400 K characters;
a transcript opens as a "Transcript —" tab whose `- read`/`- edit` lines open the file; Related gains "Sessions that
talked about these names" (lexical, from the index) and "Runs that touched this file" (structural, from
`/api/sessions?path=` — a file or a directory prefix); the drawer's run rows and header link to the run's transcript,
and its event list shows `say` lines (click to expand).

## Abstractions introduced (one line each)

- `core/transcript.ts`: pure render/recover of condensed transcripts; users: the capture (live), the CLI (backfill),
  the server (touches); axis: none new — cohesion of one document format with three callers; rejected: rendering
  inside `activity.ts` (would mix the event model with a document format).
- `say` event kind: variants fixed, operations growing → sum type; the exhaustive `switch` in `renderTranscript` is
  the list of sites to revisit when a kind is added; rejected: a `note` with `detail` (a name that hides the content).
- `PathClass.session`: same axis as the three ruled partitions; rejected: `doc` (would mix "the agent said" with
  "the docs say", and let transcripts into bridges).
- `includeTrail`: two concrete callers that must differ (viewer vs reviewer hints); rejected: always include (silent
  change of the reviewer context).
- `/api/sessions`: one route over data the index build already holds; rejected: client-side parsing of every
  transcript (N requests per tab).

## Measured

- Tests: see the commit (activity parsers, transcript render/recover round trips, capture end-to-end in a temp dir,
  adapter trail inclusion, core classes, server routes).
- glamCRM backfill and index effect: recorded in the commit message and §7 below after the run.

## Known limits

- Backfilled transcripts carry one time for every event (the header's `Started`): the raw stream has no timestamps.
  Live transcripts carry real times.
- Codex reads happen inside shell commands; a Codex transcript lists commands, not files read, so "Runs that touched
  this file" shows Codex runs by their edits only (`file_change` shape still unverified — TD-038).
- The 2026-11-07 runs of PRODUCT-REMARK-1, PRODUCT-ADMIN-UX-1, CATEGORY-SPLIT-1 and BEST-GUESS-UNITS-1 have run records
  whose `logPath` points at files that do not exist (TD-039); their activity ndjson exists, so the live-path transcript
  will exist for runs after this commit, but those runs have no FULL version to open.
- Feeding a builder's condensed transcript to the reviewer (the token saving) is a relay change — a follow-up slice
  with its own dry-run parity gate, not done here.

## 7. Backfill result (glamCRM, 2026-11-08)

`npm run transcript -- ../glamCRM --all --force`: 746 raw logs → 630 transcripts (11 MB; the raw logs are 1.1 GB),
116 earlier attempts superseded by the later log of the same run, 12 with no recognized events (empty streams).
305 Codex reviews from before `codex --json` had a plain-text verdict alone under `## STDOUT`; the recovery keeps such a
stream as one `say`, so those transcripts carry the verdict (`review-GC-RATE-FETCH-1-0.md`: "STATUS: revise …").
A Claude builder transcript (`build-PL-TOOLS-3-3.md`, 45 KB from a 2.2 MB log) lists 28 commands and no `Edit` —
that builder worked through heredocs, which is the truth of that run.
