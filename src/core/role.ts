/**
 * Role represents a stable SDLC responsibility.
 *
 * Roles are the stable abstraction. Provider tools are replaceable mechanisms
 * that execute work on behalf of roles.
 *
 * @module core
 * @maturity PROTOTYPE
 */

/**
 * Role identifier.
 *
 * Must be a valid slug: lowercase alphanumeric with hyphens.
 */
export type RoleId = string;

/**
 * Role definition.
 *
 * Minimal representation for Phase 1.
 * Additional fields (allowed phases, required prompts, capability requirements)
 * may be added in later phases.
 */
export interface Role {
  /** Unique identifier for this role */
  readonly id: RoleId;

  /** Human-readable name */
  readonly name: string;

  /** Purpose description (optional) */
  readonly purpose?: string;
}

/**
 * Validate a role ID follows the slug pattern.
 *
 * Pattern: ^[a-z][a-z0-9-]*$
 */
export function isValidRoleId(id: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(id);
}

/**
 * Create a Role, validating the ID.
 *
 * @throws Error if role ID is invalid
 */
export function createRole(id: RoleId, name: string, purpose?: string): Role {
  if (!isValidRoleId(id)) {
    throw new Error(
      `Invalid role ID: "${id}". Must match pattern ^[a-z][a-z0-9-]*$`
    );
  }
  const role: Role = { id, name };
  if (purpose !== undefined) {
    return { ...role, purpose };
  }
  return role;
}
