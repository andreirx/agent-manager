/**
 * lexmap core tests (LEXMAP-1): tokenizer, noise cutoff, the four queries and
 * the unified-diff parser — all pure, all in memory.
 */
import { tokenize, distinctTokens, conceptKey } from './tokenize.js';
import {
  buildLexmap,
  bridge,
  hunkNeighbors,
  languageOf,
  neighbors,
  parseGitDiffPath,
  parseUnifiedDiff,
  pathClass,
  renderHunkNeighborsSection,
  renderNeighbors,
  renderWhere,
  tokenShape,
  where,
  type LexmapParams,
  type SourceFile,
} from './lexmap.js';

const PARAMS: LexmapParams = { minTokenLength: 3, noiseShare: 0.5, noiseFloor: 2, maxNeighbors: 20, maxTestRows: 8, maxDocRows: 8, maxSharedShown: 6, maxBridgeTokens: 30, wordWeight: 0.2, ranking: 'sum', conceptKeys: false };

describe('tokenize', () => {
  it('yields identifiers with 1-based line/col, honours minLength, marks likely definitions', () => {
    const occ = tokenize('pub fn reconcile_invoice(x: u8) {\n  let total = x;\n}\n', 3);
    expect(occ.map((o) => [o.token, o.line, o.col, o.likelyDefinition])).toEqual([
      ['pub', 1, 1, false],
      ['reconcile_invoice', 1, 8, true],
      ['let', 2, 3, false],
      ['total', 2, 7, true],
    ]);
  });

  it('takes identifiers from inside string literals (routes, event names, table names)', () => {
    const occ = tokenize('app.get("/api/orders/pending", h); emit("order_settled")', 3);
    expect(occ.map((o) => o.token)).toEqual(['app', 'get', 'api', 'orders', 'pending', 'emit', 'order_settled']);
    expect(distinctTokens('a_b a_b order_settled', 3)).toEqual(new Set(['a_b', 'order_settled']));
  });
});

const CORPUS: SourceFile[] = [
  { path: 'backend/orders.ts', text: 'export function settleOrder(id: string) {\n  db.query("UPDATE order_ledger SET state = ?", id);\n  emit("order_settled", id);\n}\nconst data = 1;\n' },
  { path: 'backend/users.ts', text: 'export function createUser() {\n  db.query("INSERT INTO user_table");\n}\nconst data = 2;\n' },
  { path: 'renderer/OrderPanel.tsx', text: 'socket.on("order_settled", refresh);\nconst data = 3;\n' },
  { path: 'migrations/002.sql', text: 'CREATE TABLE order_ledger (id TEXT);\nCREATE TABLE user_table (id TEXT);\n' },
  { path: 'backend/orders.test.ts', text: 'test("settleOrder settles", () => settleOrder("x"));\nconst data = 4;\n' },
];

