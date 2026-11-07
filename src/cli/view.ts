/**
 * `npm run view -- <target> [--port <n>]` — the read-only viewer (VIEW-1).
 *
 * Starts the local server over the target's slice trail, candidate diff and
 * lexmap index, prints the URL, and runs until interrupted. Nothing is written.
 *
 * @module cli
 * @maturity PROTOTYPE
 */

import { resolve } from 'node:path';
import { startViewServer } from '../view/server.js';

function usage(): never {
  console.error('Usage: npm run view -- <target> [--port <n>]   (default port 7788, 127.0.0.1 only)');
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let port = 7788;
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? '';
    if (a === '--port') port = Number(argv[++i] ?? usage());
    else if (a.startsWith('--')) usage();
    else positional.push(a);
  }
  const target = positional[0];
  if (!target || !Number.isInteger(port)) usage();
  const server = await startViewServer({ targetDir: resolve(target), port });
  console.log(`viewer: http://127.0.0.1:${server.port}/   target: ${resolve(target)}   (read-only; Ctrl-C to stop)`);
  const stop = (): void => { server.close().finally(() => process.exit(0)); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : String(cause));
  process.exit(2);
});
