/**
 * Slice is the unit of supervised work.
 *
 * A slice represents a discrete piece of work moving through the workflow.
 * The authoritative state of a slice is stored in status.json within the slice directory.
 *
 * @module core
 * @maturity PROTOTYPE
 */

import { WorkflowPhase } from './workflow-phase.js';

/**
 * Slice ID pattern.
 *
 * Must be a directory-safe string: starts with alphanumeric,
 * followed by alphanumeric, dots, underscores, or hyphens.
 */
const SLICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Validate a slice ID.
 */
export function isValidSliceId(id: string): boolean {
  return SLICE_ID_PATTERN.test(id);
}

/**
 * Slice status as stored in status.json.
 *
 * This is the minimal authoritative state.
 * It is the single source of truth for current phase.
 */
export interface SliceStatus {
  /** Slice identifier */
  readonly sliceId: string;

  /** Current workflow phase */
  readonly phase: WorkflowPhase;

  /** Last update timestamp (ISO-8601) */
  readonly updatedAt: string;
}

/**
 * Full slice state including metadata.
 *
 * This extends SliceStatus with additional fields.
 * Storage paths are NOT part of core domain; they belong to the storage layer.
 */
export interface Slice extends SliceStatus {
  /** Human-readable title */
  readonly title: string;
}

/**
 * Create a slice status object.
 *
 * Timestamp must be provided by caller (from clock port in Phase 2).
 *
 * @throws Error if slice ID is invalid
 */
export function createSliceStatus(
  sliceId: string,
  phase: WorkflowPhase,
  updatedAt: string
): SliceStatus {
  if (!isValidSliceId(sliceId)) {
    throw new Error(
      `Invalid slice ID: "${sliceId}". Must match pattern ^[A-Za-z0-9][A-Za-z0-9._-]*$`
    );
  }
  return {
    sliceId,
    phase,
    updatedAt,
  };
}

/**
 * Create a full slice object.
 *
 * Timestamp must be provided by caller.
 *
 * @throws Error if slice ID is invalid
 */
export function createSlice(
  sliceId: string,
  title: string,
  phase: WorkflowPhase,
  updatedAt: string
): Slice {
  if (!isValidSliceId(sliceId)) {
    throw new Error(
      `Invalid slice ID: "${sliceId}". Must match pattern ^[A-Za-z0-9][A-Za-z0-9._-]*$`
    );
  }
  return {
    sliceId,
    title,
    phase,
    updatedAt,
  };
}

/**
 * Update slice phase, returning a new SliceStatus.
 *
 * Slices are immutable value objects.
 * Timestamp must be provided by caller.
 */
export function updateSlicePhase(
  slice: SliceStatus,
  newPhase: WorkflowPhase,
  updatedAt: string
): SliceStatus {
  return {
    ...slice,
    phase: newPhase,
    updatedAt,
  };
}