describe('buildLexmap', () => {
  const map = buildLexmap(CORPUS, PARAMS);

  it('drops tokens above the noise cutoff and keeps the rest with postings', () => {
    // noiseLimit = max(2, ceil(5*0.5)) = 3 → tokens in >3 files are noise.
    expect(map.noise.get('data')).toBe(4);
    expect(map.noise.has('const')).toBe(true);
    expect(map.tokens.has('data')).toBe(false);
    expect(map.tokens.get('order_settled')?.df).toBe(2);
    expect(map.stats.files).toBe(5);
    expect(map.stats.chars).toBe(CORPUS.reduce((n, s) => n + s.text.length, 0));
    expect(map.stats.noiseTokens).toBeGreaterThan(0);
    expect(map.stats.postings).toBeGreaterThan(0);
  });

  it('where: groups by file, definitions first, test/doc last; reports common and absent', () => {
    const r = where(map, 'settleOrder');
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expect(r.files.map((f) => [f.path, f.definitions, f.pathClass])).toEqual([
      ['backend/orders.ts', 1, 'code'],
      ['backend/orders.test.ts', 0, 'test'],
    ]);
    expect(r.files[0]?.occurrences[0]).toEqual({ line: 1, col: 17, likelyDefinition: true });
    expect(renderWhere(r)).toContain('backend/orders.ts  [definition×1]  1:17*');
    expect(where(map, 'data')).toEqual({ status: 'common', token: 'data', df: 4 });
    expect(where(map, 'nothing_here')).toEqual({ status: 'absent', token: 'nothing_here' });
  });

  it('neighbors: ranks by summed rarity and flags cross-language files', () => {
    const r = neighbors(map, 'backend/orders.ts');
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    const paths = r.rows.code.map((row) => row.path);
    expect(paths).toContain('migrations/002.sql');
    expect(paths).toContain('renderer/OrderPanel.tsx');
    const sql = r.rows.code.find((row) => row.path === 'migrations/002.sql');
    expect(sql?.crossLanguage).toBe(true);
    expect(sql?.shared).toContain('order_ledger');
    // The test file lands in its own partition, not among code pointers.
    expect(r.rows.code.map((row) => row.path)).not.toContain('backend/orders.test.ts');
    const sameLang = r.rows.tests.find((row) => row.path === 'backend/orders.test.ts');
    expect(sameLang?.crossLanguage).toBe(false);
    expect(r.rows.docs).toEqual([]);
    expect(neighbors(map, 'missing.ts')).toEqual({ status: 'absent', path: 'missing.ts' });
  });

  it('bridge: lists identifiers two directories share, heaviest first', () => {
    const r = bridge(map, 'backend', 'migrations/');
    const tokens = r.rows.map((row) => row.token);
    expect(tokens).toEqual(expect.arrayContaining(['order_ledger', 'user_table']));
    expect(tokens).not.toContain('order_settled');
    expect(r.rows[0]?.filesA).toContain('backend/orders.ts');
  });
});

