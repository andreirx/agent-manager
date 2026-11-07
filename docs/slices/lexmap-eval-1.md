# LEXMAP-EVAL-1 — the ranking oracle (TD-037) and the first measured answer

Status: built 2026-11-07; measured the same day on six repositories; the default ranking awaits the human's ruling (§5).
Maturity: PROTOTYPE.

## 1. Problem

LEXMAP-1 ranks a neighbor by the plain sum of the weights of the identifiers it shares with the query. A file with many distinct identifiers shares more by chance, so TD-037 predicted that big files float to the top whether or not they are about the same thing. Until now that was a prediction. Nothing could say whether a ranking change made the pointers better or worse except an argument in a review.

## 2. What was built

- **Variants, fixed** (`LexmapParams.ranking`, exhaustive switch, default `sum` = unchanged behaviour; the reviewer-context fixture stays byte-identical): `sum`, `sqrt-norm` (÷ √ distinct tokens of the candidate), `saturated` (× K/(K+n), K = 150), `def-bonus` (a shared token the candidate likely defines counts twice), `min-shared-2`, `combined`. Each one is a few lines in one function; `FileEntry.tokenCount` and `TokenEntry.defFiles` are the two facts they need.
- **Concept keys** (`LexmapParams.conceptKeys`, LEXMAP-2 behind a flag): `settleOrder` ≡ `settle_order` ≡ `SettleOrder`; the index keeps every spelling and shows the most frequent one. Measured here as a second dimension (`+keys`).
- **Sheets** (`fixtures/lexmap-eval/<repo>.md`, tracked): seeded sample of 6 program-source query files per repo; per query the baseline's top 20 code rows plus 5 random code files, **shuffled, with no score shown**, so position and score cannot bias the labeller. A label is `[x]` related — *a reviewer of a change in the query file would need to open this file* (defines what it uses, uses what it defines, the other half of the feature) — `[ ]` unrelated, `[?]` unsure; every line carries a reason after `⇒`.
- **Extension step** (`extend`): a re-ranking promotes files from outside the baseline's top 20; those are unlabelled and would make the number undecidable. `extend` appends them under their query; a second labelling pass closes the gap. After it the condensed and pessimistic precisions coincide (unjudged-in-top = 0 below).
- **Scoring** (`score`): per variant, mean over queries of P@10 (condensed and pessimistic), R@10 (labelled-related found in the top 10 over all labelled-related), unjudged-in-top; `--moves` lists what entered and left the top 10 against `sum`, with labels — the examples.
- Commands: `npm run lexmap-eval -- sample <repo> [--queries n --seed n]`, `extend <sheet>…`, `score <sheet>… [--moves --json]`.

## 3. The labelled set

Six repositories, 36 queries, 1,012 labelled pairs after the extension (every line reasoned; no `[?]` was needed). Labelling was done by six independent fresh agents reading the code, one per repository, with the criterion above; the human can spot-check any line by its reason.

| repo | queries | pairs | related |
|---|---|---|---|
| spring-petclinic (Java) | 6 | 151 | 34 (23 %) |
| django (Python) | 6 | 191 | 43 |
| leveldb (C++) | 6 | 163 | 49 |
| glamCRM (Java + TS + Python tools) | 6 | 172 | 40 |
| amodx (TS, three packages) | 6 | 177 | 46 |
| nginx (C) | 6 | 158 | 58 (37 %) |

Tree identities are recorded in each sheet; `score` says when the tree differs.

## 4. Results (mean over 36 queries; k = 10)

| variant | P@10 | R@10 | queries better / worse than `sum` (precision) |
|---|---|---|---|
| **sum** (today) | 0.46 | 0.61 | — |
| sqrt-norm | **0.50** | **0.69** | 15 / 8 (13 same) |
| saturated | 0.49 | 0.66 | 15 / 9 |
| def-bonus | 0.48 | 0.63 | 7 / 2 (27 same) |
| min-shared-2 | 0.46 | 0.61 | 0 / 0 — no effect at k = 10 |
| combined | 0.48 | 0.68 | 13 / 11 |
| sum+keys | 0.47 | 0.62 | 6 / 3 |
| sqrt-norm+keys | 0.49 | 0.66 | 14 / 8 |
| **def-bonus+keys** | **0.50** | 0.64 | 8 / 2 (26 same) |
| saturated+keys / combined+keys | 0.49 / 0.48 | 0.66 / 0.65 | 12 / 8, 12 / 10 |

