/**
 * lexmap — an in-memory identifier index over a working tree (LEXMAP-1).
 *
 * What it is: `token → (file, line, col)` for every identifier in every text
 * file, weighted by rarity. Rebuilt from the files it is given; never
 * persisted as truth, never claims resolution. Every answer is a lexical hint:
 * two files that share a rare identifier are LIKELY related, not proven to be.
 *
 * Under the hood (two passes over texts already in memory):
 *  1. document frequency — the distinct identifiers of each file, counted
 *     across files; identifiers present in more than `noiseShare` of files
 *     (and more than `noiseFloor` files) are dropped: `err`, `data` and
 *     a repository's frequent keywords fall out of this one frequency rule, with
 *     no per-language list (a rare keyword of a barely-used language stays);
 *  2. postings — every occurrence of every surviving identifier, stored flat
 *     as `[file, line, col, def]` quads in one number array per token.
 *
 * Weight: idf = ln(N / df). A token in 3 of 2,000 files scores ~6.5; a token
 * in 300 scores ~1.9; dropped tokens score 0.
 *
 * Queries: `where` (postings grouped by file, likely definitions first),
 * `neighbors` (files sharing rare identifiers with a file), `bridge` (the
 * identifiers two directories share), `hunkNeighbors` (unchanged files that
 * share identifiers with the changed lines of a unified diff).
 *
 * Pure: no I/O, no Node APIs. Callers read files and diffs through adapters.
 *
 * @module core/lexmap
 * @maturity PROTOTYPE
 */

import { distinctTokens, tokenize } from './tokenize.js';

/** Tunables. Starting values recorded per the numbers-are-parameters rule. */
export interface LexmapParams {
  /** Identifiers shorter than this are ignored. */
  readonly minTokenLength: number;
  /** A token present in more than this share of files is noise … */
  readonly noiseShare: number;
  /** … but only when it is also in more than this many files (small repos). */
  readonly noiseFloor: number;
  /** Code rows returned by `neighbors` and `hunkNeighbors`. */
  readonly maxNeighbors: number;
  /** Test rows and documentation rows returned per partition (human ruling 2026-11-07: pointers, typed). */
  readonly maxTestRows: number;
  readonly maxDocRows: number;
  /** Shared identifiers listed per neighbor row. */
  readonly maxSharedShown: number;
  /** Rows returned by `bridge`. */
  readonly maxBridgeTokens: number;
  /**
   * Weight multiplier for plain words (all-lowercase, Capitalized or ALLCAPS,
   * no digit or underscore) relative to identifier-shaped tokens
   * (`camelCase`, `snake_case`, `sha256`). First real run (agent-manager,
   * 2026-11-07): without it, Markdown files won every ranking on shared
   * English vocabulary.
   */
  readonly wordWeight: number;
}

export const DEFAULT_LEXMAP_PARAMS: LexmapParams = {
  minTokenLength: 3,
  noiseShare: 0.05,
  noiseFloor: 20,
  maxNeighbors: 20,
  maxTestRows: 8,
  maxDocRows: 8,
  maxSharedShown: 6,
  maxBridgeTokens: 30,
  wordWeight: 0.2,
};

export type TokenShape = 'identifier' | 'word';

/** `identifier` when the token carries a digit, an underscore or an inner case change. */
export function tokenShape(token: string): TokenShape {
  return /[0-9_]/.test(token) || /[a-z][A-Z]/.test(token) ? 'identifier' : 'word';
}

/** Rarity × shape: the contribution one shared token makes to a link. */
export function tokenWeight(map: Lexmap, token: string): number {
  const entry = map.tokens.get(token);
  if (!entry || entry.df === 0) return 0;
  const rarity = Math.log(map.stats.files / entry.df);
  return tokenShape(token) === 'identifier' ? rarity : rarity * map.params.wordWeight;
}

/** A text file as the adapter delivers it: repo-relative forward-slash path. */
export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

export interface FileEntry {
  readonly path: string;
  /** Lower-cased extension, or the lower-cased basename when there is none. */
  readonly lang: string;
}

interface TokenEntry {
  /** Files containing the token. */
  df: number;
  /** Sorted unique file indexes. */
  files: number[];
  /** Flat quads: file, line, col, likelyDefinition (0|1). */
  postings: number[];
}

