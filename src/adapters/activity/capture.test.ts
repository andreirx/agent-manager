/**
 * Activity capture tests (TRANSCRIPT-1): a run's events are logged live AND
 * rendered once, at run end, as the condensed transcript under
 * `.agent-manager/transcripts/`. Best-effort: no `.agent-manager` → neither.
 */
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { claudeEvents } from '../../core/activity.js';
import type { RunRequest } from '../../application/ports/provider-runner.js';
import { startActivityCapture } from './capture.js';

const clock = { now: () => '2026-11-08T10:00:00.000Z' };
const request = (workingDir: string): RunRequest => ({ runId: 'build-S-1-0', sliceId: 'S-1', role: 'builder', delivery: { kind: 'legacy-live-inputs', prompts: [] }, inputArtifacts: [], workingDir, mode: 'edit', model: 'm' });

describe('activity capture', () => {
  let dir = '';
  beforeEach(async () => { dir = await mkdtemp('/private/tmp/TRANSCRIPT-1-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it('writes the condensed transcript at run end from the same events it logged', async () => {
    await mkdir(join(dir, '.agent-manager'));
    const capture = await startActivityCapture(request(dir), 'claude', claudeEvents, clock);
    capture.feed(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Opening the ledger.' }, { type: 'tool_use', name: 'Read', input: { file_path: `${dir}/src/orders.ts` } }] } }) + '\n');
    capture.feed(JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'thousands of lines' }] } }) + '\n');
    capture.feed(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: `${dir}/src/orders.ts`, old_string: 'a', new_string: 'b' } }] } })); // no trailing newline: flushed at end
    const ended = await capture.end('completed');
    expect(ended.transcriptPath).toBe(join(dir, '.agent-manager/transcripts/build-S-1-0.md'));
    const md = await readFile(ended.transcriptPath ?? '', 'utf-8');
    expect(md).toBe([
      '# build-S-1-0 · builder · claude',
      '',
      'slice S-1 · started 2026-11-08T10:00:00.000Z · ended 2026-11-08T10:00:00.000Z · completed · mode edit, model m, effort default',
      '',
      'Opening the ledger.',
      '',
      '- read `src/orders.ts`',
      '- edit `src/orders.ts`',
      '',
    ].join('\n'));
    expect(md).not.toContain('thousands');
    const log = await readFile(join(dir, '.agent-manager/activity/build-S-1-0.ndjson'), 'utf-8');
    expect(log.trim().split('\n').map((l) => (JSON.parse(l) as { kind: string }).kind)).toEqual(['run-start', 'say', 'read', 'edit', 'run-end']);
  });

  it('writes neither log nor transcript when the working directory has no .agent-manager', async () => {
    const capture = await startActivityCapture(request(dir), 'claude', claudeEvents, clock);
    capture.feed('{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}\n');
    expect(await capture.end('completed')).toEqual({});
    await expect(stat(join(dir, '.agent-manager'))).rejects.toThrow();
  });
});
