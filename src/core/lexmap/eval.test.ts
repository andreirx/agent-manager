/**
 * LEXMAP-EVAL-1 tests: each ranking variant's formula on a corpus whose numbers
 * are computed by hand; the sheet round-trip; the two precisions and recall.
 */
import { buildLexmap, neighbors, type LexmapParams, type SourceFile } from './lexmap.js';
import { appendCandidates, mulberry32, parseSheet, renderSheet, sampleQueries, scoreVariant, topMoves, unjudgedTop, withParams } from './eval.js';

// noiseLimit = max(2, ceil(4 × 0.5)) = 2 → a token in more than 2 files is noise.
const PARAMS: LexmapParams = { minTokenLength: 3, noiseShare: 0.5, noiseFloor: 2, maxNeighbors: 20, maxTestRows: 8, maxDocRows: 8, maxSharedShown: 6, maxBridgeTokens: 30, wordWeight: 0.2, ranking: 'sum' };

// Weights (N = 4): df 2 → ln 2 = 0.6931 (identifier) or 0.1386 (word); df 1 → ln 4.
// q ∩ small = { function (word, 0.1386), betaFn (0.6931), gammaVal (0.6931) }  = 1.5249, small defines betaFn, small has 3 tokens
// q ∩ big   = { alphaFn (0.6931) }                                              = 0.6931, big has 41 tokens
const SOURCES: SourceFile[] = [
  { path: 'src/q.ts', text: 'export function alphaFn() { betaFn(gammaVal) }\n' },
  { path: 'src/big.ts', text: 'alphaFn\n' + Array.from({ length: 40 }, (_, i) => `filler_${i}`).join('\n') + '\n' },
  { path: 'src/small.ts', text: 'function betaFn(x) { gammaVal + x }\n' },
  { path: 'src/none.ts', text: 'unrelated_thing\n' },
];
const map = buildLexmap(SOURCES, PARAMS);
const scoreOf = (variant: LexmapParams['ranking'], path: string): number | undefined => {
  const r = neighbors(withParams(map, { ranking: variant }), 'src/q.ts');
  return r.status === 'found' ? r.rows.code.find((row) => row.path === path)?.score : undefined;
};

describe('ranking variants', () => {
  it('records token counts and the baseline sum', () => {
    expect(map.files.find((f) => f.path === 'src/small.ts')?.tokenCount).toBe(3);
    expect(map.files.find((f) => f.path === 'src/big.ts')?.tokenCount).toBe(41);
    expect(scoreOf('sum', 'src/small.ts')).toBeCloseTo(1.5249, 3);
    expect(scoreOf('sum', 'src/big.ts')).toBeCloseTo(0.6931, 3);
    expect(scoreOf('sum', 'src/none.ts')).toBeUndefined();
  });
  it('sqrt-norm divides by the square root of the candidate length', () => {
    expect(scoreOf('sqrt-norm', 'src/small.ts')).toBeCloseTo(1.5249 / Math.sqrt(3), 3);
    expect(scoreOf('sqrt-norm', 'src/big.ts')).toBeCloseTo(0.6931 / Math.sqrt(41), 3);
  });
  it('saturated damps by K / (K + length)', () => {
    expect(scoreOf('saturated', 'src/small.ts')).toBeCloseTo((1.5249 * 150) / 153, 3);
    expect(scoreOf('saturated', 'src/big.ts')).toBeCloseTo((0.6931 * 150) / 191, 3);
  });
  it('def-bonus counts a token the candidate likely defines twice', () => {
    expect(scoreOf('def-bonus', 'src/small.ts')).toBeCloseTo(1.5249 + 0.6931, 3);
    expect(scoreOf('def-bonus', 'src/big.ts')).toBeCloseTo(0.6931, 3);
  });
  it('min-shared-2 drops a file sharing a single token', () => {
    expect(scoreOf('min-shared-2', 'src/small.ts')).toBeCloseTo(1.5249, 3);
    expect(scoreOf('min-shared-2', 'src/big.ts')).toBeUndefined();
  });
  it('combined stacks the three', () => {
    expect(scoreOf('combined', 'src/small.ts')).toBeCloseTo((1.5249 + 0.6931) / Math.sqrt(3), 3);
    expect(scoreOf('combined', 'src/big.ts')).toBeUndefined();
  });
});