export interface Lexmap {
  readonly files: readonly FileEntry[];
  readonly params: LexmapParams;
  /** Surviving (non-noise) tokens. */
  readonly tokens: ReadonlyMap<string, TokenEntry>;
  /** Tokens dropped as noise, with their document frequency. */
  readonly noise: ReadonlyMap<string, number>;
  readonly stats: {
    readonly files: number;
    /** Sum of text lengths in UTF-16 code units (what the tokenizer walks); byte sizes are the adapter's. */
    readonly chars: number;
    readonly distinctTokens: number;
    readonly noiseTokens: number;
    readonly postings: number;
  };
}

export function languageOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(dot + 1) : base).toLowerCase();
}

export function buildLexmap(sources: readonly SourceFile[], params: LexmapParams = DEFAULT_LEXMAP_PARAMS): Lexmap {
  const files: FileEntry[] = sources.map((s) => ({ path: s.path, lang: languageOf(s.path) }));
  const n = sources.length;

  // Pass 1: document frequency.
  const df = new Map<string, number>();
  const perFile: Set<string>[] = [];
  let chars = 0;
  for (const s of sources) {
    chars += s.text.length;
    const set = distinctTokens(s.text, params.minTokenLength);
    perFile.push(set);
    for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const noiseLimit = Math.max(params.noiseFloor, Math.ceil(n * params.noiseShare));
  const noise = new Map<string, number>();
  for (const [t, c] of df) if (c > noiseLimit) noise.set(t, c);

  // Pass 2: postings for surviving tokens.
  const tokens = new Map<string, TokenEntry>();
  let postingsTotal = 0;
  for (let f = 0; f < n; f += 1) {
    const text = sources[f]?.text ?? '';
    for (const occ of tokenize(text, params.minTokenLength)) {
      if (noise.has(occ.token)) continue;
      let entry = tokens.get(occ.token);
      if (!entry) {
        entry = { df: df.get(occ.token) ?? 0, files: [], postings: [] };
        tokens.set(occ.token, entry);
      }
      if (entry.files[entry.files.length - 1] !== f) entry.files.push(f);
      entry.postings.push(f, occ.line, occ.col, occ.likelyDefinition ? 1 : 0);
      postingsTotal += 1;
    }
  }

  return {
    files,
    params,
    tokens,
    noise,
    stats: { files: n, chars, distinctTokens: df.size, noiseTokens: noise.size, postings: postingsTotal },
  };
}

export function idf(map: Lexmap, token: string): number {
  const entry = map.tokens.get(token);
  if (!entry || entry.df === 0) return 0;
  return Math.log(map.stats.files / entry.df);
}

/** Distinct surviving tokens of one file, by file index. */
function fileTokens(map: Lexmap, fileIndex: number): string[] {
  // Derived on demand (no per-file token lists kept): scan is O(total tokens)
  // once per query, acceptable for the per-slice use this index serves.
  const out: string[] = [];
  for (const [token, entry] of map.tokens) {
    if (binaryIncludes(entry.files, fileIndex)) out.push(token);
  }
  return out;
}

function binaryIncludes(sorted: readonly number[], value: number): boolean {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = sorted[mid] ?? 0;
    if (v === value) return true;
    if (v < value) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

// ---------------------------------------------------------------- where

/**
 * Three partitions of the working tree (human ruling 2026-11-07): results are
 * pointers, typed — code to open, tests that exercise the names, documentation
 * that mentions them. Starting rules: a test directory or `.test.`/`.spec.`
 * file is `test` (a Markdown fixture inside tests is test material); a docs
 * directory or a `.md`/`.rst`/`.txt` file is `doc`; everything else is `code`.
 */
export type PathClass = 'code' | 'test' | 'doc';

const TEST_PATH = /(^|\/)(tests?|__tests__|specs?|fixtures?)(\/|$)|\.(test|spec)\.[A-Za-z0-9]+$/i;
const DOC_PATH = /(^|\/)(docs?|examples?)(\/|$)|\.(md|rst|txt)$/i;

export function pathClass(path: string): PathClass {
  if (TEST_PATH.test(path)) return 'test';
  if (DOC_PATH.test(path)) return 'doc';
  return 'code';
}

const CLASS_ORDER: Record<PathClass, number> = { code: 0, test: 1, doc: 2 };

export interface WhereFile {
  readonly path: string;
  readonly lang: string;
  readonly pathClass: PathClass;
  readonly definitions: number;
  readonly occurrences: readonly { readonly line: number; readonly col: number; readonly likelyDefinition: boolean }[];
}

export type WhereResult =
  | { readonly status: 'found'; readonly token: string; readonly df: number; readonly idf: number; readonly files: readonly WhereFile[] }
  | { readonly status: 'common'; readonly token: string; readonly df: number }
  | { readonly status: 'absent'; readonly token: string };

/** Postings of one token grouped by file: definitions first, test/doc files last. */
export function where(map: Lexmap, token: string): WhereResult {
  const entry = map.tokens.get(token);
  if (!entry) {
    const df = map.noise.get(token);
    return df === undefined ? { status: 'absent', token } : { status: 'common', token, df };
  }
  const byFile = new Map<number, { line: number; col: number; likelyDefinition: boolean }[]>();
  const p = entry.postings;
  for (let i = 0; i < p.length; i += 4) {
    const f = p[i] ?? 0;
    let list = byFile.get(f);
    if (!list) {
      list = [];
      byFile.set(f, list);
    }
    list.push({ line: p[i + 1] ?? 0, col: p[i + 2] ?? 0, likelyDefinition: (p[i + 3] ?? 0) === 1 });
  }
  const files: WhereFile[] = [];
  for (const [f, occurrences] of byFile) {
    const file = map.files[f];
    if (!file) continue;
    files.push({
      path: file.path,
      lang: file.lang,
      pathClass: pathClass(file.path),
      definitions: occurrences.filter((o) => o.likelyDefinition).length,
      occurrences,
    });
  }
  files.sort((a, b) => {
    const classOrder = CLASS_ORDER[a.pathClass] - CLASS_ORDER[b.pathClass];
    if (classOrder !== 0) return classOrder;
    if (a.definitions !== b.definitions) return b.definitions - a.definitions;
    if (a.occurrences.length !== b.occurrences.length) return b.occurrences.length - a.occurrences.length;
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });
  return { status: 'found', token, df: entry.df, idf: idf(map, token), files };
}

// ------------------------------------------------------------ neighbors

export interface NeighborRow {
  readonly path: string;
  readonly lang: string;
  readonly pathClass: PathClass;
  /** Sum of `tokenWeight` over shared identifiers. */
  readonly score: number;
  /** Shared identifiers, heaviest first (rarity × shape), capped at `maxSharedShown`. */
  readonly shared: readonly string[];
  readonly sharedCount: number;
  /** The neighbor's language differs from every language on the query side. */
  readonly crossLanguage: boolean;
}

/** Ranked neighbors, partitioned by path class; each list capped by its own parameter. */
export interface NeighborRows {
  readonly code: readonly NeighborRow[];
  readonly tests: readonly NeighborRow[];
  readonly docs: readonly NeighborRow[];
}

export function neighborRowCount(rows: NeighborRows): number {
  return rows.code.length + rows.tests.length + rows.docs.length;
}

interface Accumulator {
  score: number;
  shared: { token: string; weight: number }[];
}

function rankNeighbors(map: Lexmap, tokensIn: Iterable<string>, exclude: ReadonlySet<number>, queryLangs: ReadonlySet<string>): NeighborRows {
  const acc = new Map<number, Accumulator>();
  for (const token of tokensIn) {
    const entry = map.tokens.get(token);
    if (!entry) continue;
    const w = tokenWeight(map, token);
    for (const f of entry.files) {
      if (exclude.has(f)) continue;
      let a = acc.get(f);
      if (!a) {
        a = { score: 0, shared: [] };
        acc.set(f, a);
      }
      a.score += w;
      a.shared.push({ token, weight: w });
    }
  }
  const rows: NeighborRow[] = [];
  for (const [f, a] of acc) {
    const file = map.files[f];
    if (!file) continue;
    a.shared.sort((x, y) => y.weight - x.weight || (x.token < y.token ? -1 : 1));
    rows.push({
      path: file.path,
      lang: file.lang,
      pathClass: pathClass(file.path),
      score: a.score,
      shared: a.shared.slice(0, map.params.maxSharedShown).map((s) => s.token),
      sharedCount: a.shared.length,
      crossLanguage: !queryLangs.has(file.lang),
    });
  }
  rows.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    code: rows.filter((r) => r.pathClass === 'code').slice(0, map.params.maxNeighbors),
    tests: rows.filter((r) => r.pathClass === 'test').slice(0, map.params.maxTestRows),
    docs: rows.filter((r) => r.pathClass === 'doc').slice(0, map.params.maxDocRows),
  };
}

export type NeighborsResult =
  | { readonly status: 'found'; readonly path: string; readonly tokens: number; readonly rows: NeighborRows }
  | { readonly status: 'absent'; readonly path: string };

/** Files sharing rare identifiers with `path`, strongest link first. */
export function neighbors(map: Lexmap, path: string): NeighborsResult {
  const f = map.files.findIndex((e) => e.path === path);
  if (f < 0) return { status: 'absent', path };
  const own = fileTokens(map, f);
  const lang = map.files[f]?.lang ?? '';
  return { status: 'found', path, tokens: own.length, rows: rankNeighbors(map, own, new Set([f]), new Set([lang])) };
}

// --------------------------------------------------------------- bridge

export interface BridgeRow {
  readonly token: string;
  /** `tokenWeight`: rarity × shape. */
  readonly weight: number;
  readonly filesA: readonly string[];
  readonly filesB: readonly string[];
}

export interface BridgeResult {
  readonly dirA: string;
  readonly dirB: string;
  readonly rows: readonly BridgeRow[];
}

function dirPrefix(dir: string): string {
  const d = dir.replace(/^\.\//, '').replace(/\/+$/, '');
  return d === '' || d === '.' ? '' : `${d}/`;
}

/** Identifiers shared by files under two directories, heaviest first (rarity × shape), wider spread on ties. */
export function bridge(map: Lexmap, dirA: string, dirB: string): BridgeResult {
  const a = dirPrefix(dirA);
  const b = dirPrefix(dirB);
  const rows: BridgeRow[] = [];
  for (const [token, entry] of map.tokens) {
    const filesA: string[] = [];
    const filesB: string[] = [];
    for (const f of entry.files) {
      const p = map.files[f]?.path ?? '';
      if (p.startsWith(a)) filesA.push(p);
      if (p.startsWith(b)) filesB.push(p);
    }
    if (filesA.length === 0 || filesB.length === 0) continue;
    rows.push({ token, weight: tokenWeight(map, token), filesA, filesB });
  }
  // Weight, then spread (a token on more files of both sides is more structural), then name.
  rows.sort((x, y) => y.weight - x.weight || (y.filesA.length + y.filesB.length) - (x.filesA.length + x.filesB.length) || (x.token < y.token ? -1 : 1));
  return { dirA: a, dirB: b, rows: rows.slice(0, map.params.maxBridgeTokens) };
}

// -------------------------------------------------------- hunk neighbors

/** The changed lines of a unified diff, per file. Pure text parsing. */
export interface DiffChanges {
  /** Paths touched by the diff (post-image path; pre-image for deletions). */
  readonly files: readonly string[];
  /** Text of every `+`/`-` line, joined per file. */
  readonly changedText: ReadonlyMap<string, string>;
}

/**
 * A path as git prints it in a diff header: `b/<path>`, or, when the path holds
 * a control character, a quote or a backslash (and, unless `core.quotePath` is
 * false, any non-ASCII byte), a C-quoted `"b/caf\303\251.ts"`. Octal escapes
 * are bytes of the UTF-8 encoding and are decoded as such.
 */
export function parseGitDiffPath(raw: string, prefix: 'a/' | 'b/'): string | undefined {
  let p = raw.trim();
  if (p === '/dev/null') return undefined;
  if (p.startsWith('"') && p.endsWith('"') && p.length >= 2) {
    const bytes: number[] = [];
    const inner = p.slice(1, -1);
    const encoder = new TextEncoder();
    for (let i = 0; i < inner.length; i += 1) {
      if (inner[i] !== '\\') {
        // Literal run up to the next escape, encoded whole so a surrogate pair
        // (an emoji) is one code point, not two broken UTF-16 halves (review-1).
        let end = inner.indexOf('\\', i);
        if (end < 0) end = inner.length;
        for (const b of encoder.encode(inner.slice(i, end))) bytes.push(b);
        i = end - 1;
        continue;
      }
      const n = inner[i + 1] ?? '';
      if (/[0-7]/.test(n)) {
        const oct = inner.slice(i + 1, i + 4);
        bytes.push(parseInt(oct, 8));
        i += oct.length;
      } else {
        const simple: Record<string, number> = { n: 10, t: 9, r: 13, b: 8, f: 12, v: 11, a: 7, '\\': 92, '"': 34 };
        bytes.push(simple[n] ?? n.charCodeAt(0));
        i += 1;
      }
    }
    p = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  }
  return p.startsWith(prefix) ? p.slice(prefix.length) : p;
}

export function parseUnifiedDiff(diffText: string): DiffChanges {
  const files: string[] = [];
  const changed = new Map<string, string[]>();
  let current: string | undefined;
  // Header lines (`---`, `+++`, `index`, `rename …`) are only valid between a
  // `diff --git` line and that file's first `@@` hunk. Inside a hunk a content
  // line `++ x` prints as `+++ x` and must stay content.
  let inHunk = false;
  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      current = undefined;
      inHunk = false;
      continue;
    }
    if (!inHunk) {
      if (raw.startsWith('+++ ')) {
        const p = parseGitDiffPath(raw.slice(4), 'b/');
        if (p !== undefined) current = p;
      } else if (raw.startsWith('--- ')) {
        const p = parseGitDiffPath(raw.slice(4), 'a/');
        if (p !== undefined && current === undefined) current = p;
      } else if (raw.startsWith('@@')) {
        inHunk = true;
      }
      continue;
    }
    if (current === undefined || raw.startsWith('@@') || raw.startsWith('\\')) continue;
    if (raw.startsWith('+') || raw.startsWith('-')) {
      if (!changed.has(current)) {
        changed.set(current, []);
        files.push(current);
      }
      changed.get(current)?.push(raw.slice(1));
    }
  }
  const changedText = new Map<string, string>();
  for (const [p, lines] of changed) changedText.set(p, lines.join('\n'));
  return { files, changedText };
}