Per repository, P@10 `sum` → `sqrt-norm` → `def-bonus+keys`: petclinic 0.40 → 0.45 → 0.40; django 0.35 → **0.55** → 0.47; leveldb 0.55 → 0.53 → 0.57; glamCRM 0.45 → 0.43 → **0.50**; amodx 0.40 → 0.43 → 0.42; nginx 0.63 → **0.58** → 0.63.

Honest reading of the size: with 36 queries the standard error of a mean P@10 is about ±0.04; a sign test on 15 vs 8 gives p ≈ 0.2. The differences are real directions, not proofs. They are, however, judged on examples:

**Where length normalisation helps** — sibling-file noise. django `db/migrations/exceptions.py`: `sum` fills the top 10 with `db/models/sql/query.py`, `expressions.py` (huge files sharing vocabulary); `sqrt-norm` brings in `recorder.py`, `squashmigrations.py`, `sqlmigrate.py`, `optimizemigration.py` — the files that raise and catch these exceptions (all labelled related). amodx `backend/src/context/update.ts`: `sqrt-norm` promotes `context/create.ts`, `context/get.ts`, `context/delete.ts` (the same CONTEXT# item) that `sum` had below ten parallel `*/update.ts` handlers.

**Where length normalisation hurts** — big files that are true hubs. amodx `backend/src/delivery/update.ts`: `sqrt-norm` drops `orders/create.ts`, `SitePage.tsx`, `shared/src/index.ts`, `tools/mcp-server` — the four real consumers of the delivery config, all large — in favour of five small unrelated `create.ts`/`update.ts` handlers. nginx loses 0.05 the same way: `ngx_http_file_cache.c`, `ngx_event_openssl.c` are big and genuinely coupled.

**What the definition bonus does** — small, almost never wrong. django `http/multipartparser.py`: `core/exceptions.py` (defines the exceptions it raises) and `utils/http.py` (defines `parse_header_parameters`) enter; `handlers/asgi.py`, `template/base.py`, `global_settings.py` leave. glamCRM `document-service.ts`: `handlers/estimates.ts`, `handlers/offers.ts` (its importers) enter. Its two losses: `migrations/migration.py` leaves on django, `s3-service.ts` leaves on glamCRM.

**What concept keys do** — on these repos, little by the numbers (+0.01 on `sum`): five of six are effectively single-language, and the sheets' queries were chosen at random, not for cross-language links. The one mixed repo is where the gain sits (glamCRM 0.45 → 0.50 with `def-bonus+keys`). The feature's reason to exist — `settleOrder` ↔ `settle_order` meeting at all — is not a ranking number; it is tested directly (`lexmap.test.ts`, "concept keys").

Length bias (TD-037) is therefore **confirmed as a bias but not as a defect across the board**: normalising removes sibling noise and removes real hubs in similar measure.

## 5. Ruling needed: the default ranking

The problem in plain words: three candidates improve on today's ranking by small, directionally consistent amounts, and they fail in different places. Choosing is a product judgment about which failure a reviewer tolerates better.

| option | reward | risk |
|---|---|---|
| **A. `def-bonus+keys`** (recommended) | +0.04 P@10, +0.03 R@10; changes the top 10 on only 10 of 36 queries and loses on 2; keeps the big real consumers; brings cross-language merging, which the track exists for | smallest gain in recall; the definition heuristic is keyword-based (C functions and SQL columns get no bonus) |
| B. `sqrt-norm` | the largest recall gain (+0.08); clears sibling-file noise visibly (django, amodx context) | loses on 8 queries, and the losses are the hub files a reviewer must open (amodx delivery, nginx); no cross-language merging |
| C. keep `sum` | nothing moves; the fixture stays the oracle | the measured bias stays; the keys stay a flag |
| D. A, and also re-measure B on a second seed before deciding on normalisation | separates "noise vs hub" with more queries | one more labelling round (~1,000 pairs) |

After the ruling the `conceptKeys` flag collapses to one behaviour and `ranking` keeps only the chosen variant plus `sum` as the eval's baseline.

## 6. Limits

- The labels are one agent's reading per repository under a written criterion, not the human's; the reasons make every line checkable. Two borderline classes recur in the labellers' reports: cross-cutting utilities that the query imports (`api-client.ts`, `import_string`) were marked unrelated by the rule; "sibling implementations of the same contract" were marked related. Both rules can be flipped and the sheets re-scored.
- Queries are random program files; a sheet seeded for cross-language pairs (handler ↔ client ↔ schema) would measure the keys where they matter.
- k = 10 matches the pointer caps; the relay's `hunkNeighbors` ranks a whole candidate's token set, which the sheets do not model directly.
