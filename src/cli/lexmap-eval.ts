/**
 * `npm run lexmap-eval -- …` — the ranking oracle (LEXMAP-EVAL-1, TD-037).
 *
 *   sample <repo> [--queries 6] [--seed 1] [--out <sheet.md>]
 *       index the repo, choose query files and candidates, write a sheet to mark by hand
 *       (default out: fixtures/lexmap-eval/<repo basename>.md)
 *   score <sheet.md>… [--k 10] [--moves] [--json]
 *       re-index each sheet's repo, rank with every variant, print precision/recall per variant;
 *       --moves lists, per query, what entered/left the top k against the `sum` baseline
 *
 * Composition root only: git adapter in, pure core, text out.
 *
 * @module cli
 * @maturity PROTOTYPE
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { buildWorkingTreeLexmap, treeIdentity } from '../adapters/lexmap/git-working-tree.js';
import { medianTokenCount, parseSheet, renderSheet, sampleQueries, scoreAll, topMoves, DEFAULT_SAMPLE_PARAMS, type VariantScore } from '../core/lexmap/eval.js';

function usage(): never {
  console.error('Usage: npm run lexmap-eval -- sample <repo> [--queries n] [--seed n] [--out file] | score <sheet.md>… [--k n] [--moves] [--json]');
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? '';
    if (a === '--moves' || a === '--json') flags[a.slice(2)] = true;
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i] ?? usage();
    else positional.push(a);
  }
  const [verb, ...rest] = positional;
  if (verb === 'sample') await sample(rest[0] ?? usage(), flags);
  else if (verb === 'score') await score(rest.length ? rest : usage(), flags);
  else usage();
}

async function sample(repoArg: string, flags: Record<string, string | true>): Promise<void> {
  const repo = resolve(repoArg);
  const seed = Number(flags.seed ?? 1);
  const queries = Number(flags.queries ?? DEFAULT_SAMPLE_PARAMS.queries);
  const out = resolve(typeof flags.out === 'string' ? flags.out : `fixtures/lexmap-eval/${basename(repo)}.md`);
  const built = await buildWorkingTreeLexmap(repo);
  const identity = await treeIdentity(repo, built.read);
  const sampled = sampleQueries(built.map, seed, { ...DEFAULT_SAMPLE_PARAMS, queries });
  const text = renderSheet(repo, identity, seed, medianTokenCount(built.map), sampled);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, text, 'utf-8');
  const pairs = sampled.reduce((n, q) => n + q.candidates.length, 0);
  console.log(`${out}: ${sampled.length} queries, ${pairs} candidate pairs; index ${built.map.stats.files} files in ${built.buildMs.toFixed(0)} ms; median tokens/file ${medianTokenCount(built.map)}`);
  for (const q of sampled) console.log(`  ${q.path} (${q.candidates.length} candidates)`);
}

function fmt(x: number): string {
  return x.toFixed(2).padStart(6);
}

async function score(sheetPaths: string[], flags: Record<string, string | true>): Promise<void> {
  const k = Number(flags.k ?? 10);
  const all: { sheet: string; repo: string; identityNow: string; identitySheet: string; scores: VariantScore[] }[] = [];
  for (const p of sheetPaths) {
    const sheet = parseSheet(await readFile(resolve(p), 'utf-8'));
    const built = await buildWorkingTreeLexmap(sheet.repo);
    const identityNow = await treeIdentity(sheet.repo, built.read);
    all.push({ sheet: p, repo: sheet.repo, identityNow, identitySheet: sheet.identity, scores: scoreAll(built.map, sheet, k) });
  }
  if (flags.json) {
    console.log(JSON.stringify(all, null, 2));
    return;
  }
  for (const r of all) {
    const labelled = r.scores[0]?.queries ?? 0;
    console.log(`\n${r.sheet} — ${r.repo}`);
    console.log(`  tree ${r.identityNow === r.identitySheet ? 'matches the sheet' : 'DIFFERS from the sheet (labels may be stale)'}; ${labelled} queries scored${r.scores[0]?.skipped.length ? `, skipped: ${r.scores[0]?.skipped.join(', ')}` : ''}`);
    console.log(`  ${'variant'.padEnd(13)} P@${k} cond  P@${k} pess  R@${k}    unjudged/top`);
    for (const s of r.scores) console.log(`  ${s.variant.padEnd(13)}${fmt(s.precisionCondensed)}     ${fmt(s.precisionPessimistic)}     ${fmt(s.recall)}   ${fmt(s.unjudgedInTop)}`);
  }
  if (all.length > 1) {
    console.log('\nALL SHEETS (mean over queries)');
    console.log(`  ${'variant'.padEnd(13)} P@${k} cond  P@${k} pess  R@${k}    unjudged/top  queries`);
    const variants = all[0]?.scores.map((s) => s.variant) ?? [];
    for (const v of variants) {
      const per = all.flatMap((r) => r.scores.find((s) => s.variant === v)?.perQuery ?? []);
      const m = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      const recalls = per.map((q) => q.recall).filter((x): x is number => x !== undefined);
      console.log(`  ${v.padEnd(13)}${fmt(m(per.map((q) => q.precisionCondensed)))}     ${fmt(m(per.map((q) => q.precisionPessimistic)))}     ${fmt(m(recalls))}   ${fmt(m(per.map((q) => q.unjudgedInTop)))}        ${per.length}`);
    }
  }
  if (flags.moves) {
    for (const r of all) {
      const base = r.scores.find((s) => s.variant === 'sum');
      if (!base) continue;
      for (const other of r.scores) {
        if (other.variant === 'sum') continue;
        console.log(`\n${r.sheet}: ${other.variant} vs sum (top ${k})`);
        for (const mv of topMoves(base, other)) {
          if (!mv.entered.length && !mv.left.length) continue;
          console.log(`  ${mv.path}`);
          for (const e of mv.entered) console.log(`    + ${e.path} [${e.label ?? 'unlabelled'}]`);
          for (const l of mv.left) console.log(`    - ${l.path} [${l.label ?? 'unlabelled'}]`);
        }
      }
    }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
