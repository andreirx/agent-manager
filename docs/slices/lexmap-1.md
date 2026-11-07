# LEXMAP-1 — an identifier index the relay feeds to its reviewers

Status: approach ratified by the human on 2026-11-07 ("inside agent-manager, typescript"); built the same day; three bounded relay reviews by Codex gpt-6.1-sol (review-0 five findings, review-1 three, review-2 two — all code defects fixed with regressions, the last two items being an oracle-precision note and a packet scope amendment, ruled by the operator at the three-cycle checkpoint; records under `.agent-manager/slices/LEXMAP-1/`). Awaiting the human's commit.
Maturity: PROTOTYPE.

## Source

The human's problems, in order (2026-11-07):

1. It is too hard to see what agents are doing in the larger context.
2. It is too hard to navigate a large codebase "the old way".
3. A PR or branch diff should be readable in context, not file by file alphabetically.
4. Move from file to file along calls, imports or plain string matches, and see what is there.
5. A simpler indexer: identifiers, no grammars — "keywords and how they map between modules in different languages, and between files".
6. Browser views with highlighting for diffs and files, without interfering with agents and without opening a PR or an IDE.
7. repo-graph must not be repeated: builders never called it even when the target's CLAUDE.md told them to (amodx 0 of 250 builder runs, glamCRM 2 of 364); its databases are 5–16× the source they index (repo-graph 742 MB for 46 MB); its v0.21.0 audit found a base defect (relative state root) that "never worked since May 2026".
8. It integrates with agent-manager.

Ratified: the index lives inside agent-manager, in TypeScript, as a pure core module with a git adapter; four verbs; the relay injects its answers into agent context rather than offering a tool; the browser viewer and the activity stream are the next slices (VIEW-1, ACTIVITY-1, VIEW-2).

## What this slice delivers (problems 5, 7, 8)

- `src/core/lexmap/tokenize.ts` — identifiers `[A-Za-z_][A-Za-z0-9_]{2,}` from the whole text, code and string literals alike; one heuristic, `likelyDefinition` (the previous word is a declaration keyword).
- `src/core/lexmap/lexmap.ts` — the index (`token → (file, line, col, def)`, document frequency, noise cutoff), the four queries `where`, `neighbors`, `bridge`, `hunkNeighbors`, the unified-diff parser and the renderers. Pure.
- `src/adapters/lexmap/git-working-tree.ts` — reads the tree as git sees it (`git ls-files --cached --others --exclude-standard`), skips binaries (NUL in the first 8,000 bytes) and files over 2 MB, fetches `git diff HEAD -U0` plus untracked files, and composes `candidateLexicalHints` (never throws; renders `Unavailable: <reason>`).
- `src/cli/lexmap.ts` — `npm run lexmap -- <target> stats | where <id> | neighbors <path> | bridge <dirA> <dirB> | hunk-neighbors [--basis <rev>]` with `--json`.
- Relay injection — `TargetRelayDeps.lexicalHints` (a plain function, like `changedPaths`); the reviewer's context gains the section "Lexical neighbors of the candidate (hints, not facts)" between the builder's run report and "# Your task". Absent function = byte-identical context (tested).

## How it works

Two passes over texts already in memory. Pass 1 counts in how many files each identifier occurs; identifiers in more than `max(20, ceil(0.05 × files))` files are dropped. There is no per-language list: `i` falls under the minimum length of 3; `err`, `data` and the keywords a repository actually uses often (`const`, `function`, `import` in a TypeScript repo) drop by frequency; a keyword of a language the repository barely uses (`trait` in agent-manager) stays as a rare token, harmlessly, and a two-file fixture keeps everything because of the 20-file floor. Pass 2 stores every occurrence of every surviving identifier as a flat `[file, line, col, def]` quad. A shared identifier links two files with weight `ln(N / df)` (rarity) times a shape factor: 1.0 for identifier-shaped tokens (`camelCase`, `snake_case`, `sha256`), 0.2 for plain words (`Bash`, `UNCHANGED`). `neighbors` and `hunkNeighbors` sum those weights per file; `bridge` lists the tokens two directories share, heaviest first, more spread first on ties. Every answer is a hint: no resolution, no completeness claim, no persisted state.

