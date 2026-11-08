/**
 * Activity parsers (ACTIVITY-1), fed the real line shapes captured on
 * 2026-11-07 from a live Claude builder stream and a Codex `--json` smoke.
 */
import { LineSplitter, antigravityEvents, claudeEvents, codexEvents, relativize, runEnd, runStart, touchedPaths } from './activity.js';

const BASE = { runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'claude', root: '/repo' };
const AT = '2026-11-07T10:00:00.000Z';

describe('LineSplitter', () => {
  it('yields complete lines across chunk boundaries and flushes the tail', () => {
    const s = new LineSplitter();
    expect(s.feed('{"a":1}\n{"b"')).toEqual(['{"a":1}']);
    expect(s.feed(':2}\n')).toEqual(['{"b":2}']);
    expect(s.feed('tail')).toEqual([]);
    expect(s.flush()).toEqual(['tail']);
    expect(s.flush()).toEqual([]);
  });
});

describe('claudeEvents', () => {
  it('maps Read/Edit/Write/Bash/Grep tool_use blocks with their inputs, relativizing paths under root', () => {
    const line = JSON.stringify({ type: 'assistant', message: { content: [
      { type: 'text', text: 'Looking.' },
      { type: 'tool_use', id: 'x1', name: 'Read', input: { file_path: '/repo/pl-tools/engines/normalize.mjs' } },
      { type: 'tool_use', id: 'x2', name: 'Edit', input: { replace_all: false, file_path: '/repo/pl-tools/vendors/gerflor.config.mjs', old_string: 'a', new_string: 'b' } },
      { type: 'tool_use', id: 'x3', name: 'Write', input: { file_path: '/repo/pl-tools/test/new.test.mjs', content: '…' } },
      { type: 'tool_use', id: 'x4', name: 'Bash', input: { command: 'cd "/repo/pl-tools" && node -e 1' } },
      { type: 'tool_use', id: 'x5', name: 'Grep', input: { pattern: 'settleOrder', path: '/repo/src' } },
      { type: 'tool_use', id: 'x6', name: 'TodoWrite', input: { todos: [] } },
    ] } });
    const events = claudeEvents(line, BASE, AT);
    expect(events.map((e) => [e.kind, e.tool, e.command ?? e.pattern ?? e.path ?? e.text])).toEqual([
      ['say', undefined, 'Looking.'],
      ['read', 'Read', 'pl-tools/engines/normalize.mjs'],
      ['edit', 'Edit', 'pl-tools/vendors/gerflor.config.mjs'],
      ['edit', 'Write', 'pl-tools/test/new.test.mjs'],
      ['exec', 'Bash', 'cd "/repo/pl-tools" && node -e 1'],
      ['search', 'Grep', 'settleOrder'],
      ['note', 'TodoWrite', undefined],
    ]);
    expect(events[1]).toEqual({ at: AT, runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'claude', kind: 'read', tool: 'Read', path: 'pl-tools/engines/normalize.mjs' });
    // TRANSCRIPT-1: a blank text block is not a say.
    expect(claudeEvents(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: '  \n' }] } }), BASE, AT)).toEqual([]);
  });

  it('ignores system, user, rate-limit and non-JSON lines', () => {
    for (const line of ['{"type":"system","subtype":"init"}', '{"type":"user","message":{"content":[{"type":"tool_result"}]}}', '{"type":"rate_limit_event"}', 'not json', '']) {
      expect(claudeEvents(line, BASE, AT)).toEqual([]);
    }
  });
});

describe('codexEvents', () => {
  const codex = { ...BASE, provider: 'codex' };
  it('emits one exec per completed command_execution with its exit code, a say per agent_message, nothing for started/errors', () => {
    const started = '{"type":"item.started","item":{"id":"item_2","type":"command_execution","command":"/bin/zsh -lc \'ls package.json\'","aggregated_output":"","exit_code":null,"status":"in_progress"}}';
    const completed = '{"type":"item.completed","item":{"id":"item_2","type":"command_execution","command":"/bin/zsh -lc \'ls package.json\'","aggregated_output":"package.json\\n","exit_code":0,"status":"completed"}}';
    expect(codexEvents(started, codex, AT)).toEqual([]);
    expect(codexEvents(completed, codex, AT)).toEqual([{ at: AT, runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'codex', kind: 'exec', tool: 'command_execution', command: "/bin/zsh -lc 'ls package.json'", detail: 'exit 0' }]);
    expect(codexEvents('{"type":"item.completed","item":{"id":"i","type":"agent_message","text":"done"}}', codex, AT)).toEqual([{ at: AT, runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'codex', kind: 'say', text: 'done' }]);
    expect(codexEvents('{"type":"item.completed","item":{"id":"i","type":"error","message":"hooks"}}', codex, AT)).toEqual([]);
    expect(codexEvents('{"type":"thread.started","thread_id":"t"}', codex, AT)).toEqual([]);
  });

  it('maps file_change items to edits per path (published shape, unverified live — TD-038)', () => {
    const line = JSON.stringify({ type: 'item.completed', item: { id: 'i', type: 'file_change', status: 'completed', changes: [{ path: '/repo/src/a.ts', kind: 'update' }, { path: '/repo/src/b.ts', kind: 'add' }] } });
    expect(codexEvents(line, codex, AT).map((e) => [e.kind, e.path, e.detail])).toEqual([['edit', 'src/a.ts', 'update'], ['edit', 'src/b.ts', 'add']]);
  });
});

describe('antigravityEvents', () => {
  it('notes tool steps only, keeping whatever name the step exposes', () => {
    const agy = { ...BASE, provider: 'antigravity' };
    expect(antigravityEvents('{"event":"step_update","step_update":{"conversation_id":"c","step_index":0,"state":"DONE","step_type":"user_input"}}', agy, AT)).toEqual([]);
    expect(antigravityEvents('{"event":"step_update","step_update":{"conversation_id":"c","step_index":1,"state":"ACTIVE","step_type":"tool","display_name":"RunCommand"}}', agy, AT)).toEqual([
      { at: AT, runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'antigravity', kind: 'note', tool: 'RunCommand', detail: 'ACTIVE' },
    ]);
    expect(antigravityEvents('{"event":"result","result":{}}', agy, AT)).toEqual([]);
  });
});

describe('helpers', () => {
  it('relativize, runStart/runEnd, touchedPaths', () => {
    expect(relativize('/repo', '/repo/src/a.ts')).toBe('src/a.ts');
    expect(relativize('/repo/', '/repo/src/a.ts')).toBe('src/a.ts');
    expect(relativize('/repo', '/elsewhere/x')).toBe('/elsewhere/x');
    expect(relativize('/repo', '/repo')).toBe('.');
    expect(runStart(BASE, AT, 'model m').detail).toBe('model m');
    expect(runEnd(BASE, AT, 'completed').kind).toBe('run-end');
    const events = [
      ...claudeEvents(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/b.ts' } }, { type: 'tool_use', name: 'Read', input: { file_path: '/repo/a.ts' } }, { type: 'tool_use', name: 'Edit', input: { file_path: '/repo/a.ts' } }] } }), BASE, AT),
    ];
    expect(touchedPaths(events)).toEqual({ read: ['a.ts', 'b.ts'], edited: ['a.ts'] });
  });
});
