# VIEW-5 — what a scripted walk of the page found, and what it changed

Status: built 2026-11-07, from a Playwright walk of the running viewer on glamCRM (find → focus/jump → click identifier → all locations → context menu → tree → related → session drawer → bridge; screenshots read one by one).
Maturity: PROTOTYPE.

## Findings, by the two readers

### Someone reading unfamiliar source

1. **Wrong jump target** (defect). Typing `PriceListService` jumped to `const priceListService = new PriceListService(` in a TS handler, not to `public class PriceListService` in Java; clicking `PriceListRepository` jumped to a `const priceListRepository` in the same file. Cause: concept keys merge the class and the variable spellings, `const` is a definition keyword, and `where()` ranked files by definition count without regard to spelling. **Fixed in the core**: every occurrence now carries its spelling; a file's `exactDefinitions` (definitions spelled as asked) sorts first; the page's best location is "a definition spelled as asked, else any likely definition (saying `as priceListService`), else the top file". Test: the Java class outranks the TS variable for `PriceListService`; the TS file wins for `priceListService`.
2. The find box kept the old text after a click changed the focus. Fixed: the box always shows the identifier in focus.
3. "cross-language" was stamped on documentation rows (a doc is not a language). Fixed: code rows only.
4. The header's identity line (`HEAD …, 0 uncommitted entries, inputs sha256:…`) was 100 characters nobody reads. Now `HEAD 32e83ed · clean · 1112 files`; the full identity and the index age are the tooltip.
5. Bridges defaulted to `.run ↔ backend` — an IDE directory — and listed `envs`, `parser`, `profiles`, `enabled`. Fixed: top-level directories first, by file count, dot-directories last, so the default pair is the two largest modules (`backend ↔ serverless` on glamCRM: Java ↔ TypeScript, the pair the feature exists for).
6. The Related column works: for `handlers/price-lists.ts` it names `services/price-list-service.ts` (shares `checkedModifierPercent, deletePriceList, reimportPriceList, …`) and the Java `PriceListController.java` as cross-language — the concept keys delivering what the eval could not measure on single-language repos.
7. Kept, noted: the Related column's explanation is permanent prose; the tree has no path filter; two tabs with the same basename are told apart only by their tooltip.

### Someone checking what an agent did

8. **"Session — no active slice" while eight runs existed.** The drawer keyed on `current.json` only. Fixed: `/api/slice` lists every slice under `.agent-manager/slices` with phase, iteration, last update and actor (newest first), the drawer offers them in a picker (the active one marked), and `?id=` opens any of them with its newest build report and review verdict. The summary line now names the slice and the run.
9. **Runs were a `<select>` of ids.** Fixed: the runs list shows when · id · role · provider, newest first, the chosen one bold (the server reads the `run-start` line of each log for slice/role/provider/time).
10. **Commands were cut at 70 characters** — the only trace a Codex run leaves. Fixed: click the line to see the whole command.
11. A reviewer run showed no "uninspected neighbors" with no explanation. Fixed: the block says it is computed for builder runs only.
12. Kept, noted: reads are not observable for Codex (they happen inside shell commands) — the note now says why.

## Method

`scratchpad/ux-walk.mjs` drives headless Chromium (amodx's Playwright 1.57) against the running viewer and writes one screenshot per step; the context-menu step is checked by reading `#menu` after a dispatched `contextmenu` (it had right-clicked `import`, a noise word, so the one-line menu was correct). Console errors: none. A viewer process started before this slice serves the new page but not the new fields; the page degrades (no slices list, best location by any definition) and the restart banner on the tree already says what to do.
