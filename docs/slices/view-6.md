# VIEW-6 — resizable panels

Status: built 2026-11-09 (human direction 2026-11-08: "I would like to have resizable panels on the page"). One file
changed (`src/view/static/index.html`); no server route, no relay file; the viewer still writes nothing on disk.
Maturity: PROTOTYPE.

## What was fixed

The VIEW-4 frame had its sizes as constants in CSS: `main { grid-template-columns: 280px 1fr 360px }` for the three
columns, `.pane { flex:1 }` for the two panes of the split, `#session { max-height:45vh }` for the drawer. A transcript
or a wide diff in the middle, a long related list on the right, a tall run in the drawer — none could be given more room.

## Design

**The lines between panels are the handles.** Each seam is a 5 px `.gutter` (`col-resize` / `row-resize` cursor, accent
colour on hover and while dragging): `#g-left` between the tree and the workspace, `#g-right` between the workspace and
Related, one created inside `#panes` when a second tab is pinned, and `#g-drawer` above the session drawer (a fifth row of
the body grid, replacing the drawer's top border).

**One CSS variable per seam.** The sizes moved from constants to variables with the old constants as defaults:
`--col-l` (280 px), `--col-r` (360 px), `--split` (50 %, the active pane's share when a tab is pinned; the pane is
`box-sizing: border-box` so the stored percentage is the measured one), `--drawer` (unset → the old 45 vh cap;
set → `height` and `max-height` both that value, so the drawer stops growing with its content). A drag rewrites one
variable on `:root`; nothing else in the page changes. Below 1000 px wide the page is one column as before and the
column gutters are hidden.

**`gutter(el, key, { axis, from, scale, sign, min, max })`** is the one drag routine for the four seams. On `pointerdown`
it takes pointer capture (the drag survives the pointer leaving the 5 px strip), reads the current size with `from()`,
and on every `pointermove` sets `layout[key] = clamp(base + delta × scale × sign)` and re-applies the layout; `sign` is
−1 for the seams whose panel grows when the pointer moves left/up (Related, the drawer); `scale` converts pixels to
percent for the split. Limits: columns ≥ 160 px and never squeezing the workspace under 320 px; split 15–85 %; drawer
80 px to window height − 200. Double-click deletes the value so the CSS default returns. Dragging the drawer's gutter
while the drawer is closed opens it first.

**Kept per browser.** `layout` is one JSON object in `localStorage` (`relay-viewer.layout`, absent keys = default),
read once at script start and applied before the first render, saved on `pointerup`. Reads and writes are wrapped in
try/catch: with storage blocked the sizes last for the page's life. Not persisted on the server: a per-viewer
convenience, and the viewer is read-only (VIEW-1).

**The pinned pane keeps its share.** `render()` rebuilds `#panes` on every tab change; the first pane gets
`.split-l` (`flex: 0 0 var(--split)`), so the ratio belongs to the workspace, not to the tab pair.

## Abstractions introduced (one line each)

- `gutter(...)`: one routine, four concrete callers (the three fixed gutters and the split's); axis of variation: which
  CSS variable, which direction, which unit — all parameters, no subclassing; rejected: four copies of the pointer
  handling (the capture/clamp/save sequence is the non-trivial part and would be duplicated).

## Proof (Playwright, glamCRM on 127.0.0.1:7788, 2026-11-09)

Walk `resize-walk.mjs` (scratchpad): columns start `280px 5px 1070px 5px 360px`; drag `#g-left` +120 → 400 px; drag
`#g-right` −100 → Related 460 px; `localStorage` holds `{"left":400,"right":460}`; reload → both kept. Two docs opened,
first pinned: share 50 %; drag the split gutter by 20 % of the workspace → 70 %; switch the active tab → still 70 %.
Drawer open at 450 px (the 45 vh cap); drag `#g-drawer` −100 → 550 px. Double-click `#g-left` → 280 px while Related
stays 460. At 900 px wide: one column, zero visible column gutters. No console errors. Screenshot
`shots-v6/v6-resized.png`.

First run of the walk failed on the split (75 % measured for 72.4 % stored): `flex-basis` applied to the content box and
the pane's 20 px of horizontal padding came on top — fixed with `box-sizing: border-box` on `.pane`; the test then held
exactly.

## Known limits

- Sizes are not re-clamped when the window shrinks after a drag (a 400 px tree + 460 px Related on a 1000 px window
  squeezes the workspace); below 1000 px the one-column layout takes over, and a double-click on either gutter restores
  the default. Clamping on resize is a follow-up if it bites.
- No keyboard operation of the gutters.
