/**
 * diff-view tests (VIEW-1): hunk parsing with line numbers, status detection,
 * and the affinity ordering of changed files.
 */
import { buildLexmap, type LexmapParams, type SourceFile } from './lexmap.js';
import { changedFileTokens, orderByAffinity, parseDiffHunks } from './diff-view.js';

const PARAMS: LexmapParams = { minTokenLength: 3, noiseShare: 0.5, noiseFloor: 2, maxNeighbors: 20, maxTestRows: 8, maxDocRows: 8, maxSharedShown: 6, maxBridgeTokens: 30, wordWeight: 0.2, ranking: 'sum', conceptKeys: false };

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1..2 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -10,3 +10,4 @@ function settleOrder() {',
  ' const keep = 1;',
  '-emit("order_settled");',
  '+emit("order_settled_v2");',
  '+audit_trail();',
  ' done();',
  'diff --git a/gone.ts b/gone.ts',
  'deleted file mode 100644',
  '--- a/gone.ts',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-old_symbol();',
  'diff --git a/new.ts b/new.ts',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/new.ts',
  '@@ -0,0 +1 @@',
  '+fresh_symbol();',
  'diff --git a/x.ts b/y.ts',
  'similarity index 100%',
  'rename from x.ts',
  'rename to y.ts',
  'diff --git a/img.png b/img.png',
  'Binary files a/img.png and b/img.png differ',
  '',
].join('\n');

describe('parseDiffHunks', () => {
  it('keeps context lines with old/new numbers and detects added/deleted/renamed/binary', () => {
    const files = parseDiffHunks(DIFF);
    expect(files.map((f) => [f.path, f.status, f.binary, f.hunks.length])).toEqual([
      ['src/a.ts', 'modified', false, 1],
      ['gone.ts', 'deleted', false, 1],
      ['new.ts', 'added', false, 1],
      ['y.ts', 'renamed', false, 0],
      ['img.png', 'modified', true, 0],
    ]);
    const a = files[0];
    expect(a?.hunks[0]?.header).toBe('@@ -10,3 +10,4 @@ function settleOrder() {');
    expect(a?.hunks[0]?.lines).toEqual([
      { kind: 'context', text: 'const keep = 1;', oldNo: 10, newNo: 10 },
      { kind: 'del', text: 'emit("order_settled");', oldNo: 11 },
      { kind: 'add', text: 'emit("order_settled_v2");', newNo: 11 },
      { kind: 'add', text: 'audit_trail();', newNo: 12 },
      { kind: 'context', text: 'done();', oldNo: 12, newNo: 13 },
    ]);
    expect(files[3]?.oldPath).toBe('x.ts');
  });
});

describe('orderByAffinity', () => {
  const corpus: SourceFile[] = [
    { path: 'a.ts', text: 'alpha_sym beta_sym' },
    { path: 'b.ts', text: 'beta_sym gamma_sym' },
    { path: 'c.ts', text: 'gamma_sym' },
    { path: 'z.ts', text: 'lonely_sym' },
    { path: 'other.ts', text: 'alpha_sym beta_sym gamma_sym lonely_sym' },
  ];
  const map = buildLexmap(corpus, PARAMS);

  it('chains files by shared rare identifiers and names the link; unrelated files fall back alphabetically and say so', () => {
    const files = [
      { path: 'z.ts', tokens: new Set(['lonely_sym']) },
      { path: 'c.ts', tokens: new Set(['gamma_sym']) },
      { path: 'a.ts', tokens: new Set(['alpha_sym', 'beta_sym']) },
      { path: 'b.ts', tokens: new Set(['beta_sym', 'gamma_sym']) },
    ];
    const order = orderByAffinity(map, files);
    expect(order.map((o) => o.path)).toEqual(['a.ts', 'b.ts', 'c.ts', 'z.ts']);
    expect(order[1]).toEqual({ path: 'b.ts', linkedBy: ['beta_sym'], linkedTo: 'a.ts', rareTokens: 2 });
    expect(order[2]).toEqual({ path: 'c.ts', linkedBy: ['gamma_sym'], linkedTo: 'b.ts', rareTokens: 1 });
    expect(order[3]).toEqual({ path: 'z.ts', linkedBy: [], rareTokens: 1 });
  });

  it('changedFileTokens takes only changed-line identifiers that the index knows, untracked files whole', () => {
    const diffs = parseDiffHunks(DIFF);
    const tokens = changedFileTokens(map, diffs, [{ path: 'u.ts', text: 'lonely_sym unknown_sym' }]);
    expect(tokens.map((t) => [t.path, [...t.tokens].sort()])).toEqual([
      ['src/a.ts', []], // order_settled etc. are not in this corpus
      ['gone.ts', []],
      ['new.ts', []],
      ['y.ts', []],
      ['img.png', []],
      ['u.ts', ['lonely_sym']],
    ]);
  });
});