export interface CandidateChanges {
  /** `git diff` of the candidate against its base (tracked files). */
  readonly diffText: string;
  /**
   * Every tracked path the candidate changed, from `git diff --name-only`:
   * includes renames and mode-only changes, which carry no `+`/`-` lines and
   * so never appear in `diffText`'s hunks.
   */
  readonly changedPaths: readonly string[];
  /** Untracked, not-ignored files: every line counts as added. */
  readonly untracked: readonly SourceFile[];
}

export interface HunkNeighborsReport {
  readonly changedFiles: readonly string[];
  /** Distinct changed-line identifiers that are in the index. */
  readonly changedTokens: number;
  /** Distinct changed-line identifiers dropped as common. */
  readonly commonTokens: number;
  readonly rows: NeighborRows;
}

/**
 * Unchanged files that share rare identifiers with the changed lines of a
 * candidate. Subtracting the files an agent read from these rows gives the
 * "uninspected neighbors" list (ACTIVITY-1 consumes it).
 */
export function hunkNeighbors(map: Lexmap, changes: CandidateChanges): HunkNeighborsReport {
  const diff = parseUnifiedDiff(changes.diffText);
  const changedFiles = new Set<string>([...diff.files, ...changes.changedPaths]);
  const pieces: string[] = [...diff.changedText.values()];
  for (const u of changes.untracked) {
    changedFiles.add(u.path);
    pieces.push(u.text);
  }
  const tokens = distinctTokens(pieces.join('\n'), map.params.minTokenLength);
  let common = 0;
  const live: string[] = [];
  for (const t of tokens) {
    if (map.noise.has(t)) common += 1;
    else if (map.tokens.has(t)) live.push(t);
  }
  const exclude = new Set<number>();
  const langs = new Set<string>();
  for (const p of changedFiles) {
    langs.add(languageOf(p));
    const f = map.files.findIndex((e) => e.path === p);
    if (f >= 0) exclude.add(f);
  }
  return {
    changedFiles: [...changedFiles].sort(),
    changedTokens: live.length,
    commonTokens: common,
    rows: rankNeighbors(map, live, exclude, langs),
  };
}

