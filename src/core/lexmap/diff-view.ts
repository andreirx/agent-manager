/**
 * Diff-in-context for the viewer (VIEW-1): the pure part.
 *
 * Two things a browser page needs that `hunkNeighbors` does not provide:
 *
 *  1. `parseDiffHunks` — the unified diff WITH its context lines and line
 *     numbers (the `-U3` form), per file, so the page can render hunks the way
 *     a reviewer reads them. `parseUnifiedDiff` (lexmap.ts) keeps only the
 *     changed text for tokenizing; this keeps everything for display.
 *
 *  2. `orderByAffinity` — changed files ordered by what they share instead of
 *     alphabetically: start from the file with the most rare identifiers on its
 *     changed lines, then repeatedly take the not-yet-placed file that shares
 *     the heaviest identifiers with the files already placed, naming the link.
 *     This is a partial order made total greedily; ties fall back to the path,
 *     and every row says what linked it, so the page is honest about which
 *     adjacencies are real and which are alphabetical fallback.
 *
 * Pure: no I/O, no Node APIs.
 *
 * @module core/lexmap
 * @maturity PROTOTYPE
 */

import { distinctTokens } from './tokenize.js';
import { parseGitDiffPath, tokenWeight, type Lexmap } from './lexmap.js';

export type DiffLineKind = 'context' | 'add' | 'del';

export interface DiffLine {
  readonly kind: DiffLineKind;
  readonly text: string;
  /** 1-based line number in the old file (absent for additions). */
  readonly oldNo?: number;
  /** 1-based line number in the new file (absent for deletions). */
  readonly newNo?: number;
}

export interface DiffHunk {
  readonly header: string;
  readonly lines: readonly DiffLine[];
}