describe('sheet', () => {
  it('samples deterministically, renders, and parses back with labels and notes', () => {
    const queries = sampleQueries(map, 7, { queries: 1, topCandidates: 20, randomCandidates: 1, minQueryTokens: 3 });
    expect(queries).toHaveLength(1);
    const q = queries[0]!;
    expect(q.candidates.map((c) => c.path).sort()).toEqual(expect.arrayContaining(['src/big.ts', 'src/small.ts']));
    const text = renderSheet('/repo', 'HEAD abc', 7, 3, queries);
    const marked = text.replace('- [ ] src/small.ts', '- [x] src/small.ts').replace(/(- \[x\] src\/small\.ts.*⇒)/, '$1 defines betaFn');
    const sheet = parseSheet(marked);
    expect(sheet.repo).toBe('/repo');
    expect(sheet.seed).toBe(7);
    const labels = Object.fromEntries(sheet.queries[0]!.candidates.map((c) => [c.path, [c.label, c.note]]));
    expect(labels['src/small.ts']).toEqual(['related', 'defines betaFn']);
    expect(labels['src/big.ts']).toEqual(['unrelated', '']);
    expect(() => parseSheet('repo: x\n## query: a\n- [x] broken line without separator')).toThrow(/line 3/);
    expect(mulberry32(1)()).toBeCloseTo(mulberry32(1)(), 12);
  });
});

describe('scoring', () => {
  const sheet = parseSheet(['repo: /repo', '## query: src/q.ts', '- [x] src/small.ts — shares: betaFn ⇒ defines it', '- [ ] src/big.ts — shares: alphaFn ⇒', ''].join('\n'));
  it('condensed vs pessimistic precision and recall at k = 2', () => {
    const sum = scoreVariant(map, sheet, 'sum', 2);
    expect(sum.perQuery[0]!.top.map((t) => t.path)).toEqual(['src/small.ts', 'src/big.ts']);
    expect(sum.precisionCondensed).toBe(0.5);
    expect(sum.precisionPessimistic).toBe(0.5);
    expect(sum.recall).toBe(1);
    expect(sum.unjudgedInTop).toBe(0);
    const min2 = scoreVariant(map, sheet, 'min-shared-2', 2);
    expect(min2.perQuery[0]!.top.map((t) => t.path)).toEqual(['src/small.ts']);
    expect(min2.precisionCondensed).toBe(1); // big.ts is no longer a row
    expect(min2.precisionPessimistic).toBe(0.5); // one of two slots filled
    expect(topMoves(sum, min2)[0]).toEqual({ path: 'src/q.ts', entered: [], left: [{ path: 'src/big.ts', label: 'unrelated' }] });
  });
  it('skips a query whose file is gone', () => {
    const gone = parseSheet('repo: /repo\n## query: src/missing.ts\n- [x] src/small.ts — shares: x ⇒\n');
    const s = scoreVariant(map, gone, 'sum', 2);
    expect(s.queries).toBe(0);
    expect(s.skipped).toEqual(['src/missing.ts']);
  });
});

describe('extension', () => {
  it('appends only the unlabelled files a variant promotes, under the right query, leaving the text otherwise identical', () => {
    const sheet = parseSheet(['repo: /repo', '## query: src/q.ts', '- [x] src/small.ts — shares: betaFn ⇒ defines it', '', '## query: src/none.ts', '- [ ] src/big.ts — shares: none ⇒', ''].join('\n'));
    const add = unjudgedTop([map], sheet, 10);
    expect([...add.keys()]).toEqual(['src/q.ts']); // big.ts is in every variant's top 10 for q.ts and is not labelled there
    expect(add.get('src/q.ts')?.map((c) => c.path)).toEqual(['src/big.ts']);
    const text = ['repo: /repo', '## query: src/q.ts', '- [x] src/small.ts — shares: betaFn ⇒ defines it', '', '## query: src/none.ts', '- [ ] src/big.ts — shares: none ⇒', ''].join('\n');
    const extended = appendCandidates(text, add);
    expect(extended.split('\n')[3]).toBe('- [ ] src/big.ts — shares: alphaFn ⇒');
    expect(extended.replace('- [ ] src/big.ts — shares: alphaFn ⇒\n', '')).toBe(text);
  });
});
