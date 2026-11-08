/**
 * Condensed transcripts (TRANSCRIPT-1): the readable, uniform form of one
 * provider run — what the agent said and what it touched — as Markdown.
 *
 * Why: the raw provider logs under `.agent-manager/logs/` keep the whole
 * stream (tool results, thinking, envelope — about ten times the words that
 * matter) in one grammar per provider. The activity events are already the
 * uniform layer; with `say` events they carry the agent's prose too. This
 * module renders those events as one Markdown file per run, so a transcript
 * can be read in the viewer, indexed by lexmap (class `session`) and given to
 * an agent in place of the raw stream.
 *
 * Two directions, both pure:
 *   renderTranscript(events)   events → Markdown (the live path: the capture
 *                              writes it at run end)
 *   eventsFromRawLog(text,root) raw log → events (the backfill path: the header
 *                              names run, slice, role, provider and times; the
 *                              fenced stream body goes through the same parser
 *                              the live capture uses — no second grammar)
 *   transcriptTouches(markdown) the `read`/`edit` lines back out of a rendered
 *                              transcript — the structural link "which runs
 *                              touched this path" without re-reading the events.
 *
 * What a transcript never contains: tool results, thinking blocks, edit text.
 * Those stay in the raw log, which is kept as the FULL version and never indexed.
 *
 * @module core
 * @maturity PROTOTYPE
 */

import { antigravityEvents, claudeEvents, codexEvents, runEnd, runStart, type ActivityBase, type ActivityEvent } from './activity.js';

/** Where a run's condensed transcript lives inside a target (relative, forward slashes). */
export const TRANSCRIPTS_DIR = '.agent-manager/transcripts';

export function transcriptRelPath(runId: string): string {
  return `${TRANSCRIPTS_DIR}/${runId.replace(/[^A-Za-z0-9._-]/g, '_')}.md`;
}

/** A command fits on one list line when it is short, single-line and free of backticks. */
const INLINE_COMMAND_MAX = 160;

function inlineCode(s: string): string {
  return `\`${s}\``;
}

function commandLines(command: string, detail: string | undefined): string[] {
  const tail = detail ? ` → ${detail}` : '';
  if (command.length <= INLINE_COMMAND_MAX && !command.includes('\n') && !command.includes('`')) return [`- $ ${inlineCode(command)}${tail}`];
  return [`- $${tail}`, '  ```sh', ...command.split('\n').map((l) => `  ${l}`), '  ```'];
}

/**
 * Events → Markdown. The first line names the run; the second its facts; then
 * the agent's prose as paragraphs and its tool calls as list lines, in order.
 */
export function renderTranscript(events: readonly ActivityEvent[]): string {
  const first = events[0];
  if (!first) return '# (no events)\n';
  const start = events.find((e) => e.kind === 'run-start');
  const end = events.find((e) => e.kind === 'run-end');
  const out: string[] = [
    `# ${first.runId} · ${first.role} · ${first.provider}`,
    '',
    `slice ${first.sliceId} · started ${start?.at ?? first.at}${end ? ` · ended ${end.at} · ${end.detail ?? 'ended'}` : ' · no run-end recorded'}${start?.detail ? ` · ${start.detail}` : ''}`,
    '',
  ];
  let inList = false;
  const list = (lines: string[]): void => {
    out.push(...lines);
    inList = true;
  };
  const prose = (text: string): void => {
    if (inList) out.push('');
    out.push(text.trimEnd(), '');
    inList = false;
  };
  for (const e of events) {
    switch (e.kind) {
      case 'run-start':
      case 'run-end':
        break;
      case 'say':
        prose(e.text ?? '');
        break;
      case 'read':
        list([`- read ${inlineCode(e.path ?? e.tool ?? '?')}`]);
        break;
      case 'edit':
        list([`- edit ${inlineCode(e.path ?? e.tool ?? '?')}${e.detail ? ` (${e.detail})` : ''}`]);
        break;
      case 'exec':
        list(commandLines(e.command ?? '', e.detail));
        break;
      case 'search':
        list([`- search ${inlineCode(`/${e.pattern ?? ''}/`)}${e.path ? ` in ${inlineCode(e.path)}` : ''}`]);
        break;
      case 'note':
        list([`- ${e.tool ?? 'note'}${e.detail ? ` (${e.detail})` : ''}`]);
        break;
      default: {
        const unreachable: never = e.kind;
        throw new Error(`unknown activity kind ${String(unreachable)}`);
      }
    }
  }
  if (inList) out.push('');
  return out.join('\n');
}