// ------------------------------------------------------------ rendering

function fmt(n: number): string {
  return n.toFixed(1);
}

export function renderWhere(result: WhereResult): string {
  if (result.status === 'absent') return `${result.token}: not in the index.`;
  if (result.status === 'common') return `${result.token}: common (${result.df} files) — dropped as noise; use grep.`;
  const lines = [`${result.token}: ${result.files.length} files, idf ${fmt(result.idf)}`];
  for (const f of result.files) {
    const tag = f.definitions > 0 ? `definition×${f.definitions}` : f.pathClass === 'code' ? 'use' : f.pathClass;
    const where = f.occurrences.slice(0, 8).map((o) => `${o.line}:${o.col}${o.likelyDefinition ? '*' : ''}`).join(' ');
    const more = f.occurrences.length > 8 ? ` +${f.occurrences.length - 8}` : '';
    lines.push(`  ${f.path}  [${tag}]  ${where}${more}`);
  }
  return lines.join('\n');
}

function renderRows(rows: readonly NeighborRow[]): string[] {
  return rows.map((r) => `  ${fmt(r.score).padStart(6)}  ${r.path}${r.crossLanguage ? '  [cross-language]' : ''}  — ${r.shared.join(', ')}${r.sharedCount > r.shared.length ? ` +${r.sharedCount - r.shared.length}` : ''}`);
}

