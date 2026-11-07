# VIEW-1 — the diff and the files in a browser, with pointers beside them

Status: built 2026-11-07 under the human's standing direction ("continue as long as it's additive / orthogonal"); orthogonal to the relay — no relay file is edited, nothing is written, the relay neither knows nor needs the viewer process.
Maturity: PROTOTYPE.

## Problems served (from `docs/slices/lexmap-1.md` §Source)

- 3 — a PR or branch diff readable in context, not file by file alphabetically.
- 4 — move from file to file along identifiers and see what is there.
- 6 — browser views with highlighting for diffs and files, without interfering with agents, without opening a PR or an IDE.

## What it is

`npm run view -- <target> [--port <n>]` starts a read-only HTTP server on 127.0.0.1 (default port 7788) and serves one page with three columns:

- **Left** — the active slice from the target's `.agent-manager/` (`current.json`, the slice's `status.json`, its newest `build-<n>.md` and `review-<n>.json`, collapsible), then the candidate's changed files in **affinity order**: the file with the most rare identifiers on its changed lines first, then repeatedly the unplaced file that shares the heaviest identifiers with the files already placed, each row naming the identifiers that linked it and to which file. A file that shares nothing is placed alphabetically and the row says so. A greedy total order over a partial one, honest about which adjacencies are real.
- **Middle** — the selected file's hunks (`git diff -U3 HEAD`, context lines and old/new line numbers; an untracked file as all-added), or a whole file opened at a line. Click any identifier in the code: the word under the caret is looked up.
- **Right** — pointers. For a changed file: its unchanged neighbors in three lists (code to open / tests that exercise these identifiers / documentation that mentions them), computed by `neighborsOfTokens` over that file's changed-line identifiers with every changed file excluded. For a clicked identifier: `where` — files with likely definitions first, every occurrence as `line:col`, click to open the file there. The breadcrumb in the header records the hops (Miller-column navigation, as the second AI proposal recommended over a canvas).

Syntax colors come from highlight.js on cdnjs when the browser can reach it; otherwise the text is plain and everything still works. No build step, no framework, no new runtime dependency.

## Routes

`GET /` page · `GET /api/slice` · `GET /api/diff` · `GET /api/file?path=` (inside the target only; `.git` refused) · `GET /api/where?token=` · `GET /api/neighbors?path=`. Any other method: 405. The index is rebuilt when older than 5 s (parameter); every answer carries the index identity (`HEAD, uncommitted entries, inputs digest`) and the page shows its age.

## New code

- `src/core/lexmap/diff-view.ts` (pure): `parseDiffHunks` (unified diff with context → per-file hunks with line numbers, status modified/added/deleted/renamed, binary), `changedFileTokens`, `orderByAffinity`.
- `src/core/lexmap/lexmap.ts`: `neighborsOfTokens` (one exported function over the existing ranker).
- `src/adapters/lexmap/git-working-tree.ts`: `readCandidateChanges(…, contextLines)` — additive parameter, default 0 unchanged.
- `src/view/server.ts`, `src/view/static/index.html`, `src/cli/view.ts`, `package.json` script `view`.

Tests: `diff-view.test.ts` (parser incl. deleted/added/renamed/binary; ordering with a named link and an alphabetical fallback), `server.test.ts` (a real temp git repo with a slice trail: every route, read-only contract, path containment, hunks with line numbers, order, per-file pointers).

## Verified by hand on agent-manager itself (this candidate)

`/api/diff` ordered the seven new files by what they share (`index.html` first with the most rare identifiers; `diff-view.ts` linked by `oldNo, rareTokens, linkedBy`; `server.ts` linked to it by `FileDiff, OrderedFile, changedFileTokens`; `view.ts` linked to `server.ts` by `startViewServer`), and the pointers for the first file were partitioned code / tests / docs.

## Limits recorded

- Ordering is greedy over a partial order; it names links and says when it falls back, but it does not claim the order is the only right one.
- `/api/diff` reads the whole tree per request when the index is older than 5 s (0.1–1.7 s on the measured repositories); fine for one person, not designed for many.
- Highlighting needs the CDN; offline is plain text.
- No live agent activity yet — ACTIVITY-1.
