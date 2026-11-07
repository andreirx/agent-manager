/**
 * LEXMAP-EVAL-1 (TD-037): the labelled relatedness set and the scoring of the
 * ranking variants against it. Pure — sheets and an index in, numbers out.
 *
 * A sheet is a Markdown file the operator (or a labeller) marks by hand:
 *   - [x] related   a reviewer of a change in the query file would need to open it
 *   - [ ] unrelated
 *   - [?] unsure    excluded from every number
 * Candidates are the baseline's top rows plus a few random code files, shuffled
 * so position carries no rank, with no score printed (a visible score biases
 * the labeller). Two precisions bound the truth: *condensed* drops unlabelled
 * rows before taking the top k (optimistic), *pessimistic* counts every
 * unlabelled row in the raw top k as unrelated.
 *
 * @module core/lexmap
 * @maturity PROTOTYPE
 */
import {
  fileTokensOf,
  neighbors,
  pathClass,
  RANKING_VARIANTS,
  tokenWeight,
  type Lexmap,
  type LexmapParams,
  type RankingVariant,
} from './lexmap.js';

export type Label = 'related' | 'unrelated' | 'unsure';

export interface LabelledCandidate {
  readonly path: string;
  readonly label: Label;
  /** Free text after "⇒" — the labeller's reason. */
  readonly note: string;
}

export interface LabelledQuery {
  readonly path: string;
  readonly candidates: readonly LabelledCandidate[];
}

export interface LabelSheet {
  readonly repo: string;
  readonly identity: string;
  readonly seed: number;
  readonly queries: readonly LabelledQuery[];
}

/** A copy of the index with some parameters replaced (shares the postings). */
export function withParams(map: Lexmap, patch: Partial<LexmapParams>): Lexmap {
  return { ...map, params: { ...map.params, ...patch } };
}

// ------------------------------------------------------------- sampling

/** Deterministic 32-bit PRNG (mulberry32) so a seed reproduces a sheet. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
}

/** Extensions treated as program source when choosing queries and random candidates. */
export const PROGRAM_LANGS: ReadonlySet<string> = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'java', 'kt', 'scala', 'py', 'rb', 'go', 'rs',
  'c', 'cc', 'cpp', 'cxx', 'h', 'hpp', 'cs', 'php', 'swift', 'sql', 'm', 'mm', 'ex', 'exs', 'dart', 'lua',
]);

export interface SampleParams {
  readonly queries: number;
  readonly topCandidates: number;
  readonly randomCandidates: number;
  readonly minQueryTokens: number;
}

export const DEFAULT_SAMPLE_PARAMS: SampleParams = { queries: 6, topCandidates: 20, randomCandidates: 5, minQueryTokens: 20 };

export interface SampledCandidate {
  readonly path: string;
  readonly shares: readonly string[];
}

export interface SampledQuery {
  readonly path: string;
  /** The query's heaviest identifiers, for the labeller's orientation. */
  readonly rare: readonly string[];
  readonly candidates: readonly SampledCandidate[];
}

/**
 * Seeded choice of query files (program source, enough rare tokens) and, per
 * query, the baseline's top code rows plus random code files, shuffled.
 */
export function sampleQueries(map: Lexmap, seed: number, params: SampleParams = DEFAULT_SAMPLE_PARAMS): SampledQuery[] {
  const rng = mulberry32(seed);
  const isProgram = (path: string, lang: string): boolean => pathClass(path) === 'code' && PROGRAM_LANGS.has(lang);
  const pool = map.files.filter((f) => isProgram(f.path, f.lang) && f.tokenCount >= params.minQueryTokens).map((f) => f.path).sort();
  const chosen = shuffle(pool.slice(), rng).slice(0, params.queries).sort();
  const randomPool = map.files.filter((f) => isProgram(f.path, f.lang) && f.tokenCount >= 5).map((f) => f.path).sort();
  const baseline = withParams(map, { ranking: 'sum', maxNeighbors: params.topCandidates });
  const out: SampledQuery[] = [];
  for (const path of chosen) {
    const own = fileTokensOf(map, path) ?? [];
    const ownSet = new Set(own);
    const r = neighbors(baseline, path);
    const top = r.status === 'found' ? r.rows.code.map((row) => ({ path: row.path, shares: row.shared })) : [];
    const taken = new Set([path, ...top.map((t) => t.path)]);
    const randoms = shuffle(randomPool.filter((p) => !taken.has(p)), rng).slice(0, params.randomCandidates).map((p) => {
      const shares = (fileTokensOf(map, p) ?? []).filter((t) => ownSet.has(t)).sort((a, b) => tokenWeight(map, b) - tokenWeight(map, a)).slice(0, map.params.maxSharedShown);
      return { path: p, shares };
    });
    out.push({ path, rare: own.slice(0, 8), candidates: shuffle([...top, ...randoms], rng) });
  }
  return out;
}

/** Median of the indexed files' distinct-token counts — the length scale the variants damp. */
export function medianTokenCount(map: Lexmap): number {
  const counts = map.files.map((f) => f.tokenCount).sort((a, b) => a - b);
  return counts.length ? (counts[Math.floor(counts.length / 2)] ?? 0) : 0;
}

export const SHEET_INSTRUCTIONS =
  'How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — ' +
  'because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? ' +
  'Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". ' +
  'Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".';

export function renderSheet(repo: string, identity: string, seed: number, medianTokens: number, queries: readonly SampledQuery[]): string {
  const lines: string[] = [
    '# lexmap relatedness labels',
    `repo: ${repo}`,
    `identity: ${identity}`,
    `seed: ${seed}`,
    `median-tokens: ${medianTokens}`,
    '',
    SHEET_INSTRUCTIONS,
    '',
  ];
  for (const q of queries) {
    lines.push(`## query: ${q.path}`, `rare: ${q.rare.join(', ')}`, '');
    for (const c of q.candidates) lines.push(`- [ ] ${c.path} — shares: ${c.shares.length ? c.shares.join(', ') : 'none'} ⇒`);
    lines.push('');
  }
  return lines.join('\n');
}