describe('parseUnifiedDiff', () => {
  const DIFF = [
    'diff --git a/backend/orders.ts b/backend/orders.ts',
    'index 1..2 100644',
    '--- a/backend/orders.ts',
    '+++ b/backend/orders.ts',
    '@@ -1,3 +1,3 @@',
    ' export function settleOrder(id: string) {',
    '-  emit("order_settled", id);',
    '+  emit("order_settled_v2", id);',
    'diff --git a/gone.ts b/gone.ts',
    'deleted file mode 100644',
    '--- a/gone.ts',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-old_symbol();',
    'diff --git a/img.png b/img.png',
    'Binary files differ',
    '',
  ].join('\n');

  it('collects +/- line text per post-image path and handles deletions', () => {
    const d = parseUnifiedDiff(DIFF);
    expect(d.files).toEqual(['backend/orders.ts', 'gone.ts']);
    expect(d.changedText.get('backend/orders.ts')).toBe('  emit("order_settled", id);\n  emit("order_settled_v2", id);');
    expect(d.changedText.get('gone.ts')).toBe('old_symbol();');
  });

  it('keeps a content line that prints as `+++ x` inside a hunk, and decodes a C-quoted path', () => {
    const quoted = [
      'diff --git "a/src/caf\\303\\251.ts" "b/src/caf\\303\\251.ts"',
      '--- "a/src/caf\\303\\251.ts"',
      '+++ "b/src/caf\\303\\251.ts"',
      '@@ -1 +1,2 @@',
      '-old_line();',
      '+++ rare_symbol',
      '+plain_line();',
      '',
    ].join('\n');
    const d = parseUnifiedDiff(quoted);
    expect(d.files).toEqual(['src/café.ts']);
    expect(d.changedText.get('src/café.ts')).toBe('old_line();\n++ rare_symbol\nplain_line();');
    expect(parseGitDiffPath('"b/a\\tb \\"q\\".ts"', 'b/')).toBe('a\tb "q".ts');
    // Supplementary-plane character (surrogate pair) beside an escape: one code point, not two halves.
    expect(parseGitDiffPath('"b/src/😀\\t.ts"', 'b/')).toBe('src/😀\t.ts');
    expect(parseGitDiffPath('"b/😀\\303\\251😀"', 'b/')).toBe('😀é😀');
    expect(parseGitDiffPath('/dev/null', 'b/')).toBeUndefined();
  });

  it('hunkNeighbors: a renamed or mode-only path (no changed lines) is excluded through changedPaths', () => {
    const map = buildLexmap(CORPUS, PARAMS);
    // A pure rename of users.ts → users-renamed.ts prints no +/- lines; git names it only in --name-only.
    const report = hunkNeighbors(map, { diffText: '', changedPaths: ['backend/users.ts'], untracked: [{ path: 'backend/users-renamed.ts', text: 'db.query("user_table")' }] });
    expect(report.changedFiles).toEqual(['backend/users-renamed.ts', 'backend/users.ts']);
    expect(report.rows.code.map((r) => r.path)).not.toContain('backend/users.ts');
    expect(report.rows.code.map((r) => r.path)).toContain('migrations/002.sql');
  });

  it('hunkNeighbors: unchanged files sharing changed-line identifiers, untracked files counted as added', () => {
    const map = buildLexmap(CORPUS, PARAMS);
    const report = hunkNeighbors(map, { diffText: DIFF, changedPaths: ['backend/orders.ts', 'gone.ts'], untracked: [{ path: 'backend/new.ts', text: 'db.query("user_table")' }] });
    expect(report.changedFiles).toEqual(['backend/new.ts', 'backend/orders.ts', 'gone.ts']);
    const paths = report.rows.code.map((r) => r.path);
    expect(paths).not.toContain('backend/orders.ts');
    expect(paths).toContain('renderer/OrderPanel.tsx'); // shares order_settled
    expect(paths).toContain('migrations/002.sql'); // shares user_table via the untracked file
    expect(paths).toContain('backend/users.ts');
    expect(report.commonTokens).toBeGreaterThanOrEqual(0);
    const section = renderHunkNeighborsSection(report, map, 1234);
    expect(section).toContain('# Lexical neighbors of the candidate (hints, not facts)');
    expect(section).toContain('built in 1.2 s');
    expect(section).toContain('renderer/OrderPanel.tsx');
  });

  it('hunkNeighbors: an empty candidate renders the no-neighbors line', () => {
    const map = buildLexmap(CORPUS, PARAMS);
    const report = hunkNeighbors(map, { diffText: '', changedPaths: [], untracked: [] });
    expect(report.rows).toEqual({ code: [], tests: [], docs: [] });
    expect(renderHunkNeighborsSection(report, map, 0)).toContain('No unchanged file shares a rare identifier');
  });
});

describe('token shape weighting', () => {
  it('classifies identifier-shaped tokens against plain words', () => {
    for (const t of ['settleOrder', 'order_ledger', 'sha256', 'PascalCase', 'x_1']) expect(tokenShape(t)).toBe('identifier');
    for (const t of ['Bash', 'express', 'UNCHANGED', 'Settles']) expect(tokenShape(t)).toBe('word');
  });

  it('one shared identifier outranks several shared plain words of equal rarity', () => {
    const map = buildLexmap([
      // prose shares three plain words (3 × 0.2 = 0.6 of a token's rarity); code shares one identifier (1.0).
      { path: 'src/query.ts', text: 'settleOrder(); // settles the order' },
      { path: 'src/code.ts', text: 'settleOrder();' },
      { path: 'docs/prose.md', text: 'This settles the order.' },
    ], PARAMS);
    const r = neighbors(map, 'src/query.ts');
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expect(r.rows.code.map((row) => [row.path, row.pathClass])).toEqual([['src/code.ts', 'code']]);
    expect(r.rows.docs.map((row) => [row.path, row.pathClass])).toEqual([['docs/prose.md', 'doc']]);
    const text = renderNeighbors(r);
    expect(text).toContain('Code to open:\n     0.4  src/code.ts  — settleOrder');
    expect(text).toContain('Documentation that mentions them (potential doc updates):\n     0.2  docs/prose.md  [cross-language]  — order, settles, the');
    expect(text).toContain('Tests that exercise these identifiers: none found.');
  });
});

