/**
 * Agent activity events (ACTIVITY-1): one record shape for "the agent read /
 * edited / ran / searched X", and the pure parsers that derive it from each
 * provider's native stream, line by line, as the run happens.
 *
 * Why one shape: four adapters emit four native forms (Claude `stream-json`
 * `tool_use` blocks, Codex `--json` items, Antigravity `step_update` events,
 * Copilot plain text). One consumer (the viewer, and the uninspected-neighbors
 * computation) must not learn four grammars. Axis of variation: provider
 * event formats — demonstrated, not imagined.
 *
 * What is observable per provider (recorded, not hidden):
 *  - Claude: reads, edits, commands and searches, each with its path/command
 *    (`tool_use` blocks carry the tool input).
 *  - Codex: commands with exit codes (`command_execution` items); reads happen
 *    inside shell commands (`cat`, `sed`), so "files read" is not a fact Codex
 *    exposes — the command text is shown instead. `file_change` items, when
 *    present, are mapped as edits by path (shape taken from the published
 *    protocol, unverified against a live run — TD-038).
 *  - Antigravity: `step_update` events whose `step_type` is `tool` become
 *    notes carrying whatever name the step exposes (tool shape unverified —
 *    TD-038).
 *  - Copilot: nothing structured; only run start and end.
 *
 * TRANSCRIPT-1 (human 2026-11-08): the agent's own words are kept too — a
 * `say` event per Claude `text` block and per Codex `agent_message` — so the
 * run's event log is also its condensed transcript (what the agent said and
 * touched; never what it copied: tool results and thinking stay in the raw
 * provider log only).
 *
 * Pure: no I/O, no Node APIs. Paths under `root` are made root-relative.
 *
 * @module core
 * @maturity PROTOTYPE
 */

export type ActivityKind = 'run-start' | 'run-end' | 'read' | 'edit' | 'exec' | 'search' | 'note' | 'say';

export interface ActivityEvent {
  readonly at: string;
  readonly runId: string;
  readonly sliceId: string;
  readonly role: string;
  readonly provider: string;
  readonly kind: ActivityKind;
  /** Root-relative when under the target; otherwise as the provider gave it. */
  readonly path?: string;
  readonly command?: string;
  readonly pattern?: string;
  /** The native tool/step name (`Read`, `command_execution`, …). */
  readonly tool?: string;
  /** Short free text: exit code, status, provider note. */
  readonly detail?: string;
  /** The agent's prose (`say` events only), verbatim. */
  readonly text?: string;
}

/** Fixed fields of one run, supplied by the adapter. */
export interface ActivityBase {
  readonly runId: string;
  readonly sliceId: string;
  readonly role: string;
  readonly provider: string;
  /** Absolute target directory; paths under it are relativized. */
  readonly root: string;
}

export function relativize(root: string, path: string): string {
  const r = root.endsWith('/') ? root : `${root}/`;
  return path.startsWith(r) ? path.slice(r.length) : path === root ? '.' : path;
}

/** Splits arbitrary chunks into complete lines; the tail waits for its newline. */
export class LineSplitter {
  private tail = '';
  feed(chunk: string): string[] {
    const text = this.tail + chunk;
    const parts = text.split('\n');
    this.tail = parts.pop() ?? '';
    return parts;
  }
  flush(): string[] {
    const t = this.tail;
    this.tail = '';
    return t.length > 0 ? [t] : [];
  }
}

