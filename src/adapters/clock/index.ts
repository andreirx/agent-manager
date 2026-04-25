/**
 * System clock adapter.
 *
 * Provides real wall-clock time for production use.
 *
 * @module adapters/clock
 * @maturity PROTOTYPE
 */

import type { ClockPort } from '../../application/ports/clock.js';

/**
 * System clock implementation.
 *
 * Returns current time as ISO-8601 UTC string.
 */
export class SystemClock implements ClockPort {
  now(): string {
    return new Date().toISOString();
  }
}
