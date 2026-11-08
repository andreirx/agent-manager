# VIEW-2 — bridges between modules, in the viewer

Status: built 2026-11-07 (additive / orthogonal: viewer only; no relay file touched).
Maturity: PROTOTYPE.

## Problem served

5 — "keywords and how they map between modules in different languages". LEXMAP-1 answered it on the command line (`bridge <dirA> <dirB>`); this puts it on the page.

## What it is

Left column, "Bridges between modules": two pickers listing the tree's directories (two levels, with file counts and languages seen beneath), and **show**. The right column then lists the identifiers both directories contain — ranked by rarity × spread on the smaller side (`weight × (1 + ln min(filesA, filesB))`, VIEW-5c; was weight with spread as tie-break, then the sum of both sides in VIEW-5b) — each with how many files on each side hold it and one example file per side; click the identifier for `where`, click a file to open it. The note on the panel says what every row is: a lexical bridge, not a resolved symbol.

Routes: `GET /api/dirs`, `GET /api/bridge?a=&b=` (400 unless two different directories). Pure helper `directories(map, depth)` in `lexmap.ts`.

## Not done, by decision pending

Builder-side injection (neighbors of the packet's named files into the builder's context) changes what every builder in every relay receives at its next launch; it is not orthogonal in the sense the human set, so it waits for an explicit ruling rather than shipping under the standing direction.

## Limits

The bridge ranking has the same two faces measured in TD-037: by weight it favours thin 1↔1 links; by spread it surfaces ecosystem vocabulary. The page shows the weight order with the spread beside each row so the reader can see both.

### Ruling (human 2026-11-07)

Builder-side injection: **no**. The builder is told how to use the index itself (the target's CLAUDE.md names the command); the reviewer keeps the pointers about what the diff touched. Closed.
