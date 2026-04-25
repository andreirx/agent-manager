/**
 * Core domain model for Agent Manager.
 *
 * This module contains pure domain entities and value objects.
 * No dependencies on external systems, adapters, or infrastructure.
 * No time generation (timestamps provided by caller).
 * No filesystem path derivation (storage layer concern).
 *
 * @module core
 * @maturity PROTOTYPE
 */

// Workflow phases
export {
  WorkflowPhase,
  TERMINAL_PHASES,
  isTerminalPhase,
} from './workflow-phase.js';

// Roles
export {
  type RoleId,
  type Role,
  isValidRoleId,
  createRole,
} from './role.js';

// Artifacts
export {
  type ArtifactType,
  type ArtifactRef,
  createArtifactRef,
} from './artifact-ref.js';

// Slices
export {
  isValidSliceId,
  type SliceStatus,
  type Slice,
  createSliceStatus,
  createSlice,
  updateSlicePhase,
} from './slice.js';

// Run records
export {
  RunStatus,
  type ProviderId,
  type PromptRef,
  type RunOutputArtifact,
  type RunRecord,
} from './run-record.js';
