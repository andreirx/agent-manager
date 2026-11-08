/**
 * The viewer (VIEW-1): a read-only local HTTP server over a target's slice
 * trail, its git candidate and the lexmap index.
 *
 * What it serves and from where:
 *   GET /                  the single page (src/view/static/index.html)
 *   GET /api/slice         .agent-manager/current.json, the active slice's
 *                          status.json, its newest build-<n>.md and review-<n>.json
 *   GET /api/diff          the candidate: `git diff -U3 HEAD` per file with hunks
 *                          and line numbers, untracked text files, the files
 *                          ordered by shared identifiers, and per file the three
 *                          pointer lists (code / tests / docs) of unchanged neighbors
 *   GET /api/activity[?run=]  runs recorded under .agent-manager/activity/, the
 *                          chosen (default newest) run's events, the paths it
 *                          read/edited, and for a builder run the candidate's
 *                          code neighbors it never opened (ACTIVITY-1)
 *   GET /api/file?path=    one file's text (inside the target only; .git refused)
 *   GET /api/where?token=  postings grouped by file, likely definitions first
 *   GET /api/dirs          directories (two levels) with file counts and languages
 *   GET /api/files         every indexed path (the repo tree, VIEW-4); TRANSCRIPT-1: the
 *                          index includes the trail (.agent-manager/slices, /transcripts),
 *                          and `extra` lists the raw run logs — viewable, never indexed
 *   GET /api/sessions?path=  runs whose condensed transcript says they read or edited
 *                          that path or something under it (TRANSCRIPT-1)
 *   GET /api/bridge?a=&b=  identifiers two directories share, heaviest first (VIEW-2)
 *   GET /api/neighbors?path=  the three pointer lists for any file
 *
 * It writes nothing — there is no handler that writes — and it holds no state
 * but an in-memory index that is rebuilt when older than `maxIndexAgeMs`
 * (the page shows the index's age and identity). Binds 127.0.0.1 only.
 * Orthogonal to the relay: the relay neither knows nor needs this process.
 *
 * @module view
 * @maturity PROTOTYPE
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { touchedPaths, type ActivityEvent } from '../core/activity.js';
import { TRANSCRIPTS_DIR, transcriptRelPath, transcriptStarted, transcriptTouches } from '../core/transcript.js';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import {
  bridge,
  directories,
  hunkNeighbors,
  languageOf,
  neighbors,
  neighborsOfTokens,
  where,
  type Lexmap,
  type NeighborRow,
  type NeighborRows,
} from '../core/lexmap/lexmap.js';
import { changedFileTokens, orderByAffinity, parseDiffHunks, type FileDiff, type OrderedFile } from '../core/lexmap/diff-view.js';
import { DEFAULT_WORKING_TREE_PARAMS, buildWorkingTreeLexmap, readCandidateChanges, treeIdentity, type BuiltLexmap } from '../adapters/lexmap/git-working-tree.js';

export interface ViewServerOptions {
  readonly targetDir: string;
  /** 0 = any free port (tests). */
  readonly port: number;
  /**
   * Rebuild the index when older than this. Starting value 5 s — but never
   * sooner than ten build durations (TRANSCRIPT-1 walk: with the trail indexed
   * on a loaded machine one build took 30 s and blocked the event loop, so a
   * 5 s age meant every request waited for a rebuild). A fast build keeps the
   * 5 s; a 30 s build is reused for 5 minutes.
   */
  readonly maxIndexAgeMs?: number;
}

export interface ViewServer {
  readonly port: number;
  close(): Promise<void>;
}

/** One run's structural footprint, read back from its condensed transcript (TRANSCRIPT-1). */
interface SessionTouches {
  readonly runId: string;
  readonly transcript: string;
  readonly startedAt: string | null;
  readonly read: readonly string[];
  readonly edited: readonly string[];
}

interface IndexState {
  readonly built: BuiltLexmap;
  readonly identity: string;
  readonly builtAt: number;
  /** Newest first. Derived from the indexed transcripts at build time — no second read. */
  readonly sessions: readonly SessionTouches[];
}

function sessionTouches(built: BuiltLexmap): SessionTouches[] {
  const out: SessionTouches[] = [];
  for (const f of built.read.files) {
    if (!f.path.startsWith(`${TRANSCRIPTS_DIR}/`) || !f.path.endsWith('.md')) continue;
    const runId = f.path.slice(TRANSCRIPTS_DIR.length + 1, -'.md'.length);
    const { read, edited } = transcriptTouches(f.text);
    out.push({ runId, transcript: f.path, startedAt: transcriptStarted(f.text) ?? null, read, edited });
  }
  return out.sort((a, b) => String(b.startedAt ?? '').localeCompare(String(a.startedAt ?? '')) || (a.runId < b.runId ? 1 : -1));
}

