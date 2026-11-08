/**
 * Activity capture for a provider run (ACTIVITY-1): the one thing every
 * provider adapter does the same way — open the run's activity log, write
 * `run-start`, feed the native stdout stream line by line through the
 * provider's pure parser, write `run-end`, close.
 *
 * Best-effort: nothing here can throw into the adapter. A parser error on a
 * line drops that line's events only; a log error is swallowed by the log.
 *
 * TRANSCRIPT-1: the events are also kept in memory and, when the run ends and
 * the log was writable, rendered once as the condensed transcript
 * `<workingDir>/.agent-manager/transcripts/<runId>.md` (`core/transcript`).
 * Same best-effort rule: a transcript that cannot be written costs nothing.
 *
 * @module adapters/activity
 * @maturity PROTOTYPE
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { LineSplitter, runEnd, runStart, type ActivityBase, type ActivityEvent } from '../../core/activity.js';
import { renderTranscript, transcriptRelPath } from '../../core/transcript.js';
import type { ClockPort } from '../../application/ports/clock.js';
import type { RunRequest } from '../../application/ports/provider-runner.js';
import { openActivityLog, type ActivityLog } from './ndjson-log.js';

export type ActivityParser = (line: string, base: ActivityBase, at: string) => ActivityEvent[];

export interface ActivityCapture {
  /** Feed a raw stdout chunk; complete lines are parsed and logged. */
  feed(chunk: Buffer | string): void;
  /** Flush the tail, write `run-end` with the run's status, close the log, write the condensed transcript. */
  end(status: string): Promise<{ transcriptPath?: string }>;
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
  const events: ActivityEvent[] = [];
  const record = (e: ActivityEvent): void => {
    events.push(e);
    log.append(e);
  };
  const parse = (line: string): void => {
    try {
      for (const e of parser(line, base, clock.now())) record(e);
    } catch {
      // a malformed line costs its own events, never the run
    }
  };
  record(runStart(base, clock.now(), `mode ${request.mode}, model ${request.model ?? 'default'}, effort ${request.effort ?? 'default'}`));
  return {
    feed(chunk) {
      for (const line of splitter.feed(typeof chunk === 'string' ? chunk : chunk.toString('utf-8'))) parse(line);
    },
    async end(status) {
      for (const line of splitter.flush()) parse(line);
      record(runEnd(base, clock.now(), status));
      const closed = await log.close();
      if (closed.path === undefined || !request.workingDir) return {};
      const transcriptPath = join(request.workingDir, transcriptRelPath(request.runId));
      try {
        await mkdir(dirname(transcriptPath), { recursive: true });
        await writeFile(transcriptPath, renderTranscript(events), 'utf-8');
        return { transcriptPath };
      } catch {
        return {};
      }
    },
  };
}
