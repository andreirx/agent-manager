/**
 * Activity capture for a provider run (ACTIVITY-1): the one thing every
 * provider adapter does the same way — open the run's activity log, write
 * `run-start`, feed the native stdout stream line by line through the
 * provider's pure parser, write `run-end`, close.
 *
 * Best-effort: nothing here can throw into the adapter. A parser error on a
 * line drops that line's events only; a log error is swallowed by the log.
 *
 * @module adapters/activity
 * @maturity PROTOTYPE
 */

import { LineSplitter, runEnd, runStart, type ActivityBase, type ActivityEvent } from '../../core/activity.js';
import type { ClockPort } from '../../application/ports/clock.js';
import type { RunRequest } from '../../application/ports/provider-runner.js';
import { openActivityLog, type ActivityLog } from './ndjson-log.js';

export type ActivityParser = (line: string, base: ActivityBase, at: string) => ActivityEvent[];

export interface ActivityCapture {
  /** Feed a raw stdout chunk; complete lines are parsed and logged. */
  feed(chunk: Buffer | string): void;
  /** Flush the tail, write `run-end` with the run's status, close the log. */
  end(status: string): Promise<void>;
}

/** A parser for providers whose stdout carries no structured events (Copilot): start/end only. */
export const noStreamParser: ActivityParser = () => [];

export async function startActivityCapture(request: RunRequest, provider: string, parser: ActivityParser, clock: ClockPort): Promise<ActivityCapture> {
  const base: ActivityBase = { runId: request.runId, sliceId: request.sliceId, role: request.role, provider, root: request.workingDir ?? '' };
  let log: ActivityLog;
  try {
    log = request.workingDir ? await openActivityLog(request.workingDir, request.runId) : { append: () => {}, close: async () => ({ written: 0 }) };
  } catch {
    log = { append: () => {}, close: async () => ({ written: 0 }) };
  }
  const splitter = new LineSplitter();
  const parse = (line: string): void => {
    try {
      for (const e of parser(line, base, clock.now())) log.append(e);
    } catch {
      // a malformed line costs its own events, never the run
    }
  };
  log.append(runStart(base, clock.now(), `mode ${request.mode}, model ${request.model ?? 'default'}, effort ${request.effort ?? 'default'}`));
  return {
    feed(chunk) {
      for (const line of splitter.feed(typeof chunk === 'string' ? chunk : chunk.toString('utf-8'))) parse(line);
    },
    async end(status) {
      for (const line of splitter.flush()) parse(line);
      log.append(runEnd(base, clock.now(), status));
      await log.close();
    },
  };
}
