/**
 * Application ports for Agent Manager.
 *
 * Ports define the interfaces between application logic and external systems.
 * Adapters implement these ports with concrete mechanisms.
 *
 * @module application/ports
 * @maturity PROTOTYPE
 */

export { type ClockPort } from './clock.js';

export {
  type PromptAsset,
  type ArtifactStorePort,
} from './artifact-store.js';

export {
  type RunRequest,
  type RunResult,
  type ProviderRunnerPort,
} from './provider-runner.js';
