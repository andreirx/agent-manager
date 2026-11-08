/**
 * `npm run transcript -- <target> [--all | <runId>…] [--force]` — condensed
 * transcripts from the raw run logs (TRANSCRIPT-1 backfill).
 *
 * Live runs write `<target>/.agent-manager/transcripts/<runId>.md` themselves
 * (the activity capture, at run end). Runs recorded before that exist only as
 * raw provider logs under `<target>/.agent-manager/logs/*.txt`; this command
 * replays each log's stream through the same parsers the live capture uses
 * and writes the transcript it would have written. Two logs with one Run ID
 * (a retried attempt and its completion) yield one transcript: the later log
 * wins. A transcript that existed before this invocation is kept unless
 * `--force`. Nothing else is touched.
 *
 * Composition root only: file I/O here, parsing and rendering in `core/transcript`.
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { eventsFromRawLog, renderTranscript, transcriptRelPath } from '../core/transcript.js';

function usage(): never {
  console.error('Usage: npm run transcript -- <target> (--all | <runId>…) [--force]');
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const positional: string[] = [];
  let all = false;
  let force = false;
  for (const a of argv) {
    if (a === '--all') all = true;
    else if (a === '--force') force = true;
    else if (a.startsWith('--')) usage();
    else positional.push(a);
  }
  const [targetArg, ...runIds] = positional;
  if (!targetArg || (!all && runIds.length === 0)) usage();
  const targetDir = resolve(targetArg);
  const logsDir = join(targetDir, '.agent-manager', 'logs');
  let names: string[] = [];
  try { names = (await readdir(logsDir)).filter((n) => n.endsWith('.txt')).sort(); } catch { names = []; }
  if (names.length === 0) { console.log(`no raw run logs under ${logsDir}`); return; }

  const wanted = new Set(runIds);
  const writtenNow = new Set<string>();
  const counts = { written: 0, kept: 0, skipped: 0, notRunLog: 0, noEvents: 0, superseded: 0 };
  for (const name of names) {
    const text = await readFile(join(logsDir, name), 'utf-8');
    const recovered = eventsFromRawLog(text, targetDir);
    if (!recovered) { counts.notRunLog += 1; continue; }
    if (!all && !wanted.has(recovered.header.runId)) { counts.skipped += 1; continue; }
    const out = join(targetDir, transcriptRelPath(recovered.header.runId));
    const again = writtenNow.has(recovered.header.runId);
    if (!again && !force && await stat(out).then((s) => s.isFile()).catch(() => false)) { counts.kept += 1; continue; }
    if (again) counts.superseded += 1;
    // A log whose stream yielded nothing but start/end (Copilot, or a provider shape the parser does not know) still gets its header.
    if (recovered.events.length <= 2) counts.noEvents += 1;
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, renderTranscript(recovered.events), 'utf-8');
    if (!again) counts.written += 1;
    writtenNow.add(recovered.header.runId);
    wanted.delete(recovered.header.runId);
  }
  console.log(`${logsDir}: ${names.length} raw logs → ${counts.written} transcripts written (${counts.noEvents} with no recognized events; ${counts.superseded} earlier attempts superseded by a later log of the same run), ${counts.kept} already present, ${counts.skipped} not asked for, ${counts.notRunLog} not run logs`);
  if (wanted.size > 0) console.log(`no raw log found for: ${[...wanted].join(', ')}`);
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : String(cause));
  process.exit(2);
});
