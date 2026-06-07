/**
 * Shared relay helpers.
 *
 * Pure, provider- and phase-agnostic helpers reused by both the self-host relay
 * (relay.ts) and the target-owned relay (relay-target.ts). Kept here to avoid
 * duplicating the verdict contract in two places.
 *
 * @module application/use-cases
 * @maturity PROTOTYPE
 */

/**
 * Verdict parsed from reviewer output.
 */
export type Verdict = 'approved' | 'revise' | 'escalate' | 'unknown';

/**
 * Parse a reviewer verdict from output.
 *
 * Looks for a `STATUS:` line in the first 10 lines. This is the single
 * authoritative verdict contract shared by every reviewer, regardless of
 * provider, so reviewer prompts can be swapped without changing parsing.
 */
export function parseVerdict(output: string): Verdict {
  const lines = output.split('\n');

  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim().toUpperCase();

    if (trimmed.startsWith('STATUS:')) {
      const status = trimmed.replace('STATUS:', '').trim().toLowerCase();
      if (status === 'approved' || status === 'approve') return 'approved';
      if (
        status === 'revise' ||
        status === 'revision' ||
        status === 'changes' ||
        status === 'revisions'
      )
        return 'revise';
      if (status === 'escalate' || status === 'escalation' || status === 'block')
        return 'escalate';
    }
  }

  return 'unknown';
}