const TOUCH_LINE = /^- (read|edit) `([^`]+)`/;
const STARTED = /· started (\S+)/;

/** The run's start time as the facts line states it; undefined for a file that is not a rendered transcript. */
export function transcriptStarted(markdown: string): string | undefined {
  const facts = markdown.split('\n')[2] ?? '';
  return STARTED.exec(facts)?.[1];
}

/** The paths a rendered transcript says the run read and edited (deduplicated, sorted). */
export function transcriptTouches(markdown: string): { read: string[]; edited: string[] } {
  const read = new Set<string>();
  const edited = new Set<string>();
  for (const line of markdown.split('\n')) {
    const m = TOUCH_LINE.exec(line);
    if (!m) continue;
    if (m[1] === 'read') read.add(m[2] ?? '');
    else edited.add(m[2] ?? '');
  }
  return { read: [...read].sort(), edited: [...edited].sort() };
}

// ------------------------------------------------------------ raw logs

/** The header every adapter writes at the top of a raw run log (`Key: value` lines). */
export interface RawLogHeader {
  readonly runId: string;
  readonly sliceId: string;
  readonly role: string;
  readonly provider: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly exitCode?: number;
  readonly timedOut: boolean;
  readonly error?: string;
}

const HEADER_KEYS: Record<string, keyof RawLogHeader> = {
  'Run ID': 'runId',
  'Slice ID': 'sliceId',
  'Role': 'role',
  'Provider': 'provider',
  'Started': 'startedAt',
  'Completed': 'completedAt',
  'Exit Code': 'exitCode',
  'Timed Out': 'timedOut',
  'Error': 'error',
};

export function parseRawLogHeader(text: string): RawLogHeader | undefined {
  const fields: Record<string, string> = {};
  for (const line of text.split('\n').slice(0, 40)) {
    if (line.startsWith('## ')) break;
    const i = line.indexOf(': ');
    if (i < 0) continue;
    const key = HEADER_KEYS[line.slice(0, i)];
    if (key) fields[key] = line.slice(i + 2).trim();
  }
  const { runId, sliceId, role, provider, startedAt } = fields;
  if (!runId || !sliceId || !role || !provider || !startedAt) return undefined;
  const exit = fields['exitCode'] !== undefined ? Number(fields['exitCode']) : undefined;
  return {
    runId,
    sliceId,
    role,
    provider,
    startedAt,
    ...(fields['completedAt'] !== undefined ? { completedAt: fields['completedAt'] } : {}),
    ...(exit !== undefined && Number.isInteger(exit) ? { exitCode: exit } : {}),
    timedOut: fields['timedOut'] === 'yes',
    ...(fields['error'] !== undefined ? { error: fields['error'] } : {}),
  };
}

/** The lines of the first fenced block after the heading `## <title>`; empty when the section is absent. */
function fencedSection(text: string, title: string): string[] {
  const lines = text.split('\n');
  const h = lines.indexOf(`## ${title}`);
  if (h < 0) return [];
  let i = h + 1;
  while (i < lines.length && !(lines[i] ?? '').startsWith('```')) i += 1;
  const body: string[] = [];
  for (i += 1; i < lines.length && lines[i] !== '```'; i += 1) body.push(lines[i] ?? '');
  return body;
}

/** The provider stream inside a raw log: Claude's `## Transcript (stream-json events)` fence, Codex's `## STDOUT` fence. */
export function rawLogStream(text: string): string[] {
  const claude = fencedSection(text, 'Transcript (stream-json events)');
  return claude.length > 0 ? claude : fencedSection(text, 'STDOUT');
}

/**
 * A raw provider log → the events the live capture would have written, with
 * the header's times (the stream itself carries none). `root` is the target
 * directory the run worked in, so absolute paths become target-relative as in
 * live events. Undefined when the header is not a run log.
 */
export function eventsFromRawLog(text: string, root: string): { header: RawLogHeader; events: ActivityEvent[] } | undefined {
  const header = parseRawLogHeader(text);
  if (!header) return undefined;
  const base: ActivityBase = { runId: header.runId, sliceId: header.sliceId, role: header.role, provider: header.provider, root };
  const parser = header.provider === 'claude' ? claudeEvents : header.provider === 'codex' ? codexEvents : header.provider === 'antigravity' ? antigravityEvents : undefined;
  const events: ActivityEvent[] = [runStart(base, header.startedAt, 'recovered from the raw provider log')];
  const stream = rawLogStream(text);
  if (parser) for (const line of stream) events.push(...parser(line, base, header.startedAt));
  // A stream with no structured events and no JSON lines is the agent's plain-text answer
  // (Codex before `--json`: the reviewer's verdict stands alone under STDOUT; glamCRM has 305
  // such runs). Keep it as one `say` rather than an empty transcript.
  if (events.length === 1 && stream.some((l) => l.trim() !== '') && !stream.some((l) => l.trim().startsWith('{'))) {
    events.push({ ...runStart(base, header.startedAt), kind: 'say', text: stream.join('\n').trim() });
  }
  const status = header.timedOut ? 'timed out' : header.error ? `error: ${header.error}` : header.exitCode !== undefined ? `exit ${header.exitCode}` : 'ended';
  events.push(runEnd(base, header.completedAt ?? header.startedAt, status));
  return { header, events };
}