Results are pointers, never file content (human ruling 2026-11-07), and they are typed into three partitions by path: **code to open** (up to 20 rows), **tests that exercise these identifiers** (up to 8), **documentation that mentions them — potential doc updates** (up to 8). A test directory or `.test.`/`.spec.` file is a test (a Markdown fixture inside tests is test material); a docs directory or `.md`/`.rst`/`.txt` is documentation; everything else is code. Each partition is ranked on its own, so a large Markdown file can no longer push a code file off the list — the ranking witness of TD-037 now lands in the documentation partition where a reviewer reads it as "this doc mentions what you changed".

## Measurements (`npm run lexmap -- <target> stats`, M-series laptop, cold)

Every measurement is bound to the input it was taken on; `stats` prints that identity (`HEAD <sha>, <n> uncommitted entries`) since review-0. The first table was taken before `stats` printed it; its identities are reconstructed from the session record and the numbers are kept as measured, not replaced.

First measurement, 2026-11-07 ~12:00Z (agent-manager at HEAD 4906376 plus the candidate's then 17 uncommitted entries; other targets clean at the HEADs below; "MB" was the sum of JavaScript string lengths, not bytes):

| target | text files | M chars | identifiers kept / dropped | postings | build | heap |
|---|---|---|---|---|---|---|
| agent-manager (4906376 + candidate) | 213 | 2.4 | 10,337 / 771 | 79,340 | 0.13 s | 34 MB |
| glamCRM | 1,105 | 13.6 | 36,128 / 1,404 | 449,454 | 0.70 s | 97 MB |
| amodx (8eb1aac) | 2,112 | 37.8 | 30,682 / 1,125 | 590,749 | 1.17 s | 127 MB |
| repo-graph (a5e75e65) | 2,387 | 45.9 | 65,177 / 1,667 | 1,029,054 | 1.68 s | 188 MB |

Re-measured after review-1, 2026-11-07 ~15:30Z. Since review-1 the identity the tool prints includes `inputs sha256:…`, a digest over the sorted `<path>\0<sha256 of bytes>` lines of every file indexed — the exact input set, which `HEAD` plus an uncommitted-entry count did not pin. For a clean external repository the oracle is: `git checkout <HEAD>` and run `npm run lexmap -- <target> stats`; the printed digest must equal the one below, and then every deterministic count must match (build time and heap are not deterministic). Bytes are on-disk sizes.

| target (identity) | text files | MB on disk | identifiers kept / dropped | postings | build | heap |
|---|---|---|---|---|---|---|
| glamCRM (HEAD d449718, clean, inputs sha256:bc53cf3e635e1c173aaaa9bb50aa9f4635e176eaa11ad532d6ee194ba4306f0f) | 1,106 | 13.7 | 36,156 / 1,412 | 449,076 | 0.61 s | 116 MB |
| amodx (HEAD 8eb1aac, clean, inputs sha256:f8366942c0f98843a26711d3523afcde23cd1de90b08d72da7f187f005a14c82) | 2,112 | 38.0 | 30,682 / 1,125 | 590,749 | 1.17 s | 124 MB |
| repo-graph (HEAD a5e75e65, clean, inputs sha256:6631a2b88b269f2d9b9140a5d3891fabdacbbb2cd03556229ede6c5867efac53) | 2,387 | 46.4 | 65,177 / 1,667 | 1,029,054 | 1.64 s | 190 MB |

The digest is over the bytes the index read from the WORKING TREE, which is what the index sees; a `git status`-clean tree is not byte-identical to its blobs when files carry CRLF or mixed line endings that no checkout attribute restores. glamCRM is such a case (review-2 reconstruction): a fresh checkout of d449718 digests `sha256:e958373ad467cadbaceb7fb816b69fa4e9f7385f7e085b60ef2d02ee9e901a4e`; the measured working tree digests `bc53cf3e…` because four files (`backend/gradlew.bat`, `docs/Client requirements - HIGH LEVEL.csv`, `docs/Discutie GlamourFloors - CRM - 2024-dec-13.txt`, `pl-2025/enriched_BOEN_imagini_specs.csv`) hold CRLF in the working tree and LF in git. To reproduce the glamCRM row exactly, check out d449718 and convert those four files to CRLF before running `stats`; the counts in the row are the same either way except as far as those files' tokens differ, which the digest will tell you. amodx and repo-graph have no such files: their checkout digests equal the measured ones.

agent-manager itself cannot be pinned this way before the slice is committed: every edit to this document changes the inputs. Its row is therefore stated as "at the commit that ships LEXMAP-1": run `npm run lexmap -- . stats` on that commit's clean checkout; the digest printed there is the identity. The last pre-commit reading (candidate tree, 2026-11-07 ~15:30Z, before this paragraph was edited) was 216 files, 2.4 MB, 0.13 s. amodx and repo-graph reproduce every count from the first table exactly; glamCRM moved because its HEAD moved (c7ddfc6 → d449718 during the day). Heap is `process.memoryUsage().heapUsed` after the build and varies run to run. For comparison, repo-graph's own database of itself is 742 MB on disk. Nothing here is written to disk.

Defect found by the first real run and fixed: an end-anchored regex for "the word before this identifier" was O(line length) per token; amodx's 118 KB single-line `.body` fixtures turned the build into minutes. Replaced by a bounded backward scan.

## Limitations recorded (tuning is TD-037)

- Summed scores favour files with a large shared vocabulary: on agent-manager's own candidate, Markdown files that mention the touched identifiers (`docs/TECH-DEBT.md`, the contract) outrank code files. That is partly right (those docs do need the reviewer's eye) and partly length bias; length normalisation is the recorded next tuning, not applied here.
- `bridge` by weight (rarity × shape) lists the thinnest bridges (1↔1); by spread it lists test-framework and runtime vocabulary (`toEqual`, `startsWith`). Both orderings were measured on amodx backend↔renderer; the weight ordering ships, with spread as the tie-break.
- `likelyDefinition` looks only at the previous word, wherever it occurs: a diff hunk header quoted inside a JSON record (`"@@ … function buildReviewerContext("` in `docs/assurance/ASSURANCE-3/verification.json`) counts as a definition; a JSON key (`"settleOrder":`) does not.
- Baseline note: HEAD moved from 4906376 to 3f5b331 while this candidate was uncommitted (another operator's commits: a glamCRM rehearsal script, the builder resume directive, manager scripts). None of those commits contain a LEXMAP hunk (checked per commit); the candidate's diff is against 3f5b331 and the parity check below was re-run against it. The default-reviewer change in `src/cli/relay-target.ts` (gpt-5.6-terra → gpt-6.1-sol) is a separate human directive of the same day, carried in the same tree and named in CLAUDE.md.
- Definition/use cannot distinguish two unrelated symbols with the same name; the answer shows both, by file, and the reader looks.

Parameters (starting values, recorded, moved past): min token length 3; noise share 5 %, noise floor 20 files; max file 2 MB; code rows 20, test rows 8, doc rows 8, 6 shared identifiers shown per row; bridge 30 rows; word weight 0.2; definition keywords in `tokenize.ts`; path-class rules in `lexmap.ts`.

## Definition of done and validation

- The absent-dependency reviewer context is compared byte-for-byte against `src/application/use-cases/fixtures/lexmap-1-prechange-reviewer-context.txt`, generated by `scripts/lexmap-1-prechange-reviewer-context.mts` running the pre-change `targetRelayLoop` from a `git archive 3f5b331` copy on the same seeded slice (the script's header has the exact commands; re-running it reproduces the fixture byte-for-byte).
- `npm run typecheck` clean; `npm test` green (core, adapter and relay-injection tests added); dry-run parity: `npm run relay-target -- "<repo-graph>" --slice STATE-ROOT-RELATIVE-REPO-ROOT-1 --builder claude --supervisor codex --shared-prompt "<root>/SYSTEM.txt" --dry-run` run from a `git archive HEAD` copy and from the working tree, outputs compared with the prompt-root/shared-path lines removed; permitted differences: none for this slice (the dry-run does not wire `lexicalHints`), plus the two codex `--model` lines moved by the same-day default-reviewer directive.
- `npm run lexmap -- <target> stats` on four repositories (table above).
- One real relay review on agent-manager itself with the section in the reviewer's context (`.agent-manager/slices/LEXMAP-1/`).

## Next slices (problems 1, 2, 3, 4, 6)

- VIEW-1 — `npm run view -- <target>`: read-only local server; the candidate diff grouped by shared identifiers with per-file highlighting; a file at a posting with the `where` column beside it (Miller columns).
- ACTIVITY-1 — one `ActivityEvent` shape across the four provider adapters, appended live per run; the activity panel; "uninspected neighbors" = hunk neighbors minus files the agent read.
- VIEW-2 — bridge/cross-language view; builder-side injection of `neighbors` for the packet's named files.