function parseJson(line: string): Record<string, unknown> | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) return undefined;
  try {
    const v: unknown = JSON.parse(trimmed);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function event(base: ActivityBase, at: string, kind: ActivityKind, rest: Partial<Pick<ActivityEvent, 'path' | 'command' | 'pattern' | 'tool' | 'detail' | 'text'>> = {}): ActivityEvent {
  return {
    at,
    runId: base.runId,
    sliceId: base.sliceId,
    role: base.role,
    provider: base.provider,
    kind,
    ...(rest.path !== undefined ? { path: relativize(base.root, rest.path) } : {}),
    ...(rest.command !== undefined ? { command: rest.command } : {}),
    ...(rest.pattern !== undefined ? { pattern: rest.pattern } : {}),
    ...(rest.tool !== undefined ? { tool: rest.tool } : {}),
    ...(rest.detail !== undefined ? { detail: rest.detail } : {}),
    ...(rest.text !== undefined ? { text: rest.text } : {}),
  };
}

export function runStart(base: ActivityBase, at: string, detail?: string): ActivityEvent {
  return event(base, at, 'run-start', detail !== undefined ? { detail } : {});
}

export function runEnd(base: ActivityBase, at: string, detail: string): ActivityEvent {
  return event(base, at, 'run-end', { detail });
}

const CLAUDE_READ_TOOLS = new Set(['Read', 'NotebookRead']);
const CLAUDE_EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const CLAUDE_SEARCH_TOOLS = new Set(['Grep', 'Glob']);

/** One Claude `stream-json` line → a `say` per text block and an event per `tool_use` block of an assistant message. */
export function claudeEvents(line: string, base: ActivityBase, at: string): ActivityEvent[] {
  const v = parseJson(line);
  if (!v || v['type'] !== 'assistant') return [];
  const message = v['message'];
  if (!message || typeof message !== 'object') return [];
  const content = (message as Record<string, unknown>)['content'];
  if (!Array.isArray(content)) return [];
  const out: ActivityEvent[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text') {
      const text = str(b['text']) ?? '';
      if (text.trim() !== '') out.push(event(base, at, 'say', { text }));
      continue;
    }
    if (b['type'] !== 'tool_use') continue;
    const tool = str(b['name']) ?? 'tool';
    const input = (b['input'] && typeof b['input'] === 'object' ? b['input'] : {}) as Record<string, unknown>;
    const path = str(input['file_path']) ?? str(input['notebook_path']) ?? str(input['path']);
    if (CLAUDE_READ_TOOLS.has(tool)) out.push(event(base, at, 'read', { tool, ...(path !== undefined ? { path } : {}) }));
    else if (CLAUDE_EDIT_TOOLS.has(tool)) out.push(event(base, at, 'edit', { tool, ...(path !== undefined ? { path } : {}) }));
    else if (tool === 'Bash') out.push(event(base, at, 'exec', { tool, command: str(input['command']) ?? '' }));
    else if (CLAUDE_SEARCH_TOOLS.has(tool)) out.push(event(base, at, 'search', { tool, pattern: str(input['pattern']) ?? '', ...(path !== undefined ? { path } : {}) }));
    else out.push(event(base, at, 'note', { tool }));
  }
  return out;
}

/** One Codex `--json` line → an exec per completed command, an edit per file change, a `say` per agent message. */
export function codexEvents(line: string, base: ActivityBase, at: string): ActivityEvent[] {
  const v = parseJson(line);
  if (!v || v['type'] !== 'item.completed') return [];
  const item = v['item'];
  if (!item || typeof item !== 'object') return [];
  const it = item as Record<string, unknown>;
  const type = str(it['type']);
  if (type === 'agent_message') {
    const text = str(it['text']) ?? '';
    return text.trim() === '' ? [] : [event(base, at, 'say', { text })];
  }
  if (type === 'command_execution') {
    const exit = it['exit_code'];
    const status = str(it['status']);
    const detail = typeof exit === 'number' ? `exit ${exit}` : status ?? 'completed';
    return [event(base, at, 'exec', { tool: type, command: str(it['command']) ?? '', detail })];
  }
  if (type === 'file_change') {
    const changes = Array.isArray(it['changes']) ? it['changes'] : [];
    const out: ActivityEvent[] = [];
    for (const c of changes) {
      if (!c || typeof c !== 'object') continue;
      const cc = c as Record<string, unknown>;
      const path = str(cc['path']);
      if (path !== undefined) out.push(event(base, at, 'edit', { tool: type, path, ...(str(cc['kind']) !== undefined ? { detail: str(cc['kind']) as string } : {}) }));
    }
    return out;
  }
  return [];
}

/** One Antigravity `stream-json` line → a note per tool step (tool fields are unverified; whatever names exist are kept). */
export function antigravityEvents(line: string, base: ActivityBase, at: string): ActivityEvent[] {
  const v = parseJson(line);
  if (!v || v['event'] !== 'step_update') return [];
  const step = v['step_update'];
  if (!step || typeof step !== 'object') return [];
  const s = step as Record<string, unknown>;
  if (s['step_type'] !== 'tool') return [];
  const tool = str(s['tool_name']) ?? str(s['display_name']) ?? str(s['name']) ?? 'tool';
  const state = str(s['state']);
  return [event(base, at, 'note', { tool, ...(state !== undefined ? { detail: state } : {}) })];
}

/** Paths an agent touched, by kind, from a run's events (root-relative, deduplicated, sorted). */
export function touchedPaths(events: readonly ActivityEvent[]): { read: string[]; edited: string[] } {
  const read = new Set<string>();
  const edited = new Set<string>();
  for (const e of events) {
    if (e.path === undefined) continue;
    if (e.kind === 'read') read.add(e.path);
    else if (e.kind === 'edit') edited.add(e.path);
  }
  return { read: [...read].sort(), edited: [...edited].sort() };
}