describe('path helpers', () => {
  it('languageOf and pathClass', () => {
    expect(languageOf('a/b/Foo.TSX')).toBe('tsx');
    expect(languageOf('Makefile')).toBe('makefile');
    expect(pathClass('src/x.test.ts')).toBe('test');
    expect(pathClass('test/fixtures/sample.md')).toBe('test'); // a Markdown fixture inside tests is test material
    expect(pathClass('docs/a.md')).toBe('doc');
    expect(pathClass('README.txt')).toBe('doc');
    expect(pathClass('src/x.ts')).toBe('code');
  });
});

describe('concept keys (LEXMAP-2, sub-tokenization)', () => {
  it('conceptKey joins the lower-cased parts of every spelling with _', () => {
    expect(['settleOrder', 'settle_order', 'SettleOrder', 'SETTLE_ORDER', '_settleOrder_'].map(conceptKey)).toEqual(Array(5).fill('settle_order'));
    expect(conceptKey('HTTPServer')).toBe('http_server');
    expect(conceptKey('getURL')).toBe('get_url');
    expect(conceptKey('IOError')).toBe('io_error');
    expect(conceptKey('v2Handler')).toBe('v2_handler');
    expect(conceptKey('sha256')).toBe('sha256');
    expect(conceptKey('ngx_http_gzip_static_module')).toBe('ngx_http_gzip_static_module');
    expect(conceptKey('PriceListService')).toBe('price_list_service');
    expect(conceptKey('___')).toBe('');
  });

  it('with conceptKeys on, a TS camelCase name and a SQL snake_case name are one key; off, they are two tokens', () => {
    const sources: SourceFile[] = [
      { path: 'src/orders.ts', text: 'export function settleOrder() { return db.query("ledger_rows"); }\n' },
      { path: 'db/schema.sql', text: 'CREATE TABLE settle_order (id TEXT);\nCREATE TABLE other_thing (id TEXT);\n' },
      { path: 'src/users.ts', text: 'const createUser = () => 1;\n' },
      { path: 'src/misc.ts', text: 'const unrelated_name = 1;\n' },
    ];
    const off = buildLexmap(sources, PARAMS);
    expect(where(off, 'settle_order')).toMatchObject({ status: 'found', files: [{ path: 'db/schema.sql' }] });
    expect(where(off, 'settleOrder')).toMatchObject({ status: 'found', files: [{ path: 'src/orders.ts' }] });
    const on = buildLexmap(sources, { ...PARAMS, conceptKeys: true });
    const r = where(on, 'settleOrder');
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expect(r.key).toBe('settle_order');
    expect(r.files.map((f) => [f.path, f.surfaces, f.definitions])).toEqual([
      ['src/orders.ts', ['settleOrder'], 1],
      ['db/schema.sql', ['settle_order'], 0],
    ]);
    expect(renderWhere(r)).toContain('settleOrder: 2 files, idf 0.7 (concept key settle_order)');
    expect(renderWhere(r)).toContain('db/schema.sql  [use]  1:14  as settle_order');
    // The SQL file is now a neighbor of the TS file, through the shared concept; the row shows the most frequent spelling.
    const n = neighbors(on, 'src/orders.ts');
    expect(n.status).toBe('found');
    if (n.status !== 'found') return;
    expect(n.rows.code.map((row) => [row.path, row.shared])).toEqual([['db/schema.sql', ['settleOrder']]]);
    expect(neighbors(off, 'src/orders.ts')).toMatchObject({ status: 'found', rows: { code: [] } });
    // The bridge between the two directories names the concept by its most frequent spelling.
    expect(bridge(on, 'src', 'db').rows.map((row) => row.token)).toEqual(['settleOrder']);
  });
});
