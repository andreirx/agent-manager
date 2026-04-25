/**
 * ClockPort provides the current time.
 *
 * Core domain does not generate timestamps. All timestamps flow
 * through this port, enabling deterministic testing.
 *
 * @module application/ports
 * @maturity PROTOTYPE
 */

/**
 * Port for obtaining current time.
 */
export interface ClockPort {
  /**
   * Returns the current timestamp as ISO-8601 UTC string.
   *
   * Example: "2026-04-25T14:32:00.000Z"
   */
  now(): string;
}
