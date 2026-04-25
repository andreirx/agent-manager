/**
 * ArtifactStorePort provides filesystem operations for slice artifacts.
 *
 * This port handles reading and writing authoritative artifacts.
 * Path construction is the caller's responsibility; the port only performs I/O.
 *
 * @module application/ports
 * @maturity PROTOTYPE
 */

import type { SliceStatus } from '../../core/slice.js';
import type { RunRecord } from '../../core/run-record.js';

/**
 * Result of reading a prompt asset.
 */
export interface PromptAsset {
  /** Raw content of the prompt file */
  readonly content: string;

  /** SHA-256 digest in format "sha256:<hex>" */
  readonly digest: string;
}

/**
 * Port for reading and writing slice artifacts.
 *
 * All paths are provided by the caller. The port does not construct
 * or interpret paths beyond performing the requested I/O.
 */
export interface ArtifactStorePort {
  /**
   * Read a prompt asset and compute its digest.
   *
   * @param path - Absolute or repo-relative path to prompt file
   * @returns Prompt content and SHA-256 digest
   * @throws If file does not exist or cannot be read
   */
  readPromptAsset(path: string): Promise<PromptAsset>;

  /**
   * Create a new slice with initial brief and status.
   *
   * Creates the slice directory, writes brief.md and status.json.
   *
   * @param sliceDir - Path to slice directory
   * @param brief - Content for brief.md
   * @param status - Initial slice status
   * @throws If directory already exists or cannot be created
   */
  createSlice(
    sliceDir: string,
    brief: string,
    status: SliceStatus
  ): Promise<void>;

  /**
   * Write an artifact to the given path.
   *
   * Creates parent directories if needed.
   *
   * @param path - Path where artifact should be written
   * @param content - Artifact content (string)
   */
  writeArtifact(path: string, content: string): Promise<void>;

  /**
   * Write a run record to the given path.
   *
   * @param path - Path where run record should be written
   * @param record - Run record to serialize as JSON
   */
  writeRunRecord(path: string, record: RunRecord): Promise<void>;

  /**
   * Update slice status.
   *
   * @param statusPath - Path to status.json
   * @param status - New status to write
   */
  updateStatus(statusPath: string, status: SliceStatus): Promise<void>;
}
