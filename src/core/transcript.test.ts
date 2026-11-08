import type { ActivityEvent } from './activity.js';
import { eventsFromRawLog, parseRawLogHeader, rawLogStream, renderTranscript, transcriptRelPath, transcriptStarted, transcriptTouches } from './transcript.js';

const AT = '2026-11-07T10:00:00.000Z';
const ev = (kind: ActivityEvent['kind'], rest: Partial<ActivityEvent> = {}): ActivityEvent => ({ at: AT, runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'claude', kind, ...rest });

describe('renderTranscript', () => {
  it('names the run, then prose as paragraphs and tool calls as list lines, in order', () => {
    const md = renderTranscript([
      ev('run-start', { detail: 'mode edit, model m, effort high' }),
      ev('say', { text: 'Reading the service first.' }),
      ev('read', { tool: 'Read', path: 'src/a.ts' }),
      ev('exec', { tool: 'Bash', command: 'npm test', detail: 'exit 0' }),
      ev('search', { tool: 'Grep', pattern: 'settleOrder', path: 'src' }),
      ev('say', { text: 'Done.\n' }),
      ev('edit', { tool: 'Edit', path: 'src/b.ts' }),
      ev('note', { tool: 'TodoWrite' }),
      ev('run-end', { at: '2026-11-07T10:05:00.000Z', detail: 'completed' }),
    ]);
    expect(md).toBe([
      '# build-S-1 · builder · claude',
      '',
      'slice S · started 2026-11-07T10:00:00.000Z · ended 2026-11-07T10:05:00.000Z · completed · mode edit, model m, effort high',
      '',
      'Reading the service first.',
      '',
      '- read `src/a.ts`',
      '- $ `npm test` → exit 0',
      '- search `/settleOrder/` in `src`',
      '',
      'Done.',
      '',
      '- edit `src/b.ts`',
      '- TodoWrite',
      '',
    ].join('\n'));
  });

  it('fences a command that is long, multi-line or carries a backtick', () => {
    const md = renderTranscript([ev('exec', { command: 'a\nb', detail: 'exit 1' }), ev('exec', { command: 'echo `x`' })]);
    expect(md).toContain('- $ → exit 1\n  ```sh\n  a\n  b\n  ```\n- $\n  ```sh\n  echo `x`\n  ```');
    expect(md).toContain('· no run-end recorded');
  });

  it('transcriptTouches reads the read/edit lines back (round trip)', () => {
    const md = renderTranscript([ev('read', { path: 'src/a.ts' }), ev('edit', { path: 'src/b.ts', detail: 'update' }), ev('read', { path: 'src/a.ts' }), ev('edit', { path: 'docs/x.md' })]);
    expect(transcriptTouches(md)).toEqual({ read: ['src/a.ts'], edited: ['docs/x.md', 'src/b.ts'] });
    expect(transcriptRelPath('build/S 1')).toBe('.agent-manager/transcripts/build_S_1.md');
    expect(transcriptStarted(md)).toBe(AT);
    expect(transcriptStarted('# a plain markdown file\n\nno facts line\n')).toBeUndefined();
  });
});

const CLAUDE_LOG = [
  '# Run Log',
  '',
  'Run ID: build-S-1',
  'Slice ID: S',
  'Role: builder',
  'Provider: claude',
  'Started: 2026-11-07T10:00:00.000Z',
  'Completed: 2026-11-07T10:05:00.000Z',
  'Exit Code: 0',
  '',
  '## Prompts',
  '',
  '- prompts/system/base.md (sha256:abc)',
  '',
  '## Final Text',
  '',
  '```',
  '{"type":"assistant","note":"this is final text, not the stream"}',
  '```',
  '',
  '## Transcript (stream-json events)',
  '',
  '```jsonl',
  '{"type":"system","subtype":"init"}',
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Looking.' }, { type: 'tool_use', name: 'Edit', input: { file_path: '/repo/src/b.ts', old_string: 'a', new_string: 'b' } }] } }),
  '{"type":"user","message":{"content":[{"type":"tool_result","content":"huge"}]}}',
  '```',
  '',
  '## STDERR',
  '',
  '```',
  '',
  '```',
].join('\n');

const CODEX_LOG = [
  '# Run Log',
  '',
  'Run ID: review-S-1',
  'Slice ID: S',
  'Role: reviewer',
  'Provider: codex',
  'Started: 2026-11-07T11:00:00.000Z',
  'Completed: 2026-11-07T11:02:00.000Z',
  'Exit Code: 0',
  'Timed Out: yes',
  '',
  '## Prompts',
  '',
  '## STDOUT',
  '',
  '```',
  '{"type":"item.completed","item":{"id":"i1","type":"command_execution","command":"git diff --stat","exit_code":0,"status":"completed"}}',
  '{"type":"item.completed","item":{"id":"i2","type":"agent_message","text":"STATUS: approved"}}',
  '```',
].join('\n');

const PLAIN_CODEX_LOG = CODEX_LOG.replace(/```\n\{[\s\S]*```/, '```\nSTATUS: revise\n\n**OBSERVED:** the DTO drifted.\n```');

describe('raw logs → events', () => {
  it('keeps a plain-text stream (Codex before --json) as one say instead of an empty transcript', () => {
    const r = eventsFromRawLog(PLAIN_CODEX_LOG, '/repo');
    expect(r?.events.map((e) => [e.kind, e.text ?? e.detail])).toEqual([
      ['run-start', 'recovered from the raw provider log'],
      ['say', 'STATUS: revise\n\n**OBSERVED:** the DTO drifted.'],
      ['run-end', 'timed out'],
    ]);
  });

  it('parses the header and takes the stream from the right fence (not the final text)', () => {
    expect(parseRawLogHeader(CLAUDE_LOG)).toEqual({ runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'claude', startedAt: '2026-11-07T10:00:00.000Z', completedAt: '2026-11-07T10:05:00.000Z', exitCode: 0, timedOut: false });
    expect(rawLogStream(CLAUDE_LOG)).toHaveLength(3);
    expect(rawLogStream(CODEX_LOG)).toHaveLength(2);
    expect(parseRawLogHeader('# not a run log\n')).toBeUndefined();
  });

  it('recovers the live events with the header times and target-relative paths, Claude and Codex alike', () => {
    const c = eventsFromRawLog(CLAUDE_LOG, '/repo');
    expect(c?.events.map((e) => [e.kind, e.at, e.path ?? e.text ?? e.detail])).toEqual([
      ['run-start', '2026-11-07T10:00:00.000Z', 'recovered from the raw provider log'],
      ['say', '2026-11-07T10:00:00.000Z', 'Looking.'],
      ['edit', '2026-11-07T10:00:00.000Z', 'src/b.ts'],
      ['run-end', '2026-11-07T10:05:00.000Z', 'exit 0'],
    ]);
    const x = eventsFromRawLog(CODEX_LOG, '/repo');
    expect(x?.events.map((e) => [e.kind, e.command ?? e.text ?? e.detail])).toEqual([
      ['run-start', 'recovered from the raw provider log'],
      ['exec', 'git diff --stat'],
      ['say', 'STATUS: approved'],
      ['run-end', 'timed out'],
    ]);
    const md = renderTranscript(c?.events ?? []);
    expect(md).toContain('Looking.\n\n- edit `src/b.ts`');
    expect(md).not.toContain('huge');
  });
});
