/**
 * Activity log writer (ACTIVITY-1): one NDJSON file per run under the
 * target's `.agent-manager/activity/<runId>.ndjson`, appended as events
 * arrive so a viewer can tail a run in progress.
 *
 * Best-effort by construction: a provider run must never fail or slow down
 * because its activity could not be recorded. Every write is queued behind
 * the previous one; the first error is kept and reported by `close()`,
 * never thrown. When the target has no `.agent-manager/` directory (a bare
 * adapter invocation outside the relay) nothing is written and `close()`
 * says so — the adapter does not provision relay state on its own.
 *
 * @module adapters/activity
 * @maturity PROTOTYPE
 */

import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ActivityEvent } from '../../core/activity.js';

export interface ActivityLog {
  /** Queue one event; returns immediately. */
  append(event: ActivityEvent): void;
  /** Wait for the queue; report where the log is, or why nothing was written. */
  close(): Promise<{ path?: string; written: number; error?: string }>;
}

const NO_OP: ActivityLog = { append: () => {}, close: async () => ({ written: 0, error: 'no .agent-manager directory in the working directory' }) };

/** Path of a run's activity log inside a target (pure helper, exported for the viewer). */
export function activityLogPath(workingDir: string, runId: string): string {
  return join(workingDir, '.agent-manager', 'activity', `${runId.replace(/[^A-Za-z0-9._-]/g, '_')}.ndjson`);
}

/**
 * A run's recorded events (REVIEW-UNINSPECTED-1: the reviewer context needs the
 * builder's reads). Missing log → `[]`; a partially written tail line is skipped.
 */
export async function readActivityEvents(workingDir: string, runId: string): Promise<ActivityEvent[]> {
  let raw: string;
  try {
    raw = await readFile(activityLogPath(workingDir, runId), 'utf-8');
  } catch {
    return [];
  }
  const events: ActivityEvent[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line) as ActivityEvent); } catch { /* a partially written tail line */ }
  }
  return events;
}

export async function openActivityLog(workingDir: string, runId: string): Promise<ActivityLog> {
  try {
    const am = await stat(join(workingDir, '.agent-manager'));
    if (!am.isDirectory()) return NO_OP;
  } catch {
    return NO_OP;
  }
  const path = activityLogPath(workingDir, runId);
  let chain: Promise<void> = mkdir(join(workingDir, '.agent-manager', 'activity'), { recursive: true }).then(() => {});
  let written = 0;
  let error: string | undefined;
  const record = (cause: unknown): void => {
    if (error === undefined) error = cause instanceof Error ? cause.message : String(cause);
  };
  chain = chain.catch(record);
  return {
    append(event) {
      const line = `${JSON.stringify(event)}\n`;
      chain = chain.then(() => appendFile(path, line, 'utf-8')).then(() => { written += 1; }).catch(record);
    },
    async close() {
      await chain;
      return { path, written, ...(error !== undefined ? { error } : {}) };
    },
  };
}
