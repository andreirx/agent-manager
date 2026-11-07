/**
 * Viewer server tests (VIEW-1): a real temporary git repository with a slice
 * trail, served on a free port, queried over HTTP. Proves the routes, the
 * read-only contract, path containment, and that the candidate diff carries
 * hunks with line numbers, an affinity order and per-file pointers.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { startViewServer, type ViewServer } from './server.js';

const execFile = promisify(execFileCallback);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFile('git', ['-C', cwd, ...args]);
  return stdout;
}

describe('view server', () => {
  let repo = '';
  let server: ViewServer;
  const api = async (path: string): Promise<{ status: number; body: unknown }> => {
    const res = await fetch(`http://127.0.0.1:${server.port}${path}`);
    const text = await res.text();
    return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
  };

  beforeAll(async () => {
    repo = await mkdtemp('/private/tmp/VIEW-1-');
    await git(repo, 'init', '-q');
    await git(repo, 'config', 'user.email', 't@example.com');
    await git(repo, 'config', 'user.name', 't');
    await mkdir(join(repo, 'src'), { recursive: true });
    await mkdir(join(repo, 'docs'), { recursive: true });
    await writeFile(join(repo, 'src/orders.ts'), 'export function settleOrder() {\n  db.query("order_ledger");\n  return 1;\n}\n');
    await writeFile(join(repo, 'src/users.ts'), 'export function createUser() {\n  db.query("user_table");\n}\n');
    await writeFile(join(repo, 'src/schema.sql'), 'CREATE TABLE order_ledger (id TEXT);\nCREATE TABLE user_table (id TEXT);\n');
    await writeFile(join(repo, 'docs/ledger.md'), '# Ledger\n\nThe order_ledger table holds settled orders.\n');
    await writeFile(join(repo, '.gitignore'), '.agent-manager/\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-q', '-m', 'base');
    // Candidate: one modified tracked file, one untracked file.
    await writeFile(join(repo, 'src/orders.ts'), 'export function settleOrder() {\n  db.query("order_ledger");\n  audit("user_table", "order_ledger");\n  return 1;\n}\n');
    await writeFile(join(repo, 'src/new.ts'), 'db.query("user_table");\n');
    // Slice trail.
    const sliceDir = join(repo, '.agent-manager/slices/S-1');
    await mkdir(join(sliceDir, 'runs'), { recursive: true });
    await writeFile(join(repo, '.agent-manager/current.json'), JSON.stringify({ sliceId: 'S-1', sliceDoc: null, updatedAt: '2026-11-07T00:00:00.000Z' }));
    await writeFile(join(sliceDir, 'status.json'), JSON.stringify({ phase: 'review-impl', sliceId: 'S-1', iteration: 1, updatedAt: '2026-11-07T00:00:00.000Z', lastActor: 'claude' }));
    await writeFile(join(sliceDir, 'build-0.md'), '# first\n');
    await writeFile(join(sliceDir, 'build-1.md'), '# second build\n');
    await writeFile(join(sliceDir, 'review-0.json'), '{"verdict":"revise"}');
    server = await startViewServer({ targetDir: repo, port: 0, maxIndexAgeMs: 60_000 });
  });

  afterAll(async () => {
    await server.close();
    await rm(repo, { recursive: true, force: true });
  });

  it('serves the page and the slice trail (newest build and review)', async () => {
    const page = await api('/');
    expect(page.status).toBe(200);
    expect(String(page.body)).toContain('<title>');
    const slice = await api('/api/slice');
    expect(slice.status).toBe(200);
    const body = slice.body as { current: { sliceId: string }; status: { phase: string }; latestBuild: { name: string; text: string }; latestReview: { name: string } };
    expect(body.current.sliceId).toBe('S-1');
    expect(body.status.phase).toBe('review-impl');
    expect(body.latestBuild).toEqual({ name: 'build-1.md', text: '# second build\n' });
    expect(body.latestReview.name).toBe('review-0.json');
    // VIEW-5: the slices list and an explicit pick.
    const listed = (slice.body as { slices: { sliceId: string; phase: string }[]; sliceId: string }).slices;
    expect(listed).toEqual([{ sliceId: 'S-1', phase: 'review-impl', iteration: 1, updatedAt: '2026-11-07T00:00:00.000Z', lastActor: 'claude' }]);
    const picked = (await api('/api/slice?id=S-1')).body as { sliceId: string; status: { phase: string } };
    expect(picked.sliceId).toBe('S-1');
    expect(picked.status.phase).toBe('review-impl');
    expect(((await api('/api/slice?id=NOPE')).body as { status: unknown }).status).toBeNull();
  });

  it('serves the candidate diff with hunks, line numbers, affinity order and per-file pointers', async () => {
    const r = await api('/api/diff');
    expect(r.status).toBe(200);
    const body = r.body as {
      identity: string;
      changedPaths: string[];
      files: { path: string; status: string; hunks: { lines: { kind: string; text: string; newNo?: number }[] }[] }[];
      untracked: { path: string }[];
      order: { path: string; linkedBy: string[]; linkedTo?: string }[];
      pointers: Record<string, { code: { path: string }[]; tests: unknown[]; docs: { path: string }[] }>;
    };
    expect(body.identity).toMatch(/^HEAD [0-9a-f]{7,}, 2 uncommitted entries, inputs sha256:[0-9a-f]{64}$/);
    expect(body.changedPaths).toEqual(['src/new.ts', 'src/orders.ts']);
    expect(body.files.map((f) => [f.path, f.status])).toEqual([['src/orders.ts', 'modified']]);
    const added = body.files[0]?.hunks[0]?.lines.find((l) => l.kind === 'add');
    expect(added).toEqual({ kind: 'add', text: '  audit("user_table", "order_ledger");', newNo: 3 });
    expect(body.untracked.map((u) => u.path)).toEqual(['src/new.ts']);
    expect(body.order.map((o) => o.path)).toEqual(['src/orders.ts', 'src/new.ts']);
    expect(body.order[1]?.linkedBy).toEqual(['user_table']);
    expect(body.order[1]?.linkedTo).toBe('src/orders.ts');
    const p = body.pointers['src/orders.ts'];
    expect(p?.code.map((row) => row.path)).toEqual(expect.arrayContaining(['src/schema.sql', 'src/users.ts']));
    expect(p?.code.map((row) => row.path)).not.toContain('src/new.ts');
    expect(p?.docs.map((row) => row.path)).toEqual(['docs/ledger.md']);
  });

  it('serves activity: the newest run, its events and touched paths, and the uninspected code neighbors', async () => {
    const before = await api('/api/activity');
    expect((before.body as { run: unknown; note: string }).run).toBeNull();
    const dir = join(repo, '.agent-manager/activity');
    await mkdir(dir, { recursive: true });
    const ev = (kind: string, extra: Record<string, unknown>) => JSON.stringify({ at: '2026-11-07T10:00:00.000Z', runId: 'build-S-1-1', sliceId: 'S-1', role: 'builder', provider: 'claude', kind, ...extra });
    await writeFile(join(dir, 'build-S-1-1.ndjson'), [ev('run-start', { detail: 'mode edit' }), ev('read', { tool: 'Read', path: 'src/users.ts' }), ev('exec', { tool: 'Bash', command: 'npm test' }), ev('edit', { tool: 'Edit', path: 'src/orders.ts' }), ''].join('\n'));
    const r = await api('/api/activity');
    const body = r.body as { run: { runId: string; live: boolean; provider: string; role: string }; counts: Record<string, number>; touched: { read: string[]; edited: string[] }; uninspected: { rows: { path: string }[]; basis: string }; readsObservable: boolean };
    expect(body.run.runId).toBe('build-S-1-1');
    expect(body.run.live).toBe(true); // no run-end yet
    expect(body.counts).toEqual({ 'run-start': 1, read: 1, exec: 1, edit: 1 });
    expect(body.touched).toEqual({ read: ['src/users.ts'], edited: ['src/orders.ts'] });
    expect(body.readsObservable).toBe(true);
    // Candidate code neighbors are src/schema.sql and src/users.ts; the run read users.ts → schema.sql remains uninspected.
    expect(body.uninspected.rows.map((x) => x.path)).toEqual(['src/schema.sql']);
    expect(body.uninspected.basis).toContain('minus the 2 files this run read or edited');
    await writeFile(join(dir, 'build-S-1-1.ndjson'), ev('run-end', { detail: 'completed' }) + '\n', { flag: 'a' });
    const ended = (await api('/api/activity?run=build-S-1-1')).body as { run: { live: boolean; status: string } };
    expect(ended.run.live).toBe(false);
    expect(ended.run.status).toBe('completed');
  });

  it('lists directories and answers bridge between two of them (VIEW-2)', async () => {
    const d = (await api('/api/dirs')).body as { dirs: { path: string; files: number; langs: string[] }[] };
    expect(d.dirs.map((x) => x.path)).toEqual(['docs', 'src']);
    expect(d.dirs.find((x) => x.path === 'src')?.langs).toEqual(['sql', 'ts']);
    const b = (await api('/api/bridge?a=src&b=docs')).body as { result: { rows: { token: string; filesA: string[]; filesB: string[] }[] } };
    expect(b.result.rows.map((r) => r.token)).toEqual(['order_ledger', 'TABLE']); // concept keys: SQL TABLE and the doc's "table" are one key, shown by its most frequent spelling
    expect(b.result.rows[0]?.filesB).toEqual(['docs/ledger.md']);
    expect((await api('/api/bridge?a=src&b=src')).status).toBe(400);
  });

  it('lists every indexed path for the repo tree (VIEW-4)', async () => {
    const f = (await api('/api/files')).body as { files: string[] };
    expect(f.files).toEqual(['.gitignore', 'docs/ledger.md', 'src/new.ts', 'src/orders.ts', 'src/schema.sql', 'src/users.ts']);
  });

  it('answers where and neighbors, reads files only inside the target, and refuses writes', async () => {
    const w = await api('/api/where?token=order_ledger');
    const wb = w.body as { result: { status: string; files: { path: string }[] } };
    expect(wb.result.status).toBe('found');
    expect(wb.result.files.map((f) => f.path)[0]).toBe('src/orders.ts');
    const n = await api('/api/neighbors?path=src/users.ts');
    expect((n.body as { result: { status: string } }).result.status).toBe('found');
    const f = await api('/api/file?path=src/users.ts');
    expect((f.body as { text: string }).text).toContain('createUser');
    expect((await api('/api/file?path=../../etc/passwd')).status).toBe(400);
    expect((await api('/api/file?path=.git/HEAD')).status).toBe(400);
    expect((await api('/api/file?path=missing.ts')).status).toBe(404);
    const post = await fetch(`http://127.0.0.1:${server.port}/api/diff`, { method: 'POST' });
    expect(post.status).toBe(405);
    expect((await api('/nope')).status).toBe(404);
  });
});
