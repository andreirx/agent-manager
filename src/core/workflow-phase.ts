/**
 * WorkflowPhase represents the current state of a slice in the workflow state machine.
 *
 * This is the authoritative phase stored in status.json.
 * Only the supervisor may advance the phase.
 *
 * @module core
 * @maturity PROTOTYPE
 */

/**
 * Workflow phases for a slice.
 *
 * The initial set covers the design-implementation-verification lifecycle.
 * Additional phases may be added as the product evolves.
 */
export const WorkflowPhase = {
  /** Slice is defined but not yet started */
  BACKLOG: 'BACKLOG',

  /** Design work in progress */
  DESIGN_DRAFT: 'DESIGN_DRAFT',

  /** Design submitted for review */
  DESIGN_REVIEW: 'DESIGN_REVIEW',

  /** Design being revised based on review findings */
  DESIGN_REWORK: 'DESIGN_REWORK',

  /** Design approved and frozen */
  DESIGN_FROZEN: 'DESIGN_FROZEN',

  /** Implementation work in progress */
  IMPLEMENTATION: 'IMPLEMENTATION',

  /** Implementation submitted for review */
  IMPLEMENTATION_REVIEW: 'IMPLEMENTATION_REVIEW',

  /** Implementation being revised based on review findings */
  IMPLEMENTATION_REWORK: 'IMPLEMENTATION_REWORK',

  /** Test preparation in progress */
  TEST_PREPARATION: 'TEST_PREPARATION',

  /** Tests being executed */
  TEST_EXECUTION: 'TEST_EXECUTION',

  /** Test results under review */
  TEST_REVIEW: 'TEST_REVIEW',

  /** Slice completed successfully */
  DONE: 'DONE',

  /** Slice escalated to human authority */
  ESCALATED: 'ESCALATED',

  /** Slice cancelled */
  CANCELLED: 'CANCELLED',
} as const;

export type WorkflowPhase = (typeof WorkflowPhase)[keyof typeof WorkflowPhase];

/**
 * Terminal phases where no further automated transitions occur.
 */
export const TERMINAL_PHASES: readonly WorkflowPhase[] = [
  WorkflowPhase.DONE,
  WorkflowPhase.ESCALATED,
  WorkflowPhase.CANCELLED,
] as const;

/**
 * Check if a phase is terminal.
 */
export function isTerminalPhase(phase: WorkflowPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}
