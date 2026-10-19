/**
 * Antigravity adapter tests against a fake `agy` that replays the live-probed
 * stream-json protocol (agy 1.4.0, 2026-10-18).
 *
 * @maturity PROTOTYPE
 */

import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AntigravityAdapter, extractAntigravityResponse } from './index.js';
import type { ArtifactStorePort, ClockPort } from '../../../application/ports/index.js';
import type { RunRequest, RunTextInput } from '../../../application/ports/provider-runner.js';

const FAKE_AGY = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
// Jest sandboxes process.env per test file, so a spawned child cannot see test
// edits to it; the fake reads its behaviour from a file beside itself instead.
const here = path.dirname(fs.realpathSync(process.argv[1]));
const cfgPath = path.join(here, 'fake.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
const mode = cfg.mode || 'success';
const cid = cfg.cid || 'conv-fresh-1';
const stdin = fs.readFileSync(0, 'utf8');
fs.writeFileSync(path.join(here, 'capture.json'), JSON.stringify({ argv: process.argv.slice(2), stdin, cwd: process.cwd() }));
const emit = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
if (mode === 'garbage') { process.stdout.write('not json at all\\n'); process.exit(0); }
emit({ event: 'init', conversation_id: cid, init: { model: 'gemini-3.8-flash', cwd: process.cwd(), tools: ['run_command'], permission_mode: 'request-review' } });
if (mode === 'exit3') { process.stderr.write('AGY_ERROR: {"short_error":"model quota exhausted"}\\n'); process.exit(3); }
if (mode === 'noresult') process.exit(0);
emit({ event: 'step_update', step_update: { conversation_id: cid, step_index: 0, state: 'DONE', step_type: 'user_input' } });
if (mode === 'denied') {
  emit({ event: 'result', result: { conversation_id: cid, status: 'SUCCESS', response: '', duration_seconds: 1, num_turns: 1, usage: {}, denied_actions: [{ action: 'command', display_name: 'RunCommand' }] } });
} else if (mode === 'error') {
  emit({ event: 'result', result: { conversation_id: cid, status: 'ERROR', response: '', error: 'model generation terminated', duration_seconds: 1, num_turns: 1, usage: {} } });
} else {
  emit({ event: 'result', result: { conversation_id: cid, status: 'SUCCESS', response: cfg.response || 'PONG\\n', duration_seconds: 1, num_turns: 1, usage: {} } });
}
`;

const clock: ClockPort = { now: () => '2026-10-18T12:00:00.000Z' };
const store: ArtifactStorePort = {
  readPromptAsset: async (path: string) => {
    const content = await readFile(path, 'utf-8');
    return { path, content, digest: sha256(content) };
  },
} as unknown as ArtifactStorePort;

function sha256(text: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function fileInput(purpose: RunTextInput extends { purpose: infer P } ? P : never, path: string, text: string): RunTextInput {
  const bytes = new TextEncoder().encode(text);
  return { origin: 'file', root: 'prompt', purpose, path, bytes, sha256: sha256(bytes) };
}

let dir: string;
let fakeBin: string;
let capture: string;

/** Configure the fake agy's next run (mode, conversation id, response). */
async function fakeBehaviour(values: { mode?: string; cid?: string; response?: string }): Promise<void> {
  await writeFile(join(dir, 'fake.json'), JSON.stringify(values), 'utf-8');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'am-agy-'));
  fakeBin = join(dir, 'agy');
  capture = join(dir, 'capture.json');
  await writeFile(fakeBin, FAKE_AGY, 'utf-8');
  await chmod(fakeBin, 0o755);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function adapter(): AntigravityAdapter {
  return new AntigravityAdapter({ logsDir: join(dir, 'logs'), promptRoot: dir, command: fakeBin, sharedInstructionPath: join(dir, 'SYSTEM.txt') }, store, clock);
}

function reviewedRequest(overrides: Partial<RunRequest> = {}): { request: RunRequest; shared: RunTextInput; role: RunTextInput; directive: RunTextInput } {
  const shared = fileInput('shared-instruction', 'SYSTEM.txt', 'HOUSE RULES\n');
  const role = fileInput('role-instruction', 'prompts/roles/reviewer-target.md', 'ROLE PROMPT\n');
  const directive: RunTextInput = { origin: 'generated', purpose: 'task-directive', label: 'directive', bytes: new TextEncoder().encode('Review it.'), sha256: sha256('Review it.') };
  const request: RunRequest = {
    runId: 'run-1', sliceId: 'S-1', role: 'reviewer', mode: 'review', permission: 'read-only', workingDir: dir,
    model: 'gemini-3.8-flash', effort: 'high', inputArtifacts: [],
    delivery: { kind: 'reviewed-input-snapshots', contract: 'requirements-assurance/v2-input-delivery', common: [role, shared], roleSpecific: [directive] },
    providerSession: { kind: 'fresh' },
    ...overrides,
  };
  return { request, shared, role, directive };
}

async function captured(): Promise<{ argv: string[]; stdin: string; cwd: string }> {
  return JSON.parse(await readFile(capture, 'utf-8')) as { argv: string[]; stdin: string; cwd: string };
}

describe('AntigravityAdapter reviewed delivery', () => {
  test('one stream-json user turn carries the shared instruction as the first frame; argv maps model, effort, read-only posture', async () => {
    const { request, shared, role, directive } = reviewedRequest();
    const result = await adapter().run(request);
    expect(result.status).toBe('completed');
    expect(result.providerSessionId).toBe('conv-fresh-1');
    expect(result.outputArtifacts[0]?.content).toBe('PONG\n');

    const call = await captured();
    expect(call.argv).toEqual(['--input-format', 'stream-json', '--output-format', 'stream-json', '--model', 'gemini-3.8-flash', '--effort', 'high', '--mode', 'plan', '--dangerously-skip-permissions']);
    expect(realpathSync(call.cwd)).toBe(realpathSync(dir));
    const lines = call.stdin.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('');
    const turn = JSON.parse(lines[0]!) as { event: string; message: { content: string } };
    expect(turn.event).toBe('user');
    const headers = turn.message.content.split('\n').filter((line) => line.startsWith('AGENT_MANAGER_INPUT_V2 ')).map((line) => JSON.parse(line.slice('AGENT_MANAGER_INPUT_V2 '.length)) as { purpose: string; sha256: string });
    expect(headers.map((h) => h.purpose)).toEqual(['shared-instruction', 'role-instruction', 'task-directive']);
    expect(headers.map((h) => h.sha256)).toEqual([shared.sha256, role.sha256, directive.sha256]);
    expect(turn.message.content).toContain('HOUSE RULES\n');

    expect(result.deliveryReceipt.kind).toBe('reviewed-input-snapshots');
    if (result.deliveryReceipt.kind !== 'reviewed-input-snapshots') throw new Error('unreachable');
    const [sharedChannel, stdinChannel] = result.deliveryReceipt.channels;
    expect(sharedChannel).toEqual({ channel: 'shared-instruction', mechanism: 'antigravity-stdin-frame', sha256: shared.sha256, byteLength: shared.bytes.byteLength });
    expect(stdinChannel?.channel).toBe('stdin');
    expect(stdinChannel?.mechanism).toBe('stdin-stream-json');
    expect(stdinChannel?.sha256).toBe(sha256(new TextEncoder().encode(call.stdin)));
    expect(stdinChannel?.byteLength).toBe(new TextEncoder().encode(call.stdin).byteLength);

    const log = await readFile(result.logPath, 'utf-8');
    expect(log).toContain('Provider: antigravity');
    expect(log).toContain('Conversation: conv-fresh-1');
  });

  test('write posture and resume map to --dangerously-skip-permissions and --conversation', async () => {
    await fakeBehaviour({ cid: 'conv-keep-7' });
    const { request } = reviewedRequest({ role: 'builder', mode: 'edit', permission: 'write', providerSession: { kind: 'resume', sessionId: 'conv-keep-7' } });
    const result = await adapter().run(request);
    expect(result.status).toBe('completed');
    expect(result.providerSessionId).toBe('conv-keep-7');
    expect((await captured()).argv).toEqual(['--input-format', 'stream-json', '--output-format', 'stream-json', '--model', 'gemini-3.8-flash', '--effort', 'high', '--dangerously-skip-permissions', '--conversation', 'conv-keep-7']);
  });

  test('a resume answered in a different conversation fails (agy only warns on an unknown id)', async () => {
    await fakeBehaviour({ cid: 'conv-new-9' });
    const { request } = reviewedRequest({ providerSession: { kind: 'resume', sessionId: 'conv-gone-1' } });
    const result = await adapter().run(request);
    expect(result.status).toBe('failed');
    expect(result.error).toContain("did not resume conversation 'conv-gone-1'");
    expect(result.providerSessionId).toBe('conv-new-9');
    expect(result.outputArtifacts).toEqual([]);
  });

  test('a headless permission denial with an empty response is a failed run, not an empty success', async () => {
    await fakeBehaviour({ mode: 'denied' });
    const result = await adapter().run(reviewedRequest().request);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('auto-denied a tool permission (RunCommand)');
    const log = await readFile(result.logPath, 'utf-8');
    expect(log).toContain('Denied Actions: RunCommand');
  });

  test('exit 3 surfaces the AGY_ERROR line; a non-SUCCESS result surfaces its error', async () => {
    await fakeBehaviour({ mode: 'exit3' });
    const quota = await adapter().run(reviewedRequest().request);
    expect(quota.status).toBe('failed');
    expect(quota.exitCode).toBe(3);
    expect(quota.error).toBe('AGY_ERROR: {"short_error":"model quota exhausted"}');

    await fakeBehaviour({ mode: 'error' });
    const errored = await adapter().run(reviewedRequest().request);
    expect(errored.status).toBe('failed');
    expect(errored.error).toBe('model generation terminated');
  });

  test('protocol defects: a non-JSON line, a missing result event', async () => {
    await fakeBehaviour({ mode: 'garbage' });
    const garbage = await adapter().run(reviewedRequest().request);
    expect(garbage.status).toBe('failed');
    expect(garbage.error).toContain('non-JSON line');

    await fakeBehaviour({ mode: 'noresult' });
    const truncated = await adapter().run(reviewedRequest().request);
    expect(truncated.status).toBe('failed');
    expect(truncated.error).toContain('without a result event');
  });
});

describe('AntigravityAdapter legacy delivery', () => {
  test('shared instruction file is prepended to the pinned prompts inside the one stdin turn', async () => {
    await writeFile(join(dir, 'SYSTEM.txt'), 'SHARED LAYER\n', 'utf-8');
    await writeFile(join(dir, 'role.md'), 'ROLE BODY\n', 'utf-8');
    const request: RunRequest = {
      runId: 'run-2', sliceId: 'S-2', role: 'bookkeeper', permission: 'read-only', workingDir: dir, inputArtifacts: [],
      delivery: { kind: 'legacy-live-inputs', prompts: [{ path: 'role.md', digest: sha256('ROLE BODY\n') }], contextText: 'DIRECTIVE' },
    };
    const result = await adapter().run(request);
    expect(result.status).toBe('completed');
    expect(result.deliveryReceipt).toEqual({ kind: 'legacy-live-inputs' });
    const turn = JSON.parse((await captured()).stdin.trim()) as { message: { content: string } };
    expect(turn.message.content).toBe('SHARED LAYER\n\n\n---\n\nROLE BODY\n\n\n---\n\nDIRECTIVE');
  });
});

describe('extractAntigravityResponse', () => {
  test('reads the live-probed shape verbatim', () => {
    const stdout = [
      '{"event":"init","conversation_id":"50a0d12b-5ddb-4110-9ddf-736291093182","init":{"model":"gemini-3.8-flash","cwd":"/w","tools":["run_command"],"permission_mode":"request-review"}}',
      '{"event":"step_update","step_update":{"conversation_id":"50a0d12b-5ddb-4110-9ddf-736291093182","step_index":1,"state":"DONE","step_type":"agent_response","text_delta":"STORED"}}',
      '{"event":"result","result":{"conversation_id":"50a0d12b-5ddb-4110-9ddf-736291093182","status":"SUCCESS","response":"STORED\\n","duration_seconds":13.69,"num_turns":1,"usage":{"input_tokens":27193,"output_tokens":1562,"thinking_tokens":1297,"cache_read_tokens":0,"total_tokens":28755}}}',
      '',
    ].join('\n');
    expect(extractAntigravityResponse(stdout)).toEqual({ finalText: 'STORED\n', deniedActions: [], sessionId: '50a0d12b-5ddb-4110-9ddf-736291093182', resultStatus: 'SUCCESS' });
  });
});
