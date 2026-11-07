# VIEW-4 — a fixed orientation frame around a workspace of opened files

Status: built 2026-11-07 (page + one read-only route; no relay file touched).
Maturity: PROTOTYPE.

## What was wrong (human, after VIEW-3)

The three columns were all dynamic: every click replaced the middle view and the other two columns changed with it, so the reader lost their place. The left pane mixed navigation with session state nobody had explained. Opened files were not kept anywhere; the breadcrumb was the only way back.

## Ruling (human 2026-11-07)

Workspace = **tabs + one split**: every opened file is a tab, one is active, a second can be pinned beside it. Floating windows were declined (window management, small-screen chaos, "related to which window?"); tabs-only was declined for the lack of side-by-side comparison.

## What it is

- **Focus band** (top, fixed): the identifier in focus — spelling, concept key when it differs, file count, rarity, its likely definition (or top location) as a link, and "all locations ▾" (every file with its occurrences and spellings). Set by a left click on any identifier, by the header's find box, or by a bridge row.
- **Repository tree** (left, fixed): every indexed path (`GET /api/files`, served from the index, no extra I/O), collapsed to the first level; directories render their children on expand, so a 16,000-file tree costs nothing until opened. Opening a file expands its ancestors, marks it and scrolls it into view. Changed files carry an orange dot. Below: the **open files** list with the line reached; click to activate.
- **Workspace** (middle): the tab bar (Δ marks a diff tab; ⊞ pins a tab beside the active one, ⊟ unpins; × closes), then one or two panes. File texts are fetched once per path. A left click on an identifier reuses the file's tab when it is already open and scrolls it to the line.
- **Related** (right, fixed): the pointers for the *active tab only* — code / tests / docs for a file, or the candidate's per-file pointers for a diff tab — plus the bridge picker. A focus change never alters this column.
- **Session drawer** (bottom, collapsible; opens by itself when there is a candidate): the slice (what `current.json`, `status.json`, `build-n.md`, `review-n.json` are and say), the candidate's changed files in affinity order (click → diff tab), the agent run (what the activity log is, its events, the uninspected neighbors). Each block starts with a sentence saying what it is and where it comes from.
- Carried over from VIEW-3: inline syntax theme with whole-file highlighting split per line, identifier links, right-click location menu.

## Compatibility

A viewer process started before this slice serves the new page (read from disk per request) but lacks `/api/files`; the page then builds the tree from the changed paths and says "restart `npm run view` for the whole tree".

## Not done

- No keyboard tab switching; no drag to reorder tabs.
- The split is one pinned pane, not an arbitrary layout.
- The tree does not filter; the find box is for identifiers, not paths.
