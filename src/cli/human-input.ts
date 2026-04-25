/**
 * CLI for recording human input on a slice.
 *
 * Usage: npm run human -- <slice-id> <phase> [reason]
 *
 * Reads input from stdin and records it as a human intervention.
 *
 * Example:
 *   echo "Fix the authentication module" | npm run human -- AM-001 design "clarification needed"
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SystemClock } from '../adapters/clock/index.js';
import { recordHumanInput, type RelayPhase } from '../application/use-cases/relay.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../..');

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

async function main() {
  const sliceId = process.argv[2];
  const phase = process.argv[3] as RelayPhase | undefined;
  const reason = process.argv[4];

  if (!sliceId || !phase) {
    console.error('Usage: npm run human -- <slice-id> <phase> [reason]');
    console.error('');
    console.error('Phases: design, review-design, implement, review-impl, blocked, done');
    console.error('');
    console.error('Reads human input from stdin.');
    process.exit(1);
  }

  const validPhases: RelayPhase[] = ['design', 'review-design', 'implement', 'review-impl', 'blocked', 'done'];
  if (!validPhases.includes(phase)) {
    console.error(`Invalid phase: ${phase}`);
    console.error(`Valid phases: ${validPhases.join(', ')}`);
    process.exit(1);
  }

  console.log(`Recording human input for ${sliceId} in phase ${phase}...`);
  console.log('Reading from stdin...');

  const text = await readStdin();

  if (!text) {
    console.error('No input received from stdin.');
    process.exit(1);
  }

  const clock = new SystemClock();

  await recordHumanInput(
    {
      sliceId,
      sliceDir: `slices/${sliceId}`,
      repoRoot,
      text,
      phase,
      ...(reason ? { reason } : {}),
    },
    clock
  );

  console.log(`\nHuman input recorded.`);
  console.log(`  Slice: ${sliceId}`);
  console.log(`  Phase: ${phase}`);
  console.log(`  Actor: human`);
  if (reason) {
    console.log(`  Reason: ${reason}`);
  }
  console.log(`\nUpdated:`);
  console.log(`  slices/${sliceId}/current.md`);
  console.log(`  slices/${sliceId}/current.meta.json`);
  console.log(`  slices/${sliceId}/status.json`);
  console.log(`  logs/...human__human__slice-${sliceId}.txt`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(2);
});
