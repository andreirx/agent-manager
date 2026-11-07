import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { activityLogPath, openActivityLog } from './ndjson-log.js';
import type { ActivityEvent } from '../../core/activity.js';

const ev = (kind: ActivityEvent['kind'], path?: string): ActivityEvent => ({ at: '2026-11-07T00:00:00.000Z', runId: 'build-S-1', sliceId: 'S', role: 'builder', provider: 'claude', kind, ...(path !== undefined ? { path } : {}) });

describe('activity ndjson log', () => {
  let dir = '';
  beforeEach(async () => { dir = await mkdtemp('/private/tmp/ACTIVITY-1-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it('appends one JSON line per event under .agent-manager/activity and reports the path', async () => {
    await mkdir(join(dir, '.agent-manager'));
    const log = await openActivityLog(dir, 'build-S-1');
    log.append(ev('run-start'));
    log.append(ev('read', 'src/a.ts'));
    log.append(ev('run-end'));
    const closed = await log.close();
    expect(closed).toEqual({ path: activityLogPath(dir, 'build-S-1'), written: 3 });
    const lines = (await readFile(activityLogPath(dir, 'build-S-1'), 'utf-8')).trim().split('\n').map((l) => JSON.parse(l) as ActivityEvent);
    expect(lines.map((l) => l.kind)).toEqual(['run-start', 'read', 'run-end']);
    expect(lines[1]?.path).toBe('src/a.ts');
  });

  it('writes nothing and says why when the working directory has no .agent-manager', async () => {
    const log = await openActivityLog(dir, 'build-S-1');
    log.append(ev('read', 'x'));
    expect(await log.close()).toEqual({ written: 0, error: 'no .agent-manager directory in the working directory' });
  });

  it('never throws: a write failure is reported by close(), later appends keep going', async () => {
    await mkdir(join(dir, '.agent-manager'));
    await mkdir(join(dir, '.agent-manager', 'activity', 'build-S-1.ndjson'), { recursive: true }); // a directory where the file should be
    const log = await openActivityLog(dir, 'build-S-1');
    log.append(ev('run-start'));
    log.append(ev('run-end'));
    const closed = await log.close();
    expect(closed.written).toBe(0);
    expect(closed.error).toMatch(/EISDIR|illegal operation on a directory/);
  });

  it('sanitizes run ids into file names', () => {
    expect(activityLogPath('/t', 'review/S:1')).toBe('/t/.agent-manager/activity/review_S_1.ndjson');
  });
});
