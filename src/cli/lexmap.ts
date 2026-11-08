/**
 * `npm run lexmap -- <target> <verb> …` — the lexmap index on a working tree (LEXMAP-1).
 *
 * Verbs:
 *   stats                          index size, build time, heap
 *   where <identifier>             postings grouped by file, likely definitions first
 *   neighbors <path>               files sharing rare identifiers with <path>
 *   bridge <dirA> <dirB>           identifiers two directories share
 *   hunk-neighbors [--basis <rev>] unchanged files sharing identifiers with the candidate's changed lines
 * Flags: --json (machine output), --max-file-bytes <n>, --trail (index .agent-manager/slices and /transcripts too — what the viewer sees)
 *
 * Composition root only: reads through the git adapter, answers through the pure core.
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { resolve } from 'node:path';
import {
  bridge,
  hunkNeighbors,
  neighbors,
  renderBridge,
  renderHunkNeighborsSection,
  renderNeighbors,
  renderWhere,
  where,
} from '../core/lexmap/lexmap.js';
import { buildWorkingTreeLexmap, readCandidateChanges, treeIdentity, DEFAULT_WORKING_TREE_PARAMS } from '../adapters/lexmap/git-working-tree.js';

function usage(): never {
  console.error('Usage: npm run lexmap -- <target> (stats | where <identifier> | neighbors <path> | bridge <dirA> <dirB> | hunk-neighbors [--basis <rev>]) [--json] [--max-file-bytes <n>] [--trail]');
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const positional: string[] = [];
  let json = false;
  let basis = 'HEAD';
  let maxFileBytes = DEFAULT_WORKING_TREE_PARAMS.maxFileBytes;
  let includeTrail = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? '';
    if (a === '--json') json = true;
    else if (a === '--trail') includeTrail = true;
    else if (a === '--basis') basis = argv[++i] ?? usage();
    else if (a === '--max-file-bytes') maxFileBytes = Number(argv[++i] ?? usage());
    else if (a.startsWith('--')) usage();
    else positional.push(a);
  }
  const [targetArg, verb, ...rest] = positional;
  if (!targetArg || !verb) usage();
  const targetDir = resolve(targetArg);
  const params = { maxFileBytes, includeTrail };

  const built = await buildWorkingTreeLexmap(targetDir, params);
  const { map, read, buildMs } = built;

  const emit = (value: unknown, text: string): void => {
    console.log(json ? JSON.stringify(value, null, 2) : text);
  };

  switch (verb) {
    case 'stats': {
      const heapMb = process.memoryUsage().heapUsed / 1e6;
      const identity = await treeIdentity(targetDir, read);
      const value = { target: targetDir, identity, ...map.stats, bytes: read.bytes, kept: map.stats.distinctTokens - map.stats.noiseTokens, skipped: read.skipped, buildMs: Math.round(buildMs), heapUsedMb: Math.round(heapMb) };
      emit(value, [
        `target: ${targetDir} (${identity})`,
        `files indexed: ${map.stats.files}${map.stats.trailFiles ? ` (+${map.stats.trailFiles} trail files — transcripts, reports — not counted as population)` : ''} (${(read.bytes / 1e6).toFixed(1)} MB on disk, ${(map.stats.chars / 1e6).toFixed(1)} M chars); skipped binary ${read.skipped.binary}, large ${read.skipped.large}, unreadable ${read.skipped.unreadable}`,
        `identifiers: ${map.stats.distinctTokens} distinct, ${map.stats.noiseTokens} dropped as common, ${map.stats.distinctTokens - map.stats.noiseTokens} kept`,
        `postings: ${map.stats.postings}`,
        `build: ${(buildMs / 1000).toFixed(2)} s; heap used: ${heapMb.toFixed(0)} MB`,
      ].join('\n'));
      return;
    }
    case 'where': {
      const token = rest[0] ?? usage();
      const r = where(map, token);
      emit(r, renderWhere(r));
      return;
    }
    case 'neighbors': {
      const path = rest[0] ?? usage();
      const r = neighbors(map, path.replace(/^\.\//, ''));
      emit(r, renderNeighbors(r));
      return;
    }
    case 'bridge': {
      const a = rest[0] ?? usage();
      const b = rest[1] ?? usage();
      const r = bridge(map, a, b);
      emit(r, renderBridge(r));
      return;
    }
    case 'hunk-neighbors': {
      const changes = await readCandidateChanges(targetDir, basis, params);
      const r = hunkNeighbors(map, changes);
      emit(r, renderHunkNeighborsSection(r, map, buildMs, await treeIdentity(targetDir, read)));
      return;
    }
    default:
      usage();
  }
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : String(cause));
  process.exit(2);
});
