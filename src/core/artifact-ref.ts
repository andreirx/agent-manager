/**
 * ArtifactRef is a reference to an artifact in the slice structure.
 *
 * Artifacts are the authoritative units of workflow state.
 * ArtifactRef is used to reference artifacts without containing their content.
 *
 * @module core
 * @maturity PROTOTYPE
 */

/**
 * Artifact type identifier.
 *
 * This is an open string type. Well-known types may be defined
 * in contracts or conventions, but core does not enforce a taxonomy.
 */
export type ArtifactType = string;

/**
 * Reference to an artifact.
 *
 * The path is relative to the slice directory or repository root,
 * depending on context. Core does not interpret paths.
 */
export interface ArtifactRef {
  /** Path to the artifact file */
  readonly path: string;

  /** Artifact type */
  readonly type: ArtifactType;
}

/**
 * Create an artifact reference.
 */
export function createArtifactRef(path: string, type: ArtifactType): ArtifactRef {
  return { path, type };
}
