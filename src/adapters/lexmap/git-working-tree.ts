/**
 * Git working-tree adapter for lexmap (LEXMAP-1).
 *
 * Reads the working tree as git sees it — tracked plus untracked-not-ignored
 * files (`git ls-files --cached --others --exclude-standard`) — into the
 * `SourceFile` shape the core index consumes, and fetches a candidate's
 * changes for `hunkNeighbors`: `git diff <basis>` (changed lines),
 * `git diff --name-only -z <basis>` (every changed tracked path, including
 * renames and mode-only changes that have no changed lines) and the untracked
 * files.
 *
 * Text detection is mechanical: a NUL byte in the first 8,000 bytes marks a
 * binary; files above `maxFileBytes` are skipped by `stat` BEFORE they are
 * read (review-0 finding 2: the bound must hold before allocation, or a large
 * file defeats the reason it exists). Both counts are reported, never hidden.
 *
 * Best-effort composition (`candidateLexicalHints`): any failure renders an
 * "Unavailable: <reason>" section — a named reason, never a silent absence —
 * so a review proceeds without the hint rather than failing on it.
 *
 * @module adapters/lexmap
 * @maturity PROTOTYPE
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  buildLexmap,
  hunkNeighbors,
  renderHunkNeighborsSection,
  type CandidateChanges,
  type Lexmap,
  type SourceFile,
} from '../../core/lexmap/lexmap.js';

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 256 * 1024 * 1024;

export interface WorkingTreeReadParams {
  /** Files larger than this are skipped. Starting value 2 MB. */
  readonly maxFileBytes: number;
  /**
   * TRANSCRIPT-1: also read the relay's local trail, which git ignores —
   * `.agent-manager/slices/**` (briefs, build reports, verdicts) and
   * `.agent-manager/transcripts/**` (condensed run transcripts). Never the raw
   * `logs/`, the `activity/` event files, `journals/`, or the `runs/*.json`
   * run records under a slice (machine records: digests and paths nobody reads
   * as text — ~1,300 of them on glamCRM, half the trail). The viewer and the
   * lexmap CLI (`--trail`) opt in; the relay's reviewer hints keep the default
   * (false) so its context is unchanged.
   */
  readonly includeTrail?: boolean;
}

export const DEFAULT_WORKING_TREE_PARAMS: WorkingTreeReadParams = { maxFileBytes: 2_000_000 };

/** The trail directories the index may include, relative to the target. */
export const TRAIL_INDEXED_DIRS: readonly string[] = ['.agent-manager/slices', '.agent-manager/transcripts'];
/** Inside them, the run records are not text anyone reads. */
const TRAIL_EXCLUDED = /\/runs\//;

