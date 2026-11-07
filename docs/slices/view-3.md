# VIEW-3 — the page as a reading tool: colors, links, menus, a legend

Status: built 2026-11-07 (additive / orthogonal: `src/view/static/index.html` only; no server route, no relay file touched).
Maturity: PROTOTYPE.

## What was wrong (human, from the glamCRM page)

1. **No syntax colors.** The page loaded the highlight.js *script* and never its *stylesheet*: hljs did wrap the code in `<span class="hljs-keyword">` etc., and with no rule for those classes every span kept the text color. A defect, not the "plain fallback" the page comment promised.
2. **Paths in capitals.** `h2 { text-transform: uppercase }` applied to the column titles, which carry the path ("Pointers for backend/…").
3. **Identifiers did not look like links.** The click worked through the caret position under the mouse, with no hover feedback, no pointer cursor, and no way to see the locations before jumping.
4. **Not intuitive.** No explanation on the page of what the columns, scores and pointers mean.

## What it is now

- **Colors.** An inline highlight.js theme (six token colors, light and dark, from the page's own variables) — nothing fetched from the network for styling. A whole file (or a whole hunk) is highlighted in one call so block comments and multi-line strings keep their state; the result is split into one HTML string per line, closing the spans open at each newline and reopening them on the next line, so every line still sits in its own row with its line numbers. Verified against the real highlight.js (11.11.1, amodx's copy) on a Java file, two TypeScript files, an 841-line SQL migration and the README: line counts preserved, every line's text identical after tag stripping, every line's spans balanced. Without the script the text renders plain.
- **Identifiers are links.** After highlighting, every identifier of 3+ characters in the code rows is wrapped in a span: hover underlines it with a pointer cursor. **Left click** lists every location on the right (`where`, definitions first) and jumps to the best one — the first file with a likely definition at its first definition line, else the top-ranked file at its first occurrence — unless the middle column already shows that line. **Right click** opens a menu of all locations (file:line, definition/use tag, occurrence count); picking one opens it. Escape, a click elsewhere, or scrolling closes the menu.
- **Find box** in the header: type an identifier, Enter, same as a left click.
- **Legend.** "How to read this page" at the top of the left column: what each column is, what a click does, what the score means, that pointers are hints.
- **Order of the left column**: changed files first (the main navigation), then slice, activity, bridges. When the working tree equals HEAD the note says so and names the three other ways to open a file.
- Titles no longer transform case; the path part is in the text color.

## Not done

- No keyboard navigation (next/previous occurrence). No "find in file".
- The hover does not yet say whether an identifier is in the index, common (noise) or absent; that costs one request per hover and waits for a reason to exist.
- The jump target "first file with a likely definition" inherits `where()`'s heuristic (a definition keyword before the name). Where a language has no such keyword before the name (C function definitions, SQL columns), the best location is the top-ranked file's first occurrence.
