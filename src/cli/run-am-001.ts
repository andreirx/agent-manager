/**
 * CLI script to execute AM-001 slice.
 *
 * This is the composition root for the first self-hosting vertical slice.
 *
 * Usage: npx tsx src/cli/run-am-001.ts
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SystemClock } from '../adapters/clock/index.js';
import { FilesystemArtifactStore } from '../adapters/filesystem/index.js';
import { ClaudeAdapter } from '../adapters/providers/claude-code/index.js';
import { runBuilder } from '../application/use-cases/run-builder.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../..');

async function main() {
  console.log('=== AM-001 Builder Run ===\n');

  // Wire dependencies
  const clock = new SystemClock();
  const store = new FilesystemArtifactStore();
  const provider = new ClaudeAdapter(
    {
      logsDir: resolve(repoRoot, 'logs'),
      repoRoot,
    },
    store,
    clock
  );

  // Generate run ID (provisional operational naming, not a frozen contract)
  const runId = `run-${Date.now()}`;

  // Execute builder
  console.log('Executing builder...\n');

  try {
    const result = await runBuilder(
      {
        sliceId: 'AM-001',
        sliceDir: 'slices/AM-001',  // repo-relative
        promptPaths: ['prompts/system/base.md', 'prompts/roles/builder.md'],
        repoRoot,
        runId,
        providerId: 'claude',  // provider identity from composition root
      },
      { clock, store, provider }
    );

    if (result.success) {
      console.log('Builder run completed successfully.\n');
      console.log(`Output artifact: ${result.outputArtifactPath}`);
      console.log(`Run record: ${result.runRecordPath}`);
    } else {
      console.error('Builder run failed.\n');
      console.error(`Error: ${result.error}`);
      console.log(`Run record: ${result.runRecordPath}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Composition error:', err);
    process.exit(2);
  }
}

main();
