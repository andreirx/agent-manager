/**
 * CLI for running the relay loop on a slice.
 *
 * Usage: npm run relay -- <slice-id>
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SystemClock } from '../adapters/clock/index.js';
import { FilesystemArtifactStore } from '../adapters/filesystem/index.js';
import { ClaudeAdapter } from '../adapters/providers/claude-code/index.js';
import { CodexAdapter } from '../adapters/providers/codex/index.js';
import { relayLoop } from '../application/use-cases/relay.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function computeDigest(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return `sha256:${hash.digest('hex')}`;
}

async function main() {
  const sliceId = process.argv[2];

  if (!sliceId) {
    console.error('Usage: npm run relay -- <slice-id>');
    process.exit(1);
  }

  console.log(`=== Relay Loop: ${sliceId} ===\n`);

  // Wire dependencies
  const clock = new SystemClock();
  const store = new FilesystemArtifactStore();

  const builder = new ClaudeAdapter(
    {
      logsDir: resolve(repoRoot, 'logs'),
      repoRoot,
    },
    store,
    clock
  );

  const reviewer = new CodexAdapter(
    {
      logsDir: resolve(repoRoot, 'logs'),
      repoRoot,
    },
    store,
    clock
  );

  try {
    const result = await relayLoop(
      {
        sliceId,
        sliceDir: `slices/${sliceId}`,
        repoRoot,
        builderPromptPaths: ['prompts/system/base.md', 'prompts/roles/builder.md'],
        reviewerPromptPaths: ['prompts/system/base.md', 'prompts/roles/reviewer.md'],
      },
      {
        clock,
        builder,
        reviewer,
        computeDigest,
      }
    );

    console.log(`\nRelay completed.`);
    console.log(`Final phase: ${result.phase}`);
    if (result.verdict) {
      console.log(`Verdict: ${result.verdict}`);
    }
    if (result.reason) {
      console.log(`Reason: ${result.reason}`);
    }

    if (result.phase === 'blocked') {
      console.log(`\nCheck slices/${sliceId}/notes-for-human.md for details.`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
}

main();
