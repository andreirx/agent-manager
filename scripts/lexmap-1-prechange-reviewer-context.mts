// Oracle generator for the LEXMAP-1 byte-for-byte test
// (src/application/use-cases/fixtures/lexmap-1-prechange-reviewer-context.txt).
//
// Runs the PRE-CHANGE targetRelayLoop from a git-archive copy of HEAD 3f5b331
// (argv[2]; `node_modules` linked into it) on the exact slice the test seeds,
// with the same stubs, and prints the reviewer context with the temp target
// path replaced by `<target>`. The fixture is independent of the current
// implementation because the code it runs is the archived one.
//
// Usage:
//   git archive 3f5b331 | tar -x -C <head-copy> && ln -s "$PWD/node_modules" <head-copy>/node_modules
//   (cd <head-copy> && npx tsx <agent-manager>/scripts/lexmap-1-prechange-reviewer-context.mts <head-copy>) \
//     > src/application/use-cases/fixtures/lexmap-1-prechange-reviewer-context.txt
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const headCopy = process.argv[2];
if (!headCopy) {
  console.error('usage: lexmap-1-prechange-reviewer-context.mts <head-copy>');
  process.exit(1);
}
// The relay prints progress lines to stdout; keep stdout for the fixture bytes only.
console.log = (...args: unknown[]) => { console.error(...args); };
const { targetRelayLoop } = await import(join(headCopy, 'src/application/use-cases/relay-target.ts'));
const { FilesystemArtifactStore } = await import(join(headCopy, 'src/adapters/filesystem/artifact-store.ts'));
const { RunStatus } = await import(join(headCopy, 'src/core/run-record.ts'));

const NO_MARKER_ARTIFACT = ['# Build summary', '', 'Implemented the slice. I hit no DECISION_REQUIRED stop condition.'].join('\n');
const target = await mkdtemp('/private/tmp/LEXMAP-1-absent-');
const sliceId = 'IMPL-1';
const amDir = join(target, '.agent-manager');
const sliceDir = join(amDir, 'slices', sliceId);
await mkdir(join(sliceDir, 'runs'), { recursive: true });
const sliceDoc = `docs/slices/${sliceId}.md`;
await writeFile(join(sliceDir, 'selection.md'), `STATUS: selected\nSLICE_ID: ${sliceId}\nSLICE_DOC: ${sliceDoc}\n`);
await writeFile(join(sliceDir, 'build-0.md'), NO_MARKER_ARTIFACT);
await writeFile(join(sliceDir, 'status.json'), JSON.stringify({ phase: 'review-impl', sliceId, sliceDoc, iteration: 0, updatedAt: '2026-06-26T00:00:00.000Z', lastActor: 'claude', builderProvider: 'claude', supervisorProvider: 'codex' }, null, 2));
await writeFile(join(amDir, 'current.json'), JSON.stringify({ sliceId, sliceDoc, updatedAt: '2026-06-26T00:00:00.000Z' }, null, 2));

const calls: { role: string; delivery: { contextText?: string } }[] = [];
const stub = (text: string) => ({
  async run(request: { runId: string; role: string; delivery: { contextText?: string } }) {
    calls.push(request);
    return {
      runId: request.runId,
      status: RunStatus.COMPLETED,
      outputArtifacts: [{ suggestedPath: `${request.role}-output.md`, type: 'provider-output', content: text }],
      logPath: '/tmp/stub.log',
      startedAt: '2026-06-26T00:00:00.000Z',
      completedAt: '2026-06-26T00:00:01.000Z',
      deliveryReceipt: { kind: 'legacy-live-inputs' },
    };
  },
});
const input = {
  targetDir: target,
  promptRoot: headCopy,
  selectPromptPaths: ['prompts/system/base.md', 'prompts/roles/supervisor-select.md'],
  builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder-target.md'],
  reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer-target.md'],
  challengerPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-challenger.md'],
  rebutterPromptPaths: ['prompts/system/base.md', 'prompts/roles/decision-rebutter.md'],
  builderProvider: 'claude',
  supervisorProvider: 'codex',
  builderModel: 'stub-model',
  builderEffort: 'high',
  supervisorModel: 'stub-model',
  supervisorEffort: 'high',
  maxIterations: 5,
  reselect: false,
  sliceId,
};
await targetRelayLoop(input, {
  clock: { now: () => '2026-06-26T00:00:00.000Z' },
  builder: stub('built'),
  supervisor: stub('STATUS: approved'),
  computeDigest: (c: string) => `sha256:${createHash('sha256').update(c).digest('hex')}`,
  changedPaths: async () => [],
  artifactStore: new FilesystemArtifactStore(),
});
const review = calls.find((c) => c.role === 'reviewer');
if (!review?.delivery.contextText) throw new Error('no reviewer context captured');
process.stdout.write(review.delivery.contextText.replaceAll(target, '<target>'));
await rm(target, { recursive: true, force: true });