/** The three partitions as pointer lists; an empty partition prints one line saying so. */
function renderPartitions(rows: NeighborRows, subject: string): string[] {
  const block = (title: string, list: readonly NeighborRow[], empty: string): string[] =>
    list.length === 0 ? [`${title}: ${empty}`] : [`${title}:`, ...renderRows(list)];
  return [
    ...block('Code to open', rows.code, `no code file shares a rare identifier with ${subject}.`),
    ...block('Tests that exercise these identifiers', rows.tests, 'none found.'),
    ...block('Documentation that mentions them (potential doc updates)', rows.docs, 'none found.'),
  ];
}

export function renderNeighbors(result: NeighborsResult): string {
  if (result.status === 'absent') return `${result.path}: not in the index.`;
  return [`${result.path}: ${result.tokens} rare identifiers; ${neighborRowCount(result.rows)} neighbors (heaviest first: rarity × shape)`, ...renderPartitions(result.rows, 'this file')].join('\n');
}

export function renderBridge(result: BridgeResult): string {
  const lines = [`${result.dirA || '.'} ↔ ${result.dirB || '.'}: ${result.rows.length} shared identifiers`];
  for (const r of result.rows) {
    lines.push(`  ${fmt(r.weight).padStart(5)}  ${r.token}  ${r.filesA.length}↔${r.filesB.length}  e.g. ${r.filesA[0] ?? ''} ↔ ${r.filesB[0] ?? ''}`);
  }
  return lines.join('\n');
}

