/**
 * Filesystem artifact store adapter.
 *
 * Implements ArtifactStorePort using local filesystem.
 *
 * @module adapters/filesystem
 * @maturity PROTOTYPE
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
  ArtifactStorePort,
  PromptAsset,
} from '../../application/ports/artifact-store.js';
import type { SliceStatus } from '../../core/slice.js';
import type { RunRecord } from '../../core/run-record.js';

/**
 * Filesystem-based artifact store.
 */
export class FilesystemArtifactStore implements ArtifactStorePort {
  async readPromptAsset(path: string): Promise<PromptAsset> {
    const content = await readFile(path, 'utf-8');
    const digest = this.computeDigest(content);
    return { content, digest };
  }

  async createSlice(
    sliceDir: string,
    brief: string,
    status: SliceStatus
  ): Promise<void> {
    // Create slice directory
    await mkdir(sliceDir, { recursive: true });

    // Write brief.md
    const briefPath = join(sliceDir, 'brief.md');
    await writeFile(briefPath, brief, 'utf-8');

    // Write status.json
    const statusPath = join(sliceDir, 'status.json');
    await writeFile(statusPath, JSON.stringify(status, null, 2), 'utf-8');
  }

  async writeArtifact(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf-8');
  }

  async writeRunRecord(path: string, record: RunRecord): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(record, null, 2), 'utf-8');
  }

  async updateStatus(statusPath: string, status: SliceStatus): Promise<void> {
    await writeFile(statusPath, JSON.stringify(status, null, 2), 'utf-8');
  }

  private computeDigest(content: string): string {
    const hash = createHash('sha256');
    hash.update(content);
    return `sha256:${hash.digest('hex')}`;
  }
}