const STATIC_DIR = join(dirname(fileURLToPath(import.meta.url)), 'static');

function json(res: ServerResponse, status: number, body: unknown): void {
  const bytes = Buffer.from(JSON.stringify(body), 'utf-8');
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': bytes.length, 'cache-control': 'no-store' });
  res.end(bytes);
}

/** Target-relative path → absolute, refusing escapes and the .git directory. */
function containedPath(targetDir: string, relative: string): string | undefined {
  const root = resolve(targetDir);
  const abs = resolve(root, relative);
  if (abs !== root && !abs.startsWith(root + sep)) return undefined;
  const rel = abs.slice(root.length + 1);
  if (rel === '.git' || rel.startsWith('.git' + sep)) return undefined;
  return abs;
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return undefined;
  }
}

function newestNumbered(names: readonly string[], prefix: string, suffix: string): string | undefined {
  let best: { n: number; name: string } | undefined;
  for (const name of names) {
    if (!name.startsWith(prefix) || !name.endsWith(suffix)) continue;
    const n = Number(name.slice(prefix.length, name.length - suffix.length));
    if (Number.isInteger(n) && (!best || n > best.n)) best = { n, name };
  }
  return best?.name;
}

export async function startViewServer(options: ViewServerOptions): Promise<ViewServer> {
  const targetDir = resolve(options.targetDir);
  const maxAge = options.maxIndexAgeMs ?? 5000;
  let state: IndexState | undefined;
  let building: Promise<IndexState> | undefined;

  const index = async (): Promise<IndexState> => {
    if (state && Date.now() - state.builtAt < Math.max(maxAge, 10 * state.built.buildMs)) return state;
    if (!building) {
      building = (async () => {
        const built = await buildWorkingTreeLexmap(targetDir, { ...DEFAULT_WORKING_TREE_PARAMS, includeTrail: true });
        const identity = await treeIdentity(targetDir, built.read);
        state = { built, identity, builtAt: Date.now(), sessions: sessionTouches(built) };
        return state;
      })().finally(() => { building = undefined; });
    }
    return building;
  };

  /**
   * The slice trail. `wanted` (VIEW-5) picks any slice under .agent-manager/slices;
   * otherwise current.json's, else the most recently updated. `slices` lists them
   * all with their status, newest first — the "sessions" list.
   */
  const sliceInfo = async (wanted: string | null): Promise<unknown> => {
    const amDir = join(targetDir, '.agent-manager');
    const currentRaw = await readOptional(join(amDir, 'current.json'));
    const current = currentRaw ? (JSON.parse(currentRaw) as { sliceId?: string }) : null;
    const slicesDir = join(amDir, 'slices');
    let ids: string[] = [];
    try { ids = await readdir(slicesDir); } catch { ids = []; }
    const slices = (await Promise.all(ids.map(async (id) => {
      const raw = await readOptional(join(slicesDir, id, 'status.json'));
      if (!raw) return null;
      try {
        const st = JSON.parse(raw) as { phase?: string; iteration?: number; updatedAt?: string; lastActor?: string };
        return { sliceId: id, phase: st.phase ?? null, iteration: st.iteration ?? null, updatedAt: st.updatedAt ?? null, lastActor: st.lastActor ?? null };
      } catch { return null; }
    }))).filter((s): s is NonNullable<typeof s> => s !== null).sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
    const sliceId = wanted ?? current?.sliceId ?? slices[0]?.sliceId;
    if (!sliceId) return { target: targetDir, current, slices, sliceId: null, status: null, latestBuild: null, latestReview: null, files: [] };
    const sliceDir = join(slicesDir, sliceId);
    let names: string[] = [];
    try { names = (await readdir(sliceDir)).sort(); } catch { names = []; }
    const statusRaw = await readOptional(join(sliceDir, 'status.json'));
    const buildName = newestNumbered(names, 'build-', '.md');
    const reviewName = newestNumbered(names, 'review-', '.json');
    return {
      target: targetDir,
      current,
      slices,
      sliceId,
      status: statusRaw ? JSON.parse(statusRaw) : null,
      files: names,
      latestBuild: buildName ? { name: buildName, text: await readOptional(join(sliceDir, buildName)) ?? '' } : null,
      latestReview: reviewName ? { name: reviewName, text: await readOptional(join(sliceDir, reviewName)) ?? '' } : null,
    };
  };

  const diffInfo = async (): Promise<unknown> => {
    const { built, identity, builtAt } = await index();
    const map: Lexmap = built.map;
    const changes = await readCandidateChanges(targetDir, 'HEAD', undefined, 3);
    const files: FileDiff[] = parseDiffHunks(changes.diffText);
    const untracked = changes.untracked.map((u) => ({ path: u.path, text: u.text }));
    const tokens = changedFileTokens(map, files, untracked);
    const order: OrderedFile[] = orderByAffinity(map, tokens);
    const allChanged = new Set<string>([...changes.changedPaths, ...files.map((f) => f.path), ...untracked.map((u) => u.path)]);
    const pointers: Record<string, NeighborRows> = {};
    for (const t of tokens) pointers[t.path] = neighborsOfTokens(map, t.tokens, allChanged, [languageOf(t.path)]);
    return {
      identity,
      indexAgeMs: Date.now() - builtAt,
      stats: map.stats,
      changedPaths: [...allChanged].sort(),
      files,
      untracked,
      order,
      pointers,
      note: 'Files are ordered by the rare identifiers their changed lines share with files placed before them (greedy); a row with no link is an alphabetical fallback. Pointers are lexical hints, never resolved references.',
    };
  };

  /**
   * ACTIVITY-1: the runs recorded under .agent-manager/activity/, the chosen
   * run's events, the paths it read and edited, and — for a builder run — the
   * candidate's code neighbors the agent never opened ("uninspected").
   */
  const activityInfo = async (wanted: string | null): Promise<unknown> => {
    const dir = join(targetDir, '.agent-manager', 'activity');
    let names: string[] = [];
    try { names = (await readdir(dir)).filter((n) => n.endsWith('.ndjson')); } catch { names = []; }
    const runs = await Promise.all(names.map(async (name) => {
      const info = await stat(join(dir, name));
      // VIEW-5: the first line (run-start) names the slice, role and provider — the runs list needs them to be legible.
      const head = ((await readOptional(join(dir, name)) ?? '').split('\n')[0] ?? '').trim();
      let first: Partial<ActivityEvent> = {};
      try { if (head) first = JSON.parse(head) as Partial<ActivityEvent>; } catch { first = {}; }
      const runId = name.slice(0, -'.ndjson'.length);
      // TRANSCRIPT-1: the run's condensed transcript, when one exists (live runs write it at run end).
      const transcript = transcriptRelPath(runId);
      const hasTranscript = await stat(join(targetDir, transcript)).then((t) => t.isFile()).catch(() => false);
      return { runId, mtimeMs: info.mtimeMs, bytes: info.size, sliceId: first.sliceId ?? null, role: first.role ?? null, provider: first.provider ?? null, startedAt: first.at ?? null, transcript: hasTranscript ? transcript : null };
    }));
    runs.sort((a, b) => b.mtimeMs - a.mtimeMs || (a.runId < b.runId ? 1 : -1));
    const chosen = wanted ? runs.find((r) => r.runId === wanted) : runs[0];
    if (!chosen) return { runs, run: null, events: [], counts: {}, touched: { read: [], edited: [] }, uninspected: null, note: 'no activity recorded yet for this target' };
    const raw = await readOptional(join(dir, `${chosen.runId}.ndjson`)) ?? '';
    const events: ActivityEvent[] = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line) as ActivityEvent); } catch { /* a partially written tail line */ }
    }
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    const touched = touchedPaths(events);
    const first = events[0];
    const last = events[events.length - 1];
    const live = last?.kind !== 'run-end';
    const provider = first?.provider ?? 'unknown';
    const readsObservable = provider === 'claude';
    let uninspected: { rows: NeighborRow[]; basis: string } | null = null;
    if (first?.role === 'builder') {
      const { built } = await index();
      const changes = await readCandidateChanges(targetDir, 'HEAD');
      const report = hunkNeighbors(built.map, changes);
      const seen = new Set<string>([...touched.read, ...touched.edited]);
      uninspected = {
        rows: report.rows.code.filter((r) => !seen.has(r.path)),
        basis: readsObservable
          ? `code neighbors of the candidate's changed lines (${report.rows.code.length}) minus the ${seen.size} file${seen.size === 1 ? '' : 's'} this run read or edited`
          : `code neighbors of the candidate's changed lines (${report.rows.code.length}); ${provider} does not expose file reads (reads happen inside shell commands), so nothing could be subtracted — treat every row as unconfirmed`,
      };
    }
    return { runs, run: { ...chosen, provider, role: first?.role ?? null, live, startedAt: first?.at ?? null, endedAt: live ? null : last?.at ?? null, status: live ? 'running' : last?.detail ?? null }, events, counts, touched, uninspected, readsObservable };
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method !== 'GET') { json(res, 405, { error: 'read-only viewer: GET only' }); return; }
    switch (url.pathname) {
      case '/': {
        const page = await readFile(join(STATIC_DIR, 'index.html'));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(page);
        return;
      }
      case '/api/slice': json(res, 200, await sliceInfo(url.searchParams.get('id'))); return;
      case '/api/diff': json(res, 200, await diffInfo()); return;
      case '/api/activity': json(res, 200, await activityInfo(url.searchParams.get('run'))); return;
      case '/api/file': {
        const rel = url.searchParams.get('path') ?? '';
        const abs = containedPath(targetDir, rel);
        if (!abs) { json(res, 400, { error: 'path must stay inside the target and outside .git' }); return; }
        const text = await readOptional(abs);
        if (text === undefined) { json(res, 404, { error: 'not readable', path: rel }); return; }
        json(res, 200, { path: rel, lang: languageOf(rel), text });
        return;
      }
      case '/api/dirs': {
        const { built, identity } = await index();
        json(res, 200, { identity, dirs: directories(built.map, 2) });
        return;
      }
      case '/api/files': {
        // VIEW-4: every indexed path, for the repo tree (the index already holds them; no extra I/O).
        // TRANSCRIPT-1: plus the raw run logs — on disk, viewable through /api/file, never indexed (the FULL version).
        const { built, identity } = await index();
        let logs: string[] = [];
        try { logs = (await readdir(join(targetDir, '.agent-manager', 'logs'))).filter((n) => n.endsWith('.txt')).sort().map((n) => `.agent-manager/logs/${n}`); } catch { logs = []; }
        json(res, 200, { identity, files: built.map.files.map((f) => f.path), extra: logs, extraNote: 'raw provider logs: the full stream of each run, readable but not indexed; the condensed transcripts under .agent-manager/transcripts are' });
        return;
      }
      case '/api/sessions': {
        // TRANSCRIPT-1: the runs whose transcript says they read or edited `path` (a file) or anything under it (a directory).
        const path = (url.searchParams.get('path') ?? '').replace(/\/+$/, '');
        const { identity, sessions } = await index();
        const under = (p: string): boolean => path === '' || p === path || p.startsWith(`${path}/`);
        const rows = sessions.map((s) => ({ runId: s.runId, transcript: s.transcript, startedAt: s.startedAt, edited: s.edited.filter(under), read: s.read.filter(under) })).filter((s) => s.edited.length > 0 || s.read.length > 0);
        json(res, 200, { identity, path, sessions: rows, total: sessions.length, note: 'from the read/edit lines of each condensed transcript under .agent-manager/transcripts; Codex runs read inside shell commands, so their reads are not listed' });
        return;
      }
      case '/api/bridge': {
        const a = url.searchParams.get('a') ?? '';
        const b = url.searchParams.get('b') ?? '';
        if (a === '' || b === '' || a === b) { json(res, 400, { error: 'two different directories required (a, b)' }); return; }
        const { built, identity } = await index();
        json(res, 200, { identity, result: bridge(built.map, a, b), note: 'Identifiers both directories contain, heaviest first (rarity × shape), wider spread on ties. A shared name is a lexical bridge, not a resolved symbol.' });
        return;
      }
      case '/api/where': {
        const token = url.searchParams.get('token') ?? '';
        if (token === '') { json(res, 400, { error: 'token required' }); return; }
        const { built, identity } = await index();
        json(res, 200, { identity, result: where(built.map, token) });
        return;
      }
      case '/api/neighbors': {
        const path = url.searchParams.get('path') ?? '';
        const { built, identity } = await index();
        json(res, 200, { identity, result: neighbors(built.map, path) });
        return;
      }
      default:
        json(res, 404, { error: 'unknown route' });
    }
  };

  const server: Server = createServer((req, res) => {
    handle(req, res).catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (!res.headersSent) json(res, 500, { error: message });
      else res.end();
    });
  });
  await new Promise<void>((accept, reject) => {
    server.once('error', reject);
    server.listen(options.port, '127.0.0.1', () => accept());
  });
  const port = (server.address() as AddressInfo).port;
  return {
    port,
    close: () => new Promise<void>((accept, reject) => server.close((err) => (err ? reject(err) : accept()))),
  };
}
