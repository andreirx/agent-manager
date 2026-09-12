/**
 * Filesystem artifact store adapter.
 *
 * Implements ArtifactStorePort using local filesystem.
 *
 * @module adapters/filesystem
 * @maturity PROTOTYPE
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

import type {
  ArtifactStorePort,
  ContainedFileSnapshotResult,
  PromptAsset,
} from '../../application/ports/artifact-store.js';
import type { SliceStatus } from '../../core/slice.js';
import type { RunRecord } from '../../core/run-record.js';

/**
 * Filesystem-based artifact store.
 */
export class FilesystemArtifactStore implements ArtifactStorePort {
  async readContainedFile(
    targetRoot: string,
    targetRelativePath: string
  ): Promise<ContainedFileSnapshotResult> {
    if (
      targetRelativePath.length === 0 ||
      isAbsolute(targetRelativePath) ||
      targetRelativePath.includes('\\') ||
      targetRelativePath.split('/').some((part) => part === '' || part === '.' || part === '..')
    ) {
      return {
        status: 'error',
        path: targetRelativePath,
        code: 'path-escape',
        detail: 'path is not a contained target-relative POSIX path',
      };
    }

    let realRoot: string;
    try {
      realRoot = await realpath(targetRoot);
    } catch (cause) {
      return this.readFailure(targetRelativePath, cause);
    }

    const requested = join(realRoot, ...targetRelativePath.split('/'));
    let resolved: string;
    try {
      resolved = await realpath(requested);
    } catch (cause) {
      return this.readFailure(targetRelativePath, cause);
    }
    const fromRoot = relative(realRoot, resolved);
    if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
      return {
        status: 'error',
        path: targetRelativePath,
        code: 'path-escape',
        detail: 'resolved file escapes the real target root',
      };
    }

    try {
      const info = await stat(resolved);
      if (!info.isFile()) {
        return {
          status: 'error',
          path: targetRelativePath,
          code: 'io-failure',
          detail: 'resolved path is not a regular file',
        };
      }
      const bytes = await readFile(resolved);
      return {
        status: 'ok',
        path: targetRelativePath,
        bytes,
        sha256: this.computeDigest(bytes),
      };
    } catch (cause) {
      return this.readFailure(targetRelativePath, cause);
    }
  }

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

  private readFailure(path: string, cause: unknown): ContainedFileSnapshotResult {
    const code =
      typeof cause === 'object' && cause !== null && 'code' in cause
        ? String((cause as { code: unknown }).code)
        : '';
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { status: 'error', path, code: 'missing', detail: 'file does not exist' };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return { status: 'error', path, code: 'unreadable', detail: 'permission denied' };
    }
    const detail = cause instanceof Error ? cause.message : String(cause);
    return { status: 'error', path, code: 'io-failure', detail };
  }

  private computeDigest(content: string | Uint8Array): string {
    const hash = createHash('sha256');
    hash.update(content);
    return `sha256:${hash.digest('hex')}`;
  }
}
