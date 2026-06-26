/**
 * Jest configuration — ts-jest in ESM mode.
 *
 * The project is ESM ("type": "module", moduleResolution NodeNext). ts-jest's
 * default-esm preset transforms .ts files as ES modules; the moduleNameMapper
 * strips the trailing `.js` that NodeNext-style relative imports carry so Jest
 * resolves `./foo.js` back to the `./foo.ts` source under test.
 *
 * Run via `npm test` (which sets --experimental-vm-modules).
 *
 * @maturity PROTOTYPE
 */

/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Per-file transpile (no full typecheck here) — silences the NodeNext "hybrid
  // module kind" warning and speeds runs. Type correctness is still enforced by
  // the separate `npm run typecheck` (tsc --noEmit), which covers src/**/* incl.
  // the test files.
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, isolatedModules: true }],
  },
};
