// Maturity: PROTOTYPE. Manager pre-check: run agent-manager's own stage-3 allocation parser over a slice document BEFORE its
// document review, so a refusal the document reviewer cannot see (TD-019) is caught in seconds instead of a review cycle.
// LIMIT: this is the runtime's structural parse only. Its preserved-obligation rule is a regex (no-behavior-change|remain|preserv)
// and a substring satisfies it — the reviewer caught CBR-C07 passing via 'remain' inside 'remainder' (2026-09-14). VALID means
// admissible, not semantically honest: write each preserved behaviour out explicitly in the check's `expected`.
// Usage (from agent-manager): npx tsx scripts/validate-allocation.ts <slice.md> <workItemId> <baselinePath-as-in-block> <manifest.json> <impl selection.md>
// Validate a slice document's stage-3 allocation block with the runtime's own parser (no relay, no baseline needed).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseImplementationAllocation, renderAssuranceError } from '../src/core/assurance.js';
const [slicePath, workItemId, baselinePath, manifestPath, packetPath] = process.argv.slice(2);
const bytes = readFileSync(slicePath);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const packet = readFileSync(packetPath, 'utf-8');
const line = packet.split('\n').find((l) => l.startsWith('IMPLEMENT_OBLIGATION_IDS: ')) ?? '';
const packetIds = line.replace('IMPLEMENT_OBLIGATION_IDS: ', '').split(',').map((s) => s.trim()).filter(Boolean);
const parsed = parseImplementationAllocation({ snapshot: { status: 'ok', path: slicePath, bytes: new Uint8Array(bytes), sha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex') }, expectedWorkItemId: workItemId, expectedBaselinePath: baselinePath, expectedPacketObligationIds: packetIds, reviewedObligationIds: manifest.reviewObligationIds });
if (parsed.ok) { console.log('ALLOCATION VALID:', parsed.value.checks.length, 'checks'); } else { console.log('ALLOCATION INVALID:'); for (const e of parsed.errors) console.log(' -', renderAssuranceError(e)); process.exit(1); }