/** Every regular file under `dir` (target-relative, forward slashes, sorted); none when the directory is absent. */
async function filesUnder(targetDir: string, dir: string): Promise<string[]> {
  try {
    const entries = await readdir(join(targetDir, dir), { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => `${e.parentPath.slice(targetDir.length + 1).split('\\').join('/')}/${e.name}`)
      .sort();
  } catch {
    return [];
  }
}

export interface WorkingTreeRead {
  readonly files: readonly SourceFile[];
  /** Sum of the on-disk sizes of the files read (bytes, as `stat` reports them). */
  readonly bytes: number;
  /**
   * `sha256:` over the sorted `<path>\0<sha256 of bytes>\n` lines of every file
   * indexed — the exact input identity of a measurement. HEAD plus a count of
   * uncommitted entries does not pin working-tree content (review-1).
   */
  readonly inputsDigest: string;
  readonly skipped: { readonly binary: number; readonly large: number; readonly unreadable: number };
}

async function git(targetDir: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', targetDir, ...args], { maxBuffer: GIT_MAX_BUFFER });
  return stdout;
}

/** NUL-separated path list (git prints raw bytes with `-z`; no quoting to undo). */
async function gitPaths(targetDir: string, args: readonly string[]): Promise<string[]> {
  const stdout = await git(targetDir, args);
  const seen = new Set<string>();
  for (const p of stdout.split('\0')) if (p.length > 0) seen.add(p);
  return [...seen].sort();
}

function isBinary(bytes: Buffer): boolean {
  const limit = Math.min(bytes.length, 8000);
  for (let i = 0; i < limit; i += 1) if (bytes[i] === 0) return true;
  return false;
}

async function readTextFiles(targetDir: string, paths: readonly string[], params: WorkingTreeReadParams): Promise<WorkingTreeRead> {
  const files: SourceFile[] = [];
  const skipped = { binary: 0, large: 0, unreadable: 0 };
  let bytes = 0;
  const identity: string[] = [];
  const decoder = new TextDecoder('utf-8');
  const batch = 64;
  for (let i = 0; i < paths.length; i += batch) {
    const slice = paths.slice(i, i + batch);
    const results = await Promise.all(slice.map(async (path): Promise<{ path: string; outcome: 'large' | 'unreadable' } | { path: string; outcome: 'read'; bytes: Buffer }> => {
      const full = join(targetDir, path);
      try {
        const info = await stat(full);
        if (!info.isFile()) return { path, outcome: 'unreadable' };
        if (info.size > params.maxFileBytes) return { path, outcome: 'large' };
        return { path, outcome: 'read', bytes: await readFile(full) };
      } catch {
        return { path, outcome: 'unreadable' };
      }
    }));
    for (const r of results) {
      if (r.outcome !== 'read') { skipped[r.outcome] += 1; continue; }
      if (isBinary(r.bytes)) { skipped.binary += 1; continue; }
      bytes += r.bytes.length;
      identity.push(`${r.path}\0${createHash('sha256').update(r.bytes).digest('hex')}\n`);
      files.push({ path: r.path, text: decoder.decode(r.bytes) });
    }
  }
  const inputsDigest = `sha256:${createHash('sha256').update(identity.sort().join('')).digest('hex')}`;
  return { files, bytes, inputsDigest, skipped };
}

/** Every text file of the working tree as git sees it (tracked + untracked, not ignored), plus the trail when asked. */
export async function readWorkingTreeFiles(targetDir: string, params: WorkingTreeReadParams = DEFAULT_WORKING_TREE_PARAMS): Promise<WorkingTreeRead> {
  const paths = await gitPaths(targetDir, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  if (!params.includeTrail) return readTextFiles(targetDir, paths, params);
  const seen = new Set(paths);
  for (const dir of TRAIL_INDEXED_DIRS) for (const p of await filesUnder(targetDir, dir)) if (!TRAIL_EXCLUDED.test(p)) seen.add(p);
  return readTextFiles(targetDir, [...seen].sort(), params);
}

/**
 * The candidate's changes against `basis`: the unified diff (with
 * `core.quotePath=false` so non-ASCII paths print raw), every changed tracked
 * path, and the untracked text files (whole content counts as added).
 */
export async function readCandidateChanges(targetDir: string, basis = 'HEAD', params: WorkingTreeReadParams = DEFAULT_WORKING_TREE_PARAMS, contextLines = 0): Promise<CandidateChanges> {
  // `contextLines` 0 for tokenizing (the default; only changed lines matter), 3 for display (VIEW-1).
  const diffText = await git(targetDir, ['-c', 'core.quotePath=false', 'diff', '--no-color', '--no-ext-diff', `-U${contextLines}`, basis, '--']);
  const changedPaths = await gitPaths(targetDir, ['diff', '--name-only', '-z', basis, '--']);
  const untrackedPaths = await gitPaths(targetDir, ['ls-files', '-z', '--others', '--exclude-standard']);
  const untracked = await readTextFiles(targetDir, untrackedPaths, params);
  return { diffText, changedPaths, untracked: untracked.files };
}

/**
 * `HEAD <short-sha>, <n> uncommitted entries, inputs <digest>` — where the tree
 * stood (for a human) and exactly which bytes were indexed (for reproduction).
 */
export async function treeIdentity(targetDir: string, read: WorkingTreeRead): Promise<string> {
  const head = (await git(targetDir, ['rev-parse', '--short', 'HEAD'])).trim();
  const status = await git(targetDir, ['status', '--porcelain', '-z', '--untracked-files=all']);
  const entries = status.split('\0').filter((l) => l.length > 0).length;
  return `HEAD ${head}, ${entries} uncommitted entr${entries === 1 ? 'y' : 'ies'}, inputs ${read.inputsDigest}`;
}

export interface BuiltLexmap {
  readonly map: Lexmap;
  readonly read: WorkingTreeRead;
  readonly buildMs: number;
}

/** Read the tree and build the index, timing both together. */
export async function buildWorkingTreeLexmap(targetDir: string, params: WorkingTreeReadParams = DEFAULT_WORKING_TREE_PARAMS): Promise<BuiltLexmap> {
  const t0 = performance.now();
  const read = await readWorkingTreeFiles(targetDir, params);
  const map = buildLexmap(read.files);
  return { map, read, buildMs: performance.now() - t0 };
}

export const LEXICAL_HINTS_HEADER = '# Lexical neighbors of the candidate (hints, not facts)';

/**
 * The reviewer-context section for the candidate in `targetDir`: index the
 * tree, diff against `HEAD`, rank unchanged neighbors, render. Never throws.
 */
export async function candidateLexicalHints(targetDir: string): Promise<string> {
  try {
    const built = await buildWorkingTreeLexmap(targetDir);
    const changes = await readCandidateChanges(targetDir);
    const report = hunkNeighbors(built.map, changes);
    return renderHunkNeighborsSection(report, built.map, built.buildMs, await treeIdentity(targetDir, built.read));
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message.split('\n')[0] ?? cause.message : String(cause);
    return `${LEXICAL_HINTS_HEADER}\n\nUnavailable: ${reason}`;
  }
}