const CANDIDATE_LINE = /^- \[([ xX?])\] (.+?) — (.*)$/;

/** Parse a marked sheet; throws with the line number on a malformed line. */
export function parseSheet(text: string): LabelSheet {
  let repo = '';
  let identity = '';
  let seed = 0;
  const queries: { path: string; candidates: LabelledCandidate[] }[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.startsWith('repo: ')) repo = line.slice(6).trim();
    else if (line.startsWith('identity: ')) identity = line.slice(10).trim();
    else if (line.startsWith('seed: ')) seed = Number(line.slice(6).trim());
    else if (line.startsWith('## query: ')) queries.push({ path: line.slice(10).trim(), candidates: [] });
    else if (line.startsWith('- [')) {
      const m = CANDIDATE_LINE.exec(line);
      const current = queries[queries.length - 1];
      if (!m || !current) throw new Error(`sheet line ${i + 1}: malformed candidate line: ${line}`);
      const mark = m[1] ?? ' ';
      const label: Label = mark === ' ' ? 'unrelated' : mark === '?' ? 'unsure' : 'related';
      const rest = m[3] ?? '';
      const arrow = rest.indexOf('⇒');
      current.candidates.push({ path: m[2] ?? '', label, note: arrow >= 0 ? rest.slice(arrow + 1).trim() : '' });
    }
  }
  if (!repo) throw new Error('sheet: missing "repo:" header');
  return { repo, identity, seed, queries };
}

// -------------------------------------------------------------- scoring

export interface QueryScore {
  readonly path: string;
  /** Raw top-k paths with their labels (undefined = not in the sheet). */
  readonly top: readonly { readonly path: string; readonly label: Label | undefined }[];
  readonly precisionCondensed: number;
  readonly precisionPessimistic: number;
  /** Labelled-related candidates found in the raw top k over all labelled-related; undefined when none labelled related. */
  readonly recall: number | undefined;
  readonly unjudgedInTop: number;
}

export interface VariantScore {
  readonly variant: RankingVariant;
  readonly k: number;
  readonly queries: number;
  readonly precisionCondensed: number;
  readonly precisionPessimistic: number;
  readonly recall: number;
  readonly unjudgedInTop: number;
  readonly perQuery: readonly QueryScore[];
  /** Query paths absent from the index (file gone since labelling). */
  readonly skipped: readonly string[];
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function scoreVariant(map: Lexmap, sheet: LabelSheet, variant: RankingVariant, k = 10): VariantScore {
  const mapV = withParams(map, { ranking: variant, maxNeighbors: Math.max(60, k * 6) });
  const perQuery: QueryScore[] = [];
  const skipped: string[] = [];
  for (const q of sheet.queries) {
    const r = neighbors(mapV, q.path);
    if (r.status !== 'found') {
      skipped.push(q.path);
      continue;
    }
    const labels = new Map(q.candidates.map((c) => [c.path, c.label]));
    const rows = r.rows.code.map((row) => row.path);
    const rawTop = rows.slice(0, k);
    const labelOf = (p: string): Label | undefined => labels.get(p);
    const relatedInRaw = rawTop.filter((p) => labelOf(p) === 'related').length;
    const unjudged = rawTop.filter((p) => labelOf(p) === undefined || labelOf(p) === 'unsure').length;
    const judged = rows.filter((p) => labelOf(p) === 'related' || labelOf(p) === 'unrelated').slice(0, k);
    const relatedTotal = q.candidates.filter((c) => c.label === 'related').length;
    perQuery.push({
      path: q.path,
      top: rawTop.map((p) => ({ path: p, label: labelOf(p) })),
      precisionCondensed: judged.length ? judged.filter((p) => labelOf(p) === 'related').length / judged.length : 0,
      precisionPessimistic: relatedInRaw / k,
      recall: relatedTotal > 0 ? relatedInRaw / relatedTotal : undefined,
      unjudgedInTop: unjudged,
    });
  }
  const recalls = perQuery.map((s) => s.recall).filter((x): x is number => x !== undefined);
  return {
    variant,
    k,
    queries: perQuery.length,
    precisionCondensed: mean(perQuery.map((s) => s.precisionCondensed)),
    precisionPessimistic: mean(perQuery.map((s) => s.precisionPessimistic)),
    recall: mean(recalls),
    unjudgedInTop: mean(perQuery.map((s) => s.unjudgedInTop)),
    perQuery,
    skipped,
  };
}

export function scoreAll(map: Lexmap, sheet: LabelSheet, k = 10): VariantScore[] {
  return RANKING_VARIANTS.map((v) => scoreVariant(map, sheet, v, k));
}

export interface QueryMoves {
  readonly path: string;
  readonly entered: readonly { readonly path: string; readonly label: Label | undefined }[];
  readonly left: readonly { readonly path: string; readonly label: Label | undefined }[];
}

/** Per query, the rows that entered / left the raw top k between two variants. */
export function topMoves(base: VariantScore, other: VariantScore): QueryMoves[] {
  const out: QueryMoves[] = [];
  for (const b of base.perQuery) {
    const o = other.perQuery.find((x) => x.path === b.path);
    if (!o) continue;
    const bPaths = new Set(b.top.map((t) => t.path));
    const oPaths = new Set(o.top.map((t) => t.path));
    out.push({ path: b.path, entered: o.top.filter((t) => !bPaths.has(t.path)), left: b.top.filter((t) => !oPaths.has(t.path)) });
  }
  return out;
}