/**
 * The reviewer-context section (LEXMAP-1 injection). States what the list is
 * and is not, so the reviewer can use it to choose what to open without
 * treating a row as a finding.
 */
export function renderHunkNeighborsSection(report: HunkNeighborsReport, map: Lexmap, buildMs: number, treeIdentity?: string): string {
  const head = [
    '# Lexical neighbors of the candidate (hints, not facts)',
    '',
    'Agent Manager tokenized the identifiers on the changed lines of the candidate (`git diff` plus untracked files) and lists UNCHANGED files that share rare identifiers with them. A shared identifier is a lexical match, not a resolved reference: use the list to decide what else to open; a row is not a finding by itself.',
    '',
    `Index: ${map.stats.files} files${treeIdentity ? ` (${treeIdentity})` : ''}, ${map.stats.distinctTokens - map.stats.noiseTokens} identifiers kept, ${map.stats.noiseTokens} dropped as common (present in more than ${Math.max(map.params.noiseFloor, Math.ceil(map.stats.files * map.params.noiseShare))} files), built in ${(buildMs / 1000).toFixed(1)} s.`,
    `Candidate: ${report.changedFiles.length} changed file${report.changedFiles.length === 1 ? '' : 's'}, ${report.changedTokens} rare identifier${report.changedTokens === 1 ? '' : 's'} on changed lines (${report.commonTokens} common ones ignored).`,
    '',
  ];
  if (neighborRowCount(report.rows) === 0) return [...head, 'No unchanged file shares a rare identifier with the changed lines.'].join('\n');
  return [...head, 'Rows are pointers (score  path  — shared identifiers, heaviest first: rarity × shape); open what you judge relevant.', '', ...renderPartitions(report.rows, 'the changed lines')].join('\n');
}