export interface FileDiff {
  readonly path: string;
  readonly status: 'modified' | 'added' | 'deleted' | 'renamed';
  readonly oldPath?: string;
  readonly binary: boolean;
  readonly hunks: readonly DiffHunk[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Unified diff (any context width) → per-file hunks with line numbers. */
export function parseDiffHunks(diffText: string): FileDiff[] {
  const files: { path: string; status: FileDiff['status']; oldPath?: string; binary: boolean; hunks: { header: string; lines: DiffLine[] }[] }[] = [];
  let file: (typeof files)[number] | undefined;
  let hunk: { header: string; lines: DiffLine[] } | undefined;
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;
  let oldHeader: string | undefined;
  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      // `diff --git a/<old> b/<new>`: the b/ side names the file when no
      // `+++` header follows (binary, rename-only, mode-only). Split at the
      // last ` b/`; the `+++`/`rename to` lines refine it when present.
      const at = raw.lastIndexOf(' b/');
      const initial = at > 0 ? (parseGitDiffPath(raw.slice(at + 1), 'b/') ?? '') : '';
      file = { path: initial, status: 'modified', binary: false, hunks: [] };
      files.push(file);
      hunk = undefined;
      inHunk = false;
      oldHeader = undefined;
      continue;
    }
    if (!file) continue;
    if (!inHunk) {
      if (raw.startsWith('--- ')) {
        oldHeader = parseGitDiffPath(raw.slice(4), 'a/');
        if (oldHeader === undefined) file.status = 'added';
      } else if (raw.startsWith('+++ ')) {
        const p = parseGitDiffPath(raw.slice(4), 'b/');
        if (p === undefined) {
          file.status = 'deleted';
          file.path = oldHeader ?? file.path;
        } else {
          file.path = p;
          if (oldHeader !== undefined && oldHeader !== p) {
            file.status = 'renamed';
            file.oldPath = oldHeader;
          }
        }
      } else if (raw.startsWith('rename from ')) {
        file.oldPath = raw.slice('rename from '.length);
        file.status = 'renamed';
      } else if (raw.startsWith('rename to ')) {
        file.path = raw.slice('rename to '.length);
      } else if (raw.startsWith('Binary files ')) {
        file.binary = true;
      } else if (raw.startsWith('@@')) {
        inHunk = true;
      }
      if (!inHunk) continue;
    }
    if (raw.startsWith('@@')) {
      const m = HUNK_HEADER.exec(raw);
      oldNo = Number(m?.[1] ?? 1);
      newNo = Number(m?.[2] ?? 1);
      hunk = { header: raw, lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (!hunk || raw.startsWith('\\')) continue;
    if (raw.startsWith('+')) {
      hunk.lines.push({ kind: 'add', text: raw.slice(1), newNo });
      newNo += 1;
    } else if (raw.startsWith('-')) {
      hunk.lines.push({ kind: 'del', text: raw.slice(1), oldNo });
      oldNo += 1;
    } else if (raw.startsWith(' ') || raw === '') {
      // A context line; a bare empty string is the diff's trailing newline.
      if (raw === '' ) continue;
      hunk.lines.push({ kind: 'context', text: raw.slice(1), oldNo, newNo });
      oldNo += 1;
      newNo += 1;
    }
  }
  return files.filter((f) => f.path !== '').map((f) => ({ ...f, ...(f.oldPath !== undefined ? { oldPath: f.oldPath } : {}) }));
}

/** One changed file with the rare identifiers on its changed lines. */
export interface ChangedFileTokens {
  readonly path: string;
  readonly tokens: ReadonlySet<string>;
}

export function changedFileTokens(map: Lexmap, diffs: readonly FileDiff[], untracked: readonly { path: string; text: string }[]): ChangedFileTokens[] {
  const out: ChangedFileTokens[] = [];
  const live = (text: string): Set<string> => {
    const s = new Set<string>();
    for (const t of distinctTokens(text, map.params.minTokenLength)) if (map.tokens.has(t)) s.add(t);
    return s;
  };
  for (const d of diffs) {
    const changed = d.hunks.flatMap((h) => h.lines.filter((l) => l.kind !== 'context').map((l) => l.text)).join('\n');
    out.push({ path: d.path, tokens: live(changed) });
  }
  for (const u of untracked) out.push({ path: u.path, tokens: live(u.text) });
  return out;
}

export interface OrderedFile {
  readonly path: string;
  /** Identifiers that linked this file to the files placed before it, heaviest first (empty = alphabetical fallback). */
  readonly linkedBy: readonly string[];
  /** The earlier file this one shares the most with (absent for the first and for fallbacks). */
  readonly linkedTo?: string;
  readonly rareTokens: number;
}

/**
 * Greedy affinity order over changed files (see module doc). `maxLinksShown`
 * caps the identifiers named per row.
 */
export function orderByAffinity(map: Lexmap, files: readonly ChangedFileTokens[], maxLinksShown = 6): OrderedFile[] {
  const remaining = [...files].sort((a, b) => b.tokens.size - a.tokens.size || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const placed: OrderedFile[] = [];
  const placedTokens = new Map<string, ChangedFileTokens>();
  const weight = (t: string): number => tokenWeight(map, t);
  while (remaining.length > 0) {
    if (placed.length === 0) {
      const first = remaining.shift();
      if (!first) break;
      placed.push({ path: first.path, linkedBy: [], rareTokens: first.tokens.size });
      placedTokens.set(first.path, first);
      continue;
    }
    let best: { index: number; score: number; links: { token: string; w: number }[]; to: string } | undefined;
    for (let i = 0; i < remaining.length; i += 1) {
      const cand = remaining[i];
      if (!cand) continue;
      let bestTo: { path: string; score: number; links: { token: string; w: number }[] } | undefined;
      for (const [path, prev] of placedTokens) {
        const links: { token: string; w: number }[] = [];
        let score = 0;
        for (const t of cand.tokens) {
          if (prev.tokens.has(t)) {
            const w = weight(t);
            score += w;
            links.push({ token: t, w });
          }
        }
        if (score > 0 && (!bestTo || score > bestTo.score)) bestTo = { path, score, links };
      }
      if (bestTo && (!best || bestTo.score > best.score)) best = { index: i, score: bestTo.score, links: bestTo.links, to: bestTo.path };
    }
    if (!best) {
      // Nothing shares anything with what is placed: alphabetical fallback, said so.
      remaining.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      const next = remaining.shift();
      if (!next) break;
      placed.push({ path: next.path, linkedBy: [], rareTokens: next.tokens.size });
      placedTokens.set(next.path, next);
      continue;
    }
    const [next] = remaining.splice(best.index, 1);
    if (!next) break;
    best.links.sort((a, b) => b.w - a.w || (a.token < b.token ? -1 : 1));
    placed.push({ path: next.path, linkedBy: best.links.slice(0, maxLinksShown).map((l) => l.token), linkedTo: best.to, rareTokens: next.tokens.size });
    placedTokens.set(next.path, next);
  }
  return placed;
}
