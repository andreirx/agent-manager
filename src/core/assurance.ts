/**
 * Pure requirements-assurance policy for the delivered stage-1/stage-2 gates
 * and the stage-3 allocation, candidate, evidence, and review records.
 *
 * The filesystem adapter supplies immutable raw-text snapshots and their
 * byte digests. This module validates the closed v1 records and returns either
 * the one admitted baseline value or a typed list of expected failures. It has
 * no filesystem, provider, Git, clock, or process dependencies.
 *
 * @module core
 * @maturity PROTOTYPE
 */

import type { RunInputProvenance } from './run-record.js';

export const STAGE1_CONTRACT = 'requirements-assurance/v1-stage1' as const;
export const BASELINE_ADMISSION = 'baseline-admission' as const;
export const STAGE2_CONTRACT = 'requirements-assurance/v2-stage2' as const;
export const REVIEWED_INPUTS = 'reviewed-inputs' as const;

export type AssuranceErrorCode =
  | 'missing'
  | 'unreadable'
  | 'io-failure'
  | 'path-escape'
  | 'malformed-json'
  | 'metadata-delimiter'
  | 'duplicate-field'
  | 'duplicate-identity'
  | 'unknown-field'
  | 'invalid-field'
  | 'unsupported-version'
  | 'unsupported-kind'
  | 'digest-mismatch'
  | 'source-not-found'
  | 'source-ambiguous'
  | 'heading-mismatch'
  | 'parent-mismatch'
  | 'review-not-accepted'
  | 'approval-not-approved'
  | 'subject-mismatch'
  | 'review-coverage-missing'
  | 'review-coverage-unknown'
  | 'review-result-mismatch'
  | 'role-context-mismatch'
  | 'approval-already-exists';

export type EvidenceOutcome =
  | { kind: 'passed'; actual: string; supportingEvidence: string[] }
  | { kind: 'failed'; actual: string; supportingEvidence: string[] }
  | { kind: 'not-run'; reason: string }
  | { kind: 'execution-failed'; failure: string };

export type ImplementationCheckMethod =
  | { kind: 'command'; command: string; cwd: string; environment: string; inputs: string }
  | { kind: 'inspection'; subject: string; criterion: string; inputs: string };

export interface ImplementationCheckPlan {
  checkId: string;
  obligationIds: string[];
  owner: 'builder' | 'reviewer';
  method: ImplementationCheckMethod;
  expected: string;
}

export interface ImplementationAllocation {
  formatVersion: 1;
  kind: 'implementation-allocation';
  workItemId: string;
  baselinePath: string;
  parentRequirementIds: string[];
  implements: string[];
  preserves: string[];
  preservationObligationIds: string[];
  changes: string[];
  acceptanceBoundary: string;
  candidatePaths: string[];
  postReviewRecordPaths: string[];
  candidateExclusions: { pathPrefix: string; reason: string }[];
  checks: ImplementationCheckPlan[];
}

export type CandidateFileState =
  | { kind: 'absent' }
  | { kind: 'present'; gitMode: '100644' | '100755'; sha256: string; byteLength: number };

export type CandidateIndexState =
  | { kind: 'absent' }
  | { kind: 'present'; gitMode: '100644' | '100755'; stage: 0; sha256: string; byteLength: number };

export interface CandidateTreeObservation {
  baseRevision: string;
  entries: {
    path: string;
    porcelainStatus: string;
    index: CandidateIndexState;
    workingTree: CandidateFileState;
  }[];
}

export interface CandidateCheckpoint extends CandidateTreeObservation {
  contract: 'requirements-assurance/v3-candidate-checkpoint';
  sha256: string;
}

export type CandidateTracking =
  | { contract: 'requirements-assurance/v3-candidate-tracking'; state: 'building'; baseRevision: string }
  | { contract: 'requirements-assurance/v3-candidate-tracking'; state: 'evidence-bound'; baseRevision: string; candidateSha256: string };

export interface ImplementationEvidenceResult {
  formatVersion: 3;
  kind: 'implementation-evidence-result';
  allocation: ContentRef;
  checks: { checkId: string; outcome: EvidenceOutcome }[];
  changeJustifications: { path: string; obligationIds: string[]; summary: string }[];
  limitations: string[];
  report: string;
}

export type ReviewVerification =
  | { kind: 'reproduced'; outcome: EvidenceOutcome }
  | { kind: 'relied-on-builder-evidence'; limitation: string };

export interface ImplementationReviewFinding {
  findingId: string;
  obligationIds: string[];
  locations: string[];
  category: 'correctness' | 'preservation' | 'evidence' | 'integration' | 'scope' | 'naming' | 'architecture' | 'traceability';
  evidence: string;
  consequence: string;
  requiredAction: string;
}

export interface ImplementationReviewResult {
  formatVersion: 3;
  kind: 'implementation-review-result';
  subject: { candidateSha256: string; verificationSha256: string };
  result: ReviewOutcome;
  obligationAssessments: ReviewAssessment[];
  checkAssessments: { checkId: string; result: ReviewOutcome; findingIds: string[]; verification: ReviewVerification }[];
  changedPathAssessments: { path: string; result: ReviewOutcome; findingIds: string[]; decisionIds: string[] }[];
  findings: ImplementationReviewFinding[];
  decisions: ReviewDecision[];
  report: string;
}

type DuplicateErrorCode = 'duplicate-field' | 'duplicate-identity';
type NonDuplicateErrorCode = Exclude<AssuranceErrorCode, DuplicateErrorCode>;

interface AssuranceErrorBase {
  recordPath: string;
  location: string;
  detail: string;
}

export type AssuranceError =
  | (AssuranceErrorBase & { code: DuplicateErrorCode; otherLocation: string })
  | (AssuranceErrorBase & { code: NonDuplicateErrorCode });

export interface AssuranceFileSnapshot {
  status: 'ok';
  path: string;
  bytes: Uint8Array;
  sha256: string;
}

export interface AssuranceReadFailure {
  status: 'error';
  path: string;
  code: 'missing' | 'unreadable' | 'io-failure' | 'path-escape';
  detail: string;
}

export type AssuranceSnapshot = AssuranceFileSnapshot | AssuranceReadFailure;

export interface ContentRef {
  path: string;
  sha256: string;
}

export interface DependencyRef extends ContentRef {
  role: 'source' | 'governance' | 'design' | 'allocation';
}

interface SourceRef {
  kind: 'document-section';
  path: string;
  fragment: string;
}

interface LowLevelRef {
  id: string;
  parentId: string;
}

interface RequirementRecord {
  formatVersion: 1;
  kind: 'requirement';
  requirementId: string;
  sources: SourceRef[];
  lowLevelRequirements: LowLevelRef[];
}

export interface BaselineManifestV1 {
  formatVersion: 1;
  kind: 'requirements-baseline-manifest';
  baselineId: string;
  target: { projectId: string; root: '.' };
  requirements: ContentRef[];
  dependencies: DependencyRef[];
  requiredDecisionIds: string[];
}

export interface BaselineManifestV2 {
  formatVersion: 2;
  kind: 'requirements-baseline-manifest';
  baselineId: string;
  target: { projectId: string; root: '.' };
  requirements: ContentRef[];
  dependencies: DependencyRef[];
  reviewObligationIds: string[];
  requiredDecisionIds: string[];
}

export type BaselineManifest = BaselineManifestV1 | BaselineManifestV2;

interface ReviewRecord {
  formatVersion: 1;
  kind: 'manual-requirements-review';
  reviewId: string;
  subject: ContentRef;
  author: RoleIdentity;
  reviewer: RoleIdentity;
  result: 'accepted' | 'rejected' | 'decision-required';
  completedAt: string;
  report: string;
}

export interface RoleIdentity {
  role: 'builder' | 'reviewer';
  provider: string;
  model: string;
  effort: string;
  runId: string;
}

export interface ApprovalRecord {
  formatVersion: 1;
  kind: 'requirements-baseline-approval';
  approvalId: string;
  subject: ContentRef;
  review: ContentRef;
  decision: 'approved' | 'rejected';
  approvedBy: ActorIdentity;
  recordedBy: ActorIdentity;
  authorityBasis: ContentRef;
  resolvedDecisions: { id: string; record: ContentRef }[];
  decidedAt: string;
  rationale: string;
}

export type ReviewOutcome = 'accepted' | 'refinement-required' | 'decision-required';
export interface ReviewAssessment {
  obligationId: string;
  result: ReviewOutcome;
  findingIds: string[];
  decisionIds: string[];
}
export interface ReviewFinding {
  findingId: string;
  obligationId: string;
  category: 'correctness' | 'completeness' | 'consistency' | 'feasibility' | 'verifiability' | 'necessity' | 'traceability' | 'naming' | 'architecture';
  evidence: string;
  consequence: string;
  requiredAction: string;
}
export interface ReviewDecision {
  decisionId: string;
  obligationIds: string[];
  question: string;
  options: { option: string; reward: string; risk: string }[];
  recommendation: string;
  blockingReason: string;
}
export interface RequirementsReviewResult {
  formatVersion: 2;
  kind: 'requirements-review-result';
  subject: ContentRef;
  result: ReviewOutcome;
  assessments: ReviewAssessment[];
  findings: ReviewFinding[];
  decisions: ReviewDecision[];
  report: string;
}
export interface RequirementsReviewRecord {
  formatVersion: 2;
  kind: 'requirements-review';
  reviewId: string;
  subject: ContentRef;
  author: { role: 'requirements-author'; provider: string; model: string; effort: string; runId: string };
  reviewer: { role: 'requirements-reviewer'; provider: string; model: string; effort: string; runId: string };
  independence: { invocations: 'separate'; providerDiversity: 'same-provider' | 'different-provider' };
  authorInputProvenance: RunInputProvenance;
  reviewerInputProvenance: RunInputProvenance;
  result: 'accepted';
  assessments: ReviewAssessment[];
  findings: ReviewFinding[];
  decisions: ReviewDecision[];
  completedAt: string;
  report: string;
}
export interface ApprovalRecordV2 {
  formatVersion: 2;
  kind: 'requirements-baseline-approval';
  approvalId: string;
  target: { projectId: string; root: '.' };
  subject: ContentRef;
  review: ContentRef;
  decision: 'approved';
  approvedBy: ActorIdentity;
  recordedBy: ActorIdentity;
  authorityBasis: ContentRef;
  resolvedDecisions: { id: string; record: ContentRef }[];
  decidedAt: string;
  rationale: string;
}

interface ActorIdentity {
  actorType: 'human' | 'operator';
  actorId: string;
}

export interface PersistedAssurance {
  contract: typeof STAGE1_CONTRACT;
  enforcement: typeof BASELINE_ADMISSION;
  manifest: ContentRef;
}

export interface RootedContentRef extends ContentRef {
  root: 'target' | 'prompt';
}

export interface PersistedAssuranceV2 {
  contract: typeof STAGE2_CONTRACT;
  enforcement: typeof REVIEWED_INPUTS;
  manifest: ContentRef;
  instructions: {
    shared: RootedContentRef;
    commonRole: RootedContentRef[];
    selectorRole: RootedContentRef[];
    builderRole: RootedContentRef[];
    reviewerRole: RootedContentRef[];
    challengerRole: RootedContentRef[];
    rebutterRole: RootedContentRef[];
  };
}

export type AnyPersistedAssurance = PersistedAssurance | PersistedAssuranceV2;

export interface BaselineAdmission {
  enforcement: typeof BASELINE_ADMISSION | typeof REVIEWED_INPUTS;
  manifest: ContentRef;
  baselineId: string;
  allocationPaths: readonly string[];
}

export type BaselineAdmissionResult =
  | { ok: true; admission: BaselineAdmission }
  | { ok: false; errors: AssuranceError[] };

export type BaselineCandidateResult =
  | { ok: true; candidate: { manifest: BaselineManifestV2; manifestRef: ContentRef; allocationPaths: readonly string[]; declaredObligationIds: readonly string[] } }
  | { ok: false; errors: AssuranceError[] };

export type ParsedRecord<T> =
  | { ok: true; value: T; errors: AssuranceError[] }
  | { ok: false; errors: AssuranceError[] };

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const H_ID = /^[A-Z][A-Z0-9-]*-REQ-[0-9]{3}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const FRAGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function error(
  code: DuplicateErrorCode,
  recordPath: string,
  location: string,
  detail: string,
  otherLocation: string
): AssuranceError;
function error(
  code: NonDuplicateErrorCode,
  recordPath: string,
  location: string,
  detail: string
): AssuranceError;
function error(
  code: AssuranceErrorCode,
  recordPath: string,
  location: string,
  detail: string,
  otherLocation?: string
): AssuranceError {
  const base = { code, recordPath, location, detail };
  if (code === 'duplicate-field' || code === 'duplicate-identity') {
    if (otherLocation === undefined) {
      throw new Error(`Duplicate assurance error '${code}' requires both locations.`);
    }
    return { ...base, code, otherLocation };
  }
  return { ...base, code };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pointer(parent: string, key: string | number): string {
  const escaped = String(key).replace(/~/g, '~0').replace(/\//g, '~1');
  return `${parent}/${escaped}`;
}

/**
 * Narrow `value` to an object while collecting closed-shape errors.
 *
 * A `true` result means only that `value` is an object. Missing and unknown
 * fields are appended to `errors` so callers can continue collecting other
 * diagnostics from an unambiguously decoded record.
 */
function isObjectAndCollectClosedFieldErrors(
  value: unknown,
  fields: readonly string[],
  recordPath: string,
  at: string,
  errors: AssuranceError[]
): value is Record<string, unknown> {
  if (!isObject(value)) {
    errors.push(error('invalid-field', recordPath, at || '/', 'expected an object'));
    return false;
  }
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(error('unknown-field', recordPath, pointer(at, key), `unknown field '${key}'`));
    }
  }
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      errors.push(error('invalid-field', recordPath, pointer(at, field), 'required field is missing'));
    }
  }
  return true;
}

function validString(value: unknown, allowEmpty = false): value is string {
  return (
    typeof value === 'string' &&
    !value.includes('\0') &&
    (allowEmpty || value.length > 0)
  );
}

function validAbsolutePath(value: unknown): value is string {
  return validString(value) && (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value));
}

function checkPath(
  value: unknown,
  recordPath: string,
  at: string,
  errors: AssuranceError[]
): value is string {
  if (!validString(value)) {
    errors.push(error('invalid-field', recordPath, at, 'expected a non-empty target-relative path string'));
    return false;
  }
  const segments = value.split('/');
  if (value.startsWith('/') || segments.some((part) => part === '.' || part === '..')) {
    errors.push(error('path-escape', recordPath, at, 'path is absolute or contains a traversal segment'));
    return false;
  }
  if (value.includes('\\') || segments.some((part) => part.length === 0)) {
    errors.push(error('invalid-field', recordPath, at, 'expected a target-relative POSIX file path'));
    return false;
  }
  return true;
}

function checkLiteralVersionKind(
  object: Record<string, unknown>,
  expectedVersion: 1 | 2,
  expectedKind: string,
  recordPath: string,
  errors: AssuranceError[]
): void {
  if (typeof object.formatVersion !== 'number' || !Number.isInteger(object.formatVersion)) {
    errors.push(error('invalid-field', recordPath, '/formatVersion', 'formatVersion must be an integer'));
  } else if (object.formatVersion !== expectedVersion) {
    errors.push(error('unsupported-version', recordPath, '/formatVersion', `unsupported formatVersion ${object.formatVersion}`));
  }
  if (typeof object.kind !== 'string') {
    errors.push(error('invalid-field', recordPath, '/kind', 'kind must be a string'));
  } else if (object.kind !== expectedKind) {
    errors.push(error('unsupported-kind', recordPath, '/kind', `unsupported kind '${object.kind}'`));
  }
}

/**
 * Finds duplicate members in each JSON object before JSON.parse can apply its
 * last-member-wins behavior. JSON.parse remains the grammar authority; this
 * scanner only tracks object/array structure and decoded string keys.
 */
function duplicateJsonFields(raw: string, recordPath: string): AssuranceError[] {
  const errors: AssuranceError[] = [];
  let i = 0;

  function ws(): void {
    while (/\s/.test(raw[i] ?? '')) i += 1;
  }
  function stringToken(): { value: string; line: number } | undefined {
    if (raw[i] !== '"') return undefined;
    const start = i;
    const line = raw.slice(0, start).split('\n').length;
    i += 1;
    let escaped = false;
    while (i < raw.length) {
      const c = raw[i];
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        i += 1;
        try {
          return { value: JSON.parse(raw.slice(start, i)) as string, line };
        } catch {
          return undefined;
        }
      }
      i += 1;
    }
    return undefined;
  }
  function primitive(): void {
    while (i < raw.length && !/[\s,\]}]/.test(raw[i] ?? '')) i += 1;
  }
  function value(at: string): void {
    ws();
    if (raw[i] === '{') object(at);
    else if (raw[i] === '[') array(at);
    else if (raw[i] === '"') void stringToken();
    else primitive();
  }
  function array(at: string): void {
    i += 1;
    ws();
    let index = 0;
    while (i < raw.length && raw[i] !== ']') {
      value(pointer(at, index));
      ws();
      if (raw[i] === ',') {
        i += 1;
        index += 1;
      } else break;
    }
    if (raw[i] === ']') i += 1;
  }
  function object(at: string): void {
    i += 1;
    ws();
    const seen = new Map<string, string>();
    while (i < raw.length && raw[i] !== '}') {
      const key = stringToken();
      if (!key) return;
      const keyPointer = pointer(at, key.value);
      const first = seen.get(key.value);
      if (first !== undefined) {
        errors.push(error('duplicate-field', recordPath, `line ${key.line} (${keyPointer})`, `duplicate JSON member '${key.value}'`, first));
      } else {
        seen.set(key.value, `line ${key.line} (${keyPointer})`);
      }
      ws();
      if (raw[i] !== ':') return;
      i += 1;
      value(keyPointer);
      ws();
      if (raw[i] === ',') i += 1;
      else break;
      ws();
    }
    if (raw[i] === '}') i += 1;
  }

  value('');
  return errors;
}

/**
 * Provider results are messages from one agent to the runtime (human ruling
 * 2026-09-13, TD-020): the framing around the JSON object — a leading sentence,
 * a Markdown fence, a trailing remark — is not an error. Return the first
 * balanced top-level JSON object found in `raw`; when `raw` already begins with
 * `{` or no balanced object exists, return `raw` unchanged so the strict parser
 * reports exactly what it always did. Strings and escapes are honoured, so
 * braces inside string values do not end the scan. Schema validation of the
 * extracted object is unchanged — only the wrapper is tolerated.
 */
export function extractProviderResultJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return raw;
  const start = raw.indexOf('{');
  if (start < 0) return raw;
  let depth = 0;
  let inString = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return raw;
}

/** Parse JSON under the v1 no-BOM/no-duplicate-member rules. */
export function parseAssuranceJson(raw: string, recordPath: string): ParsedRecord<unknown> {
  if (raw.startsWith('\uFEFF')) {
    return { ok: false, errors: [error('malformed-json', recordPath, 'line 1', 'UTF-8 byte order mark is not permitted')] };
  }
  const duplicates = duplicateJsonFields(raw, recordPath);
  try {
    const value = JSON.parse(raw) as unknown;
    return duplicates.length > 0
      ? { ok: false, errors: duplicates }
      : { ok: true, value, errors: [] };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, errors: [...duplicates, error('malformed-json', recordPath, '/', detail)] };
  }
}

function decodeSnapshot(
  snapshot: AssuranceFileSnapshot,
  errors: AssuranceError[]
): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(snapshot.bytes);
  } catch {
    errors.push(error('io-failure', snapshot.path, '/', 'file is not valid UTF-8'));
    return undefined;
  }
}

function decodeJsonBearingSnapshot(
  snapshot: AssuranceFileSnapshot,
  errors: AssuranceError[]
): string | undefined {
  if (
    snapshot.bytes.length >= 3 &&
    snapshot.bytes[0] === 0xef &&
    snapshot.bytes[1] === 0xbb &&
    snapshot.bytes[2] === 0xbf
  ) {
    errors.push(error('malformed-json', snapshot.path, 'line 1', 'UTF-8 byte order mark is not permitted'));
    return undefined;
  }
  return decodeSnapshot(snapshot, errors);
}

function parseContentRef(
  value: unknown,
  recordPath: string,
  at: string,
  errors: AssuranceError[]
): ContentRef | undefined {
  if (!isObjectAndCollectClosedFieldErrors(value, ['path', 'sha256'], recordPath, at, errors)) return undefined;
  const pathOk = checkPath(value.path, recordPath, pointer(at, 'path'), errors);
  const hashOk = typeof value.sha256 === 'string' && SHA256.test(value.sha256);
  if (!hashOk) errors.push(error('invalid-field', recordPath, pointer(at, 'sha256'), 'expected sha256:<64 lowercase hex>'));
  return pathOk && hashOk ? { path: value.path as string, sha256: value.sha256 as string } : undefined;
}

function checkId(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): value is string {
  if (typeof value !== 'string' || !ID.test(value) || value.includes('\0')) {
    errors.push(error('invalid-field', recordPath, at, 'invalid identifier'));
    return false;
  }
  return true;
}

function checkTimestamp(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): void {
  if (
    typeof value !== 'string' ||
    !TIMESTAMP.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    errors.push(error('invalid-field', recordPath, at, 'expected UTC RFC 3339 timestamp with milliseconds'));
  }
}

function duplicateValues(
  values: readonly IdentityCandidate[],
  recordPath: string,
  errors: AssuranceError[]
): void {
  const seen = new Map<string, string>();
  for (const item of values) {
    const first = seen.get(item.value);
    if (first !== undefined) {
      errors.push(error('duplicate-identity', recordPath, item.location, `duplicate identity '${item.value}'`, first));
    } else seen.set(item.value, item.location);
  }
}

interface IdentityCandidate {
  value: string;
  location: string;
}

function stringMemberIdentities(
  value: unknown,
  member: string,
  arrayLocation: string
): IdentityCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) =>
    isObject(item) && typeof item[member] === 'string'
      ? [{ value: item[member] as string, location: `${arrayLocation}/${index}/${member}` }]
      : []
  );
}

export function parseBaselineManifest(snapshot: AssuranceFileSnapshot): ParsedRecord<BaselineManifest> {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  if (content === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(content, snapshot.path);
  if (!parsed.ok) return parsed;
  const errors = [...parsed.errors];
  const rawValue = parsed.value;
  if (isObject(rawValue)) {
    duplicateValues([
      ...stringMemberIdentities(rawValue.requirements, 'path', '/requirements'),
      ...stringMemberIdentities(rawValue.dependencies, 'path', '/dependencies'),
    ], snapshot.path, errors);
    duplicateValues(
      Array.isArray(rawValue.requiredDecisionIds)
        ? rawValue.requiredDecisionIds.flatMap((item, index) =>
          typeof item === 'string' ? [{ value: item, location: `/requiredDecisionIds/${index}` }] : []
        )
        : [],
      snapshot.path,
      errors
    );
  }
  const version = isObject(rawValue) && rawValue.formatVersion === 2 ? 2 : 1;
  const fields = version === 2
    ? ['formatVersion', 'kind', 'baselineId', 'target', 'requirements', 'dependencies', 'reviewObligationIds', 'requiredDecisionIds']
    : ['formatVersion', 'kind', 'baselineId', 'target', 'requirements', 'dependencies', 'requiredDecisionIds'];
  if (!isObjectAndCollectClosedFieldErrors(rawValue, fields, snapshot.path, '', errors)) {
    return { ok: false, errors };
  }
  const value = rawValue;
  checkLiteralVersionKind(value, version, 'requirements-baseline-manifest', snapshot.path, errors);
  const baselineOk = checkId(value.baselineId, snapshot.path, '/baselineId', errors);

  let targetOk = false;
  if (isObjectAndCollectClosedFieldErrors(value.target, ['projectId', 'root'], snapshot.path, '/target', errors)) {
    const projectOk = checkId(value.target.projectId, snapshot.path, '/target/projectId', errors);
    if (value.target.root !== '.') errors.push(error('invalid-field', snapshot.path, '/target/root', "root must equal '.'"));
    targetOk = projectOk && value.target.root === '.';
  }

  const requirements: ContentRef[] = [];
  if (!Array.isArray(value.requirements) || value.requirements.length === 0) {
    errors.push(error('invalid-field', snapshot.path, '/requirements', 'requirements must be a non-empty array'));
  } else {
    value.requirements.forEach((item, index) => {
      const ref = parseContentRef(item, snapshot.path, `/requirements/${index}`, errors);
      if (ref) requirements.push(ref);
    });
  }

  const dependencies: DependencyRef[] = [];
  if (!Array.isArray(value.dependencies) || value.dependencies.length === 0) {
    errors.push(error('invalid-field', snapshot.path, '/dependencies', 'dependencies must be a non-empty array'));
  } else {
    value.dependencies.forEach((item, index) => {
      const at = `/dependencies/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['role', 'path', 'sha256'], snapshot.path, at, errors)) return;
      const roleOk = item.role === 'source' || item.role === 'governance' || item.role === 'design' || item.role === 'allocation';
      if (!roleOk) errors.push(error('invalid-field', snapshot.path, `${at}/role`, 'unsupported dependency role'));
      const ref = parseContentRef({ path: item.path, sha256: item.sha256 }, snapshot.path, at, errors);
      if (roleOk && ref) dependencies.push({ role: item.role as DependencyRef['role'], ...ref });
    });
  }

  const decisions: string[] = [];
  if (!Array.isArray(value.requiredDecisionIds)) {
    errors.push(error('invalid-field', snapshot.path, '/requiredDecisionIds', 'requiredDecisionIds must be an array'));
  } else {
    value.requiredDecisionIds.forEach((item, index) => {
      if (checkId(item, snapshot.path, `/requiredDecisionIds/${index}`, errors)) decisions.push(item);
    });
  }
  const reviewObligationIds: string[] = [];
  if (version === 2) {
    duplicateValues(
      Array.isArray(value.reviewObligationIds)
        ? value.reviewObligationIds.flatMap((item, index) => typeof item === 'string' ? [{ value: item, location: `/reviewObligationIds/${index}` }] : [])
        : [],
      snapshot.path,
      errors
    );
    if (!Array.isArray(value.reviewObligationIds) || value.reviewObligationIds.length === 0) {
      errors.push(error('invalid-field', snapshot.path, '/reviewObligationIds', 'reviewObligationIds must be a non-empty array'));
    } else {
      value.reviewObligationIds.forEach((item, index) => {
        if (typeof item !== 'string' || (!H_ID.test(item) && !/^[A-Z][A-Z0-9-]*-REQ-[0-9]{3}-L[0-9]{2}$/.test(item))) {
          errors.push(error('invalid-field', snapshot.path, `/reviewObligationIds/${index}`, 'expected an H or L obligation identifier'));
        } else reviewObligationIds.push(item);
      });
    }
  }
  if (!baselineOk || !targetOk || errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: version === 1 ? {
      formatVersion: 1 as const,
      kind: 'requirements-baseline-manifest',
      baselineId: value.baselineId as string,
      target: value.target as { projectId: string; root: '.' },
      requirements,
      dependencies,
      requiredDecisionIds: decisions,
    } : {
      formatVersion: 2 as const,
      kind: 'requirements-baseline-manifest',
      baselineId: value.baselineId as string,
      target: value.target as { projectId: string; root: '.' },
      requirements,
      dependencies,
      reviewObligationIds,
      requiredDecisionIds: decisions,
    },
    errors,
  };
}

function parseRoleIdentity(
  value: unknown,
  expectedRole: 'builder' | 'reviewer',
  recordPath: string,
  at: string,
  errors: AssuranceError[]
): RoleIdentity | undefined {
  if (!isObjectAndCollectClosedFieldErrors(value, ['role', 'provider', 'model', 'effort', 'runId'], recordPath, at, errors)) return undefined;
  let ok = true;
  if (value.role !== expectedRole) {
    errors.push(error('invalid-field', recordPath, `${at}/role`, `role must equal '${expectedRole}'`));
    ok = false;
  }
  for (const field of ['provider', 'model', 'effort'] as const) {
    if (!validString(value[field])) {
      errors.push(error('invalid-field', recordPath, `${at}/${field}`, `${field} must be a non-empty string`));
      ok = false;
    }
  }
  if (!checkId(value.runId, recordPath, `${at}/runId`, errors)) ok = false;
  return ok ? value as unknown as RoleIdentity : undefined;
}

function parseReview(snapshot: AssuranceFileSnapshot): ParsedRecord<ReviewRecord> {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  if (content === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(content, snapshot.path);
  if (!parsed.ok) return parsed;
  const errors = [...parsed.errors];
  const rawValue = parsed.value;
  if (isObject(rawValue)) {
    const authorRunId = isObject(rawValue.author) && typeof rawValue.author.runId === 'string' ? rawValue.author.runId : undefined;
    const reviewerRunId = isObject(rawValue.reviewer) && typeof rawValue.reviewer.runId === 'string' ? rawValue.reviewer.runId : undefined;
    if (authorRunId !== undefined && reviewerRunId === authorRunId) {
      errors.push(error('duplicate-identity', snapshot.path, '/reviewer/runId', 'author and reviewer runId must differ', '/author/runId'));
    }
  }
  if (!isObjectAndCollectClosedFieldErrors(rawValue, ['formatVersion', 'kind', 'reviewId', 'subject', 'author', 'reviewer', 'result', 'completedAt', 'report'], snapshot.path, '', errors)) return { ok: false, errors };
  const value = rawValue;
  checkLiteralVersionKind(value, 1, 'manual-requirements-review', snapshot.path, errors);
  const idOk = checkId(value.reviewId, snapshot.path, '/reviewId', errors);
  const subject = parseContentRef(value.subject, snapshot.path, '/subject', errors);
  const author = parseRoleIdentity(value.author, 'builder', snapshot.path, '/author', errors);
  const reviewer = parseRoleIdentity(value.reviewer, 'reviewer', snapshot.path, '/reviewer', errors);
  const resultOk = value.result === 'accepted' || value.result === 'rejected' || value.result === 'decision-required';
  if (!resultOk) errors.push(error('invalid-field', snapshot.path, '/result', 'unsupported review result'));
  checkTimestamp(value.completedAt, snapshot.path, '/completedAt', errors);
  if (!validString(value.report)) errors.push(error('invalid-field', snapshot.path, '/report', 'report must be a non-empty string'));
  if (!idOk || !subject || !author || !reviewer || !resultOk || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: value as unknown as ReviewRecord, errors };
}

function parseActor(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): ActorIdentity | undefined {
  if (!isObjectAndCollectClosedFieldErrors(value, ['actorType', 'actorId'], recordPath, at, errors)) return undefined;
  const typeOk = value.actorType === 'human' || value.actorType === 'operator';
  if (!typeOk) errors.push(error('invalid-field', recordPath, `${at}/actorType`, "actorType must be 'human' or 'operator'"));
  const idOk = checkId(value.actorId, recordPath, `${at}/actorId`, errors);
  return typeOk && idOk ? value as unknown as ActorIdentity : undefined;
}

export function parseApprovalRecord(snapshot: AssuranceFileSnapshot): ParsedRecord<ApprovalRecord> {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  if (content === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(content, snapshot.path);
  if (!parsed.ok) return parsed;
  const errors = [...parsed.errors];
  const rawValue = parsed.value;
  if (isObject(rawValue)) {
    duplicateValues(stringMemberIdentities(rawValue.resolvedDecisions, 'id', '/resolvedDecisions'), snapshot.path, errors);
  }
  if (!isObjectAndCollectClosedFieldErrors(rawValue, ['formatVersion', 'kind', 'approvalId', 'subject', 'review', 'decision', 'approvedBy', 'recordedBy', 'authorityBasis', 'resolvedDecisions', 'decidedAt', 'rationale'], snapshot.path, '', errors)) return { ok: false, errors };
  const value = rawValue;
  checkLiteralVersionKind(value, 1, 'requirements-baseline-approval', snapshot.path, errors);
  const idOk = checkId(value.approvalId, snapshot.path, '/approvalId', errors);
  const subject = parseContentRef(value.subject, snapshot.path, '/subject', errors);
  const review = parseContentRef(value.review, snapshot.path, '/review', errors);
  const approvedBy = parseActor(value.approvedBy, snapshot.path, '/approvedBy', errors);
  const recordedBy = parseActor(value.recordedBy, snapshot.path, '/recordedBy', errors);
  const authorityBasis = parseContentRef(value.authorityBasis, snapshot.path, '/authorityBasis', errors);
  const decisionOk = value.decision === 'approved' || value.decision === 'rejected';
  if (!decisionOk) errors.push(error('invalid-field', snapshot.path, '/decision', 'unsupported approval decision'));
  const resolvedDecisions: { id: string; record: ContentRef }[] = [];
  if (!Array.isArray(value.resolvedDecisions)) {
    errors.push(error('invalid-field', snapshot.path, '/resolvedDecisions', 'resolvedDecisions must be an array'));
  } else {
    value.resolvedDecisions.forEach((item, index) => {
      const at = `/resolvedDecisions/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['id', 'record'], snapshot.path, at, errors)) return;
      const decisionIdOk = checkId(item.id, snapshot.path, `${at}/id`, errors);
      const record = parseContentRef(item.record, snapshot.path, `${at}/record`, errors);
      if (decisionIdOk && record) resolvedDecisions.push({ id: item.id as string, record });
    });
  }
  checkTimestamp(value.decidedAt, snapshot.path, '/decidedAt', errors);
  if (!validString(value.rationale)) errors.push(error('invalid-field', snapshot.path, '/rationale', 'rationale must be a non-empty string'));
  if (!idOk || !subject || !review || !approvedBy || !recordedBy || !authorityBasis || !decisionOk || errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...(value as unknown as ApprovalRecord),
      resolvedDecisions,
    },
    errors,
  };
}

const REVIEW_OUTCOMES = new Set<ReviewOutcome>(['accepted', 'refinement-required', 'decision-required']);
const FINDING_CATEGORIES = new Set<ReviewFinding['category']>(['correctness', 'completeness', 'consistency', 'feasibility', 'verifiability', 'necessity', 'traceability', 'naming', 'architecture']);
const INPUT_PURPOSES = new Set(['shared-instruction', 'common-role-instruction', 'baseline-manifest', 'requirement', 'source', 'governance', 'design', 'allocation', 'review', 'approval', 'authority', 'decision', 'role-instruction', 'selection-packet', 'review-subject', 'build-report', 'prior-review', 'task-directive']);

function parseIdArray(value: unknown, recordPath: string, at: string, errors: AssuranceError[], allowEmpty: boolean): string[] {
  const values: string[] = [];
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push(error('invalid-field', recordPath, at, `expected ${allowEmpty ? 'an' : 'a non-empty'} array`));
    return values;
  }
  value.forEach((item, index) => {
    if (checkId(item, recordPath, `${at}/${index}`, errors)) values.push(item);
  });
  duplicateValues(values.map((item, index) => ({ value: item, location: `${at}/${index}` })), recordPath, errors);
  return values;
}

function parseReviewPayload(
  value: Record<string, unknown>,
  recordPath: string,
  expectedIds: readonly string[],
  errors: AssuranceError[]
): Pick<RequirementsReviewResult, 'result' | 'assessments' | 'findings' | 'decisions' | 'report'> | undefined {
  const expected = new Set(expectedIds);
  const assessments: ReviewAssessment[] = [];
  const findings: ReviewFinding[] = [];
  const decisions: ReviewDecision[] = [];
  const resultOk = typeof value.result === 'string' && REVIEW_OUTCOMES.has(value.result as ReviewOutcome);
  if (!resultOk) errors.push(error('invalid-field', recordPath, '/result', 'unsupported requirements-review outcome'));

  if (!Array.isArray(value.assessments) || value.assessments.length === 0) {
    errors.push(error('invalid-field', recordPath, '/assessments', 'assessments must be a non-empty array'));
  } else {
    duplicateValues(stringMemberIdentities(value.assessments, 'obligationId', '/assessments'), recordPath, errors);
    value.assessments.forEach((item, index) => {
      const at = `/assessments/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['obligationId', 'result', 'findingIds', 'decisionIds'], recordPath, at, errors)) return;
      const obligationOk = typeof item.obligationId === 'string' && (H_ID.test(item.obligationId) || /^[A-Z][A-Z0-9-]*-REQ-[0-9]{3}-L[0-9]{2}$/.test(item.obligationId));
      if (!obligationOk) errors.push(error('invalid-field', recordPath, `${at}/obligationId`, 'invalid obligation identifier'));
      else if (!expected.has(item.obligationId as string)) errors.push(error('review-coverage-unknown', recordPath, `${at}/obligationId`, `obligation '${item.obligationId}' is outside the submitted review scope`));
      const assessmentResultOk = typeof item.result === 'string' && REVIEW_OUTCOMES.has(item.result as ReviewOutcome);
      if (!assessmentResultOk) errors.push(error('invalid-field', recordPath, `${at}/result`, 'unsupported assessment outcome'));
      const findingIds = parseIdArray(item.findingIds, recordPath, `${at}/findingIds`, errors, true);
      const decisionIds = parseIdArray(item.decisionIds, recordPath, `${at}/decisionIds`, errors, true);
      if (assessmentResultOk) {
        if (item.result === 'accepted' && (findingIds.length > 0 || decisionIds.length > 0)) errors.push(error('review-result-mismatch', recordPath, at, 'accepted assessment cannot reference findings or decisions'));
        if (item.result === 'refinement-required' && (findingIds.length === 0 || decisionIds.length > 0)) errors.push(error('review-result-mismatch', recordPath, at, 'refinement-required assessment needs findings and no decisions'));
        if (item.result === 'decision-required' && decisionIds.length === 0) errors.push(error('review-result-mismatch', recordPath, at, 'decision-required assessment needs at least one decision'));
      }
      if (obligationOk && assessmentResultOk) assessments.push({ obligationId: item.obligationId as string, result: item.result as ReviewOutcome, findingIds, decisionIds });
    });
  }
  const covered = new Set(assessments.map((assessment) => assessment.obligationId));
  for (const id of expectedIds) if (!covered.has(id)) errors.push(error('review-coverage-missing', recordPath, '/assessments', `submitted obligation '${id}' has no assessment`));

  if (!Array.isArray(value.findings)) errors.push(error('invalid-field', recordPath, '/findings', 'findings must be an array'));
  else {
    duplicateValues(stringMemberIdentities(value.findings, 'findingId', '/findings'), recordPath, errors);
    value.findings.forEach((item, index) => {
      const at = `/findings/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['findingId', 'obligationId', 'category', 'evidence', 'consequence', 'requiredAction'], recordPath, at, errors)) return;
      const idOk = checkId(item.findingId, recordPath, `${at}/findingId`, errors);
      const obligationOk = typeof item.obligationId === 'string' && expected.has(item.obligationId);
      if (!obligationOk) errors.push(error('review-coverage-unknown', recordPath, `${at}/obligationId`, 'finding obligation is outside the submitted review scope'));
      const categoryOk = typeof item.category === 'string' && FINDING_CATEGORIES.has(item.category as ReviewFinding['category']);
      if (!categoryOk) errors.push(error('invalid-field', recordPath, `${at}/category`, 'unsupported finding category'));
      let proseOk = true;
      for (const field of ['evidence', 'consequence', 'requiredAction'] as const) if (!validString(item[field])) { errors.push(error('invalid-field', recordPath, `${at}/${field}`, `${field} must be non-empty`)); proseOk = false; }
      if (idOk && obligationOk && categoryOk && proseOk) findings.push(item as unknown as ReviewFinding);
    });
  }

  if (!Array.isArray(value.decisions)) errors.push(error('invalid-field', recordPath, '/decisions', 'decisions must be an array'));
  else {
    duplicateValues(stringMemberIdentities(value.decisions, 'decisionId', '/decisions'), recordPath, errors);
    value.decisions.forEach((item, index) => {
      const at = `/decisions/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['decisionId', 'obligationIds', 'question', 'options', 'recommendation', 'blockingReason'], recordPath, at, errors)) return;
      const idOk = checkId(item.decisionId, recordPath, `${at}/decisionId`, errors);
      const obligationIds = parseIdArray(item.obligationIds, recordPath, `${at}/obligationIds`, errors, false);
      for (const id of obligationIds) if (!expected.has(id)) errors.push(error('review-coverage-unknown', recordPath, `${at}/obligationIds`, `decision obligation '${id}' is outside the submitted review scope`));
      const options: ReviewDecision['options'] = [];
      if (!Array.isArray(item.options) || item.options.length === 0) errors.push(error('invalid-field', recordPath, `${at}/options`, 'options must be a non-empty array'));
      else {
        duplicateValues(stringMemberIdentities(item.options, 'option', `${at}/options`), recordPath, errors);
        item.options.forEach((option, optionIndex) => {
          const oat = `${at}/options/${optionIndex}`;
          if (!isObjectAndCollectClosedFieldErrors(option, ['option', 'reward', 'risk'], recordPath, oat, errors)) return;
          if (validString(option.option) && validString(option.reward) && validString(option.risk)) options.push(option as unknown as ReviewDecision['options'][number]);
          else errors.push(error('invalid-field', recordPath, oat, 'option, reward and risk must be non-empty strings'));
        });
      }
      const proseOk = validString(item.question) && validString(item.recommendation) && validString(item.blockingReason);
      if (!proseOk) errors.push(error('invalid-field', recordPath, at, 'question, recommendation and blockingReason must be non-empty strings'));
      if (typeof item.recommendation === 'string' && !options.some((option) => option.option === item.recommendation)) errors.push(error('review-result-mismatch', recordPath, `${at}/recommendation`, 'recommendation must name one option'));
      if (idOk && obligationIds.length > 0 && options.length > 0 && proseOk) decisions.push({ ...(item as unknown as ReviewDecision), obligationIds, options });
    });
  }

  const findingIds = new Set(findings.map((finding) => finding.findingId));
  const decisionIds = new Set(decisions.map((decision) => decision.decisionId));
  const referencedFindings = new Set(assessments.flatMap((assessment) => assessment.findingIds));
  const referencedDecisions = new Set(assessments.flatMap((assessment) => assessment.decisionIds));
  for (const id of referencedFindings) if (!findingIds.has(id)) errors.push(error('review-result-mismatch', recordPath, '/assessments', `referenced finding '${id}' does not exist`));
  for (const id of referencedDecisions) if (!decisionIds.has(id)) errors.push(error('review-result-mismatch', recordPath, '/assessments', `referenced decision '${id}' does not exist`));
  for (const id of findingIds) if (!referencedFindings.has(id)) errors.push(error('review-result-mismatch', recordPath, '/findings', `finding '${id}' is not referenced by an assessment`));
  for (const id of decisionIds) if (!referencedDecisions.has(id)) errors.push(error('review-result-mismatch', recordPath, '/decisions', `decision '${id}' is not referenced by an assessment`));

  const aggregate: ReviewOutcome = assessments.some((a) => a.result === 'decision-required')
    ? 'decision-required'
    : assessments.some((a) => a.result === 'refinement-required') ? 'refinement-required' : 'accepted';
  if (resultOk && value.result !== aggregate) errors.push(error('review-result-mismatch', recordPath, '/result', `result '${String(value.result)}' does not equal aggregate '${aggregate}'`));
  if (!validString(value.report)) errors.push(error('invalid-field', recordPath, '/report', 'report must be a non-empty string'));
  if (!resultOk || !validString(value.report)) return undefined;
  return { result: value.result as ReviewOutcome, assessments, findings, decisions, report: value.report };
}

/** Parse and validate the provider's complete v2 requirements-review artifact. */
export function parseRequirementsReviewResult(snapshot: AssuranceFileSnapshot, expectedSubject: ContentRef, expectedIds: readonly string[]): ParsedRecord<RequirementsReviewResult> {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  if (content === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(content, snapshot.path);
  if (!parsed.ok) return parsed;
  const errors: AssuranceError[] = [];
  if (!isObjectAndCollectClosedFieldErrors(parsed.value, ['formatVersion', 'kind', 'subject', 'result', 'assessments', 'findings', 'decisions', 'report'], snapshot.path, '', errors)) return { ok: false, errors };
  const value = parsed.value;
  checkLiteralVersionKind(value, 2, 'requirements-review-result', snapshot.path, errors);
  const subject = parseContentRef(value.subject, snapshot.path, '/subject', errors);
  if (subject && !sameRef(subject, expectedSubject)) errors.push(error('subject-mismatch', snapshot.path, '/subject', 'review result subject does not equal the candidate manifest snapshot'));
  const payload = parseReviewPayload(value, snapshot.path, expectedIds, errors);
  if (!subject || !payload || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { formatVersion: 2, kind: 'requirements-review-result', subject, ...payload }, errors };
}

function parseInputProvenance(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): RunInputProvenance | undefined {
  if (!isObjectAndCollectClosedFieldErrors(value, ['contract', 'roots', 'baseline', 'commonInputs', 'roleSpecificInputs', 'channels'], recordPath, at, errors)) return undefined;
  let ok = true;
  if (value.contract !== 'requirements-assurance/v2-input-delivery') { errors.push(error('unsupported-version', recordPath, `${at}/contract`, 'unsupported input provenance contract')); ok = false; }
  if (!isObjectAndCollectClosedFieldErrors(value.roots, ['target', 'prompt'], recordPath, `${at}/roots`, errors) || !validAbsolutePath(value.roots.target) || !validAbsolutePath(value.roots.prompt)) { errors.push(error('invalid-field', recordPath, `${at}/roots`, 'roots must contain absolute target and prompt paths')); ok = false; }
  const baseline = parseContentRef(value.baseline, recordPath, `${at}/baseline`, errors);
  const parseInputs = (raw: unknown, where: string): RunInputProvenance['commonInputs'] => {
    const out: RunInputProvenance['commonInputs'][number][] = [];
    if (!Array.isArray(raw) || raw.length === 0) { errors.push(error('invalid-field', recordPath, where, 'input identities must be a non-empty array')); return out; }
    raw.forEach((item, index) => {
      const iat = `${where}/${index}`;
      if (!isObject(item)) { errors.push(error('invalid-field', recordPath, iat, 'input identity must be an object')); return; }
      const origin = item.origin;
      const fields = origin === 'file' ? ['origin', 'root', 'purpose', 'path', 'sha256', 'byteLength'] : ['origin', 'purpose', 'label', 'sha256', 'byteLength'];
      if (!isObjectAndCollectClosedFieldErrors(item, fields, recordPath, iat, errors)) return;
      const purposeOk = typeof item.purpose === 'string' && INPUT_PURPOSES.has(item.purpose);
      const hashOk = typeof item.sha256 === 'string' && SHA256.test(item.sha256);
      const lengthOk = typeof item.byteLength === 'number' && Number.isInteger(item.byteLength) && item.byteLength >= 0;
      if (!purposeOk || !hashOk || !lengthOk) errors.push(error('invalid-field', recordPath, iat, 'invalid input purpose, digest or byteLength'));
      if (origin === 'file') {
        const rootOk = item.root === 'target' || item.root === 'prompt';
        const pathOk = checkPath(item.path, recordPath, `${iat}/path`, errors);
        if (!rootOk) errors.push(error('invalid-field', recordPath, `${iat}/root`, 'root must be target or prompt'));
        if (purposeOk && hashOk && lengthOk && rootOk && pathOk) out.push(item as unknown as RunInputProvenance['commonInputs'][number]);
      } else if (origin === 'generated') {
        if (!validString(item.label)) errors.push(error('invalid-field', recordPath, `${iat}/label`, 'label must be non-empty'));
        else if (purposeOk && hashOk && lengthOk) out.push(item as unknown as RunInputProvenance['commonInputs'][number]);
      } else { errors.push(error('invalid-field', recordPath, `${iat}/origin`, 'origin must be file or generated')); }
    });
    return out;
  };
  const commonInputs = parseInputs(value.commonInputs, `${at}/commonInputs`);
  const roleSpecificInputs = parseInputs(value.roleSpecificInputs, `${at}/roleSpecificInputs`);
  const channels: RunInputProvenance['channels'][number][] = [];
  if (!Array.isArray(value.channels) || value.channels.length === 0) { errors.push(error('invalid-field', recordPath, `${at}/channels`, 'channels must be a non-empty array')); ok = false; }
  else {
    duplicateValues(stringMemberIdentities(value.channels, 'channel', `${at}/channels`), recordPath, errors);
    value.channels.forEach((item, index) => {
      const cat = `${at}/channels/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['channel', 'mechanism', 'sha256', 'byteLength'], recordPath, cat, errors)) return;
      if ((item.channel !== 'shared-instruction' && item.channel !== 'stdin') || !validString(item.mechanism) || typeof item.sha256 !== 'string' || !SHA256.test(item.sha256) || typeof item.byteLength !== 'number' || !Number.isInteger(item.byteLength) || item.byteLength < 0) errors.push(error('invalid-field', recordPath, cat, 'invalid channel identity'));
      else channels.push(item as unknown as RunInputProvenance['channels'][number]);
    });
  }
  if (!baseline || !ok || errors.length > 0) return undefined;
  const roots = value.roots as { target: string; prompt: string };
  return { contract: 'requirements-assurance/v2-input-delivery', roots, baseline, commonInputs, roleSpecificInputs, channels };
}

function parseRequirementsRole(value: unknown, role: 'requirements-author' | 'requirements-reviewer', recordPath: string, at: string, errors: AssuranceError[]): RequirementsReviewRecord['author'] | RequirementsReviewRecord['reviewer'] | undefined {
  if (!isObjectAndCollectClosedFieldErrors(value, ['role', 'provider', 'model', 'effort', 'runId'], recordPath, at, errors)) return undefined;
  let ok = true;
  if (value.role !== role) { errors.push(error('invalid-field', recordPath, `${at}/role`, `role must equal '${role}'`)); ok = false; }
  for (const field of ['provider', 'model', 'effort'] as const) if (!validString(value[field])) { errors.push(error('invalid-field', recordPath, `${at}/${field}`, `${field} must be non-empty`)); ok = false; }
  if (!checkId(value.runId, recordPath, `${at}/runId`, errors)) ok = false;
  return ok ? value as RequirementsReviewRecord['author'] : undefined;
}

/** Parse a published accepted v2 review and recheck its full per-ID payload. */
export function parseRequirementsReviewRecord(snapshot: AssuranceFileSnapshot, expectedIds: readonly string[]): ParsedRecord<RequirementsReviewRecord> {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  if (content === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(content, snapshot.path);
  if (!parsed.ok) return parsed;
  const errors: AssuranceError[] = [];
  const fields = ['formatVersion', 'kind', 'reviewId', 'subject', 'author', 'reviewer', 'independence', 'authorInputProvenance', 'reviewerInputProvenance', 'result', 'assessments', 'findings', 'decisions', 'completedAt', 'report'];
  if (!isObjectAndCollectClosedFieldErrors(parsed.value, fields, snapshot.path, '', errors)) return { ok: false, errors };
  const value = parsed.value;
  checkLiteralVersionKind(value, 2, 'requirements-review', snapshot.path, errors);
  const idOk = checkId(value.reviewId, snapshot.path, '/reviewId', errors);
  const subject = parseContentRef(value.subject, snapshot.path, '/subject', errors);
  const author = parseRequirementsRole(value.author, 'requirements-author', snapshot.path, '/author', errors) as RequirementsReviewRecord['author'] | undefined;
  const reviewer = parseRequirementsRole(value.reviewer, 'requirements-reviewer', snapshot.path, '/reviewer', errors) as RequirementsReviewRecord['reviewer'] | undefined;
  if (author && reviewer && author.runId === reviewer.runId) errors.push(error('duplicate-identity', snapshot.path, '/reviewer/runId', 'author and reviewer runId must differ', '/author/runId'));
  let independenceOk = false;
  if (isObjectAndCollectClosedFieldErrors(value.independence, ['invocations', 'providerDiversity'], snapshot.path, '/independence', errors)) {
    independenceOk = value.independence.invocations === 'separate' && (value.independence.providerDiversity === 'same-provider' || value.independence.providerDiversity === 'different-provider');
    if (!independenceOk) errors.push(error('invalid-field', snapshot.path, '/independence', 'invalid independence classification'));
    if (author && reviewer) {
      const expected = author.provider === reviewer.provider ? 'same-provider' : 'different-provider';
      if (value.independence.providerDiversity !== expected) errors.push(error('review-result-mismatch', snapshot.path, '/independence/providerDiversity', `provider diversity must equal '${expected}'`));
    }
  }
  const authorInputProvenance = parseInputProvenance(value.authorInputProvenance, snapshot.path, '/authorInputProvenance', errors);
  const reviewerInputProvenance = parseInputProvenance(value.reviewerInputProvenance, snapshot.path, '/reviewerInputProvenance', errors);
  if (reviewer && idOk && value.reviewId !== reviewer.runId) errors.push(error('subject-mismatch', snapshot.path, '/reviewId', 'reviewId must equal reviewer runId'));
  if (authorInputProvenance && reviewerInputProvenance && !sameInputContext(authorInputProvenance, reviewerInputProvenance)) errors.push(error('role-context-mismatch', snapshot.path, '/', 'author and reviewer accepted-baseline/common input identities differ'));
  const payload = parseReviewPayload(value, snapshot.path, expectedIds, errors);
  if (value.result !== 'accepted') errors.push(error('review-not-accepted', snapshot.path, '/result', `review result is '${String(value.result)}'`));
  checkTimestamp(value.completedAt, snapshot.path, '/completedAt', errors);
  if (!idOk || !subject || !author || !reviewer || !independenceOk || !authorInputProvenance || !reviewerInputProvenance || !payload || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { formatVersion: 2, kind: 'requirements-review', reviewId: value.reviewId as string, subject, author, reviewer, independence: value.independence as RequirementsReviewRecord['independence'], authorInputProvenance, reviewerInputProvenance, result: 'accepted', assessments: payload.assessments, findings: payload.findings, decisions: payload.decisions, completedAt: value.completedAt as string, report: payload.report }, errors };
}

export function parseApprovalRecordV2(snapshot: AssuranceFileSnapshot): ParsedRecord<ApprovalRecordV2> {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  if (content === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(content, snapshot.path);
  if (!parsed.ok) return parsed;
  const errors: AssuranceError[] = [];
  const rawValue = parsed.value;
  if (isObject(rawValue)) duplicateValues(stringMemberIdentities(rawValue.resolvedDecisions, 'id', '/resolvedDecisions'), snapshot.path, errors);
  const fields = ['formatVersion', 'kind', 'approvalId', 'target', 'subject', 'review', 'decision', 'approvedBy', 'recordedBy', 'authorityBasis', 'resolvedDecisions', 'decidedAt', 'rationale'];
  if (!isObjectAndCollectClosedFieldErrors(rawValue, fields, snapshot.path, '', errors)) return { ok: false, errors };
  const value = rawValue;
  checkLiteralVersionKind(value, 2, 'requirements-baseline-approval', snapshot.path, errors);
  const idOk = checkId(value.approvalId, snapshot.path, '/approvalId', errors);
  let targetOk = false;
  if (isObjectAndCollectClosedFieldErrors(value.target, ['projectId', 'root'], snapshot.path, '/target', errors)) targetOk = checkId(value.target.projectId, snapshot.path, '/target/projectId', errors) && value.target.root === '.';
  if (!targetOk) errors.push(error('invalid-field', snapshot.path, '/target', "target requires a valid projectId and root '.'"));
  const subject = parseContentRef(value.subject, snapshot.path, '/subject', errors);
  const review = parseContentRef(value.review, snapshot.path, '/review', errors);
  const approvedBy = parseActor(value.approvedBy, snapshot.path, '/approvedBy', errors);
  const recordedBy = parseActor(value.recordedBy, snapshot.path, '/recordedBy', errors);
  const authorityBasis = parseContentRef(value.authorityBasis, snapshot.path, '/authorityBasis', errors);
  if (value.decision !== 'approved') errors.push(error('approval-not-approved', snapshot.path, '/decision', `approval decision is '${String(value.decision)}'`));
  const resolvedDecisions: ApprovalRecordV2['resolvedDecisions'] = [];
  if (!Array.isArray(value.resolvedDecisions)) errors.push(error('invalid-field', snapshot.path, '/resolvedDecisions', 'resolvedDecisions must be an array'));
  else value.resolvedDecisions.forEach((item, index) => {
    const at = `/resolvedDecisions/${index}`;
    if (!isObjectAndCollectClosedFieldErrors(item, ['id', 'record'], snapshot.path, at, errors)) return;
    const did = checkId(item.id, snapshot.path, `${at}/id`, errors);
    const record = parseContentRef(item.record, snapshot.path, `${at}/record`, errors);
    if (did && record) resolvedDecisions.push({ id: item.id as string, record });
  });
  checkTimestamp(value.decidedAt, snapshot.path, '/decidedAt', errors);
  if (!validString(value.rationale)) errors.push(error('invalid-field', snapshot.path, '/rationale', 'rationale must be non-empty'));
  if (!idOk || !targetOk || !subject || !review || !approvedBy || !recordedBy || !authorityBasis || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { formatVersion: 2, kind: 'requirements-baseline-approval', approvalId: value.approvalId as string, target: value.target as ApprovalRecordV2['target'], subject, review, decision: 'approved', approvedBy, recordedBy, authorityBasis, resolvedDecisions, decidedAt: value.decidedAt as string, rationale: value.rationale as string }, errors };
}

function parseRequirement(snapshot: AssuranceFileSnapshot): ParsedRecord<RequirementRecord> & {
  highLevelIdentities: IdentityCandidate[];
  lowLevelIdentities: IdentityCandidate[];
  sourceCandidates: SourceRef[];
} {
  const decodeErrors: AssuranceError[] = [];
  const content = decodeJsonBearingSnapshot(snapshot, decodeErrors);
  let highLevelIdentities: IdentityCandidate[] = [];
  let lowLevelIdentities: IdentityCandidate[] = [];
  const sourceCandidates: SourceRef[] = [];
  if (content === undefined) {
    return { ok: false, errors: decodeErrors, highLevelIdentities, lowLevelIdentities, sourceCandidates };
  }
  const open = '<!-- requirements-assurance-v1\n';
  const close = '\n-->';
  const errors: AssuranceError[] = [];
  if (!content.startsWith(open)) {
    return {
      ok: false,
      errors: [error('metadata-delimiter', snapshot.path, 'line 1', 'metadata opening delimiter must begin at byte zero on its own line')],
      highLevelIdentities,
      lowLevelIdentities,
      sourceCandidates,
    };
  }
  const end = content.indexOf(close, open.length);
  const afterClose = end < 0 ? '' : content.slice(end + close.length, end + close.length + 1);
  if (
    end < 0 ||
    (afterClose !== '' && afterClose !== '\n') ||
    content.indexOf('<!-- requirements-assurance-v1', open.length) >= 0
  ) {
    return {
      ok: false,
      errors: [error('metadata-delimiter', snapshot.path, 'line 1', 'expected exactly one closed metadata block')],
      highLevelIdentities,
      lowLevelIdentities,
      sourceCandidates,
    };
  }
  const raw = content.slice(open.length, end);
  let depth = 0;
  let inString = false;
  let escaped = false;
  let jsonEnd = -1;
  const firstToken = raw.search(/\S/);
  if (firstToken >= 0) {
    for (let index = firstToken; index < raw.length; index += 1) {
      const character = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{' || character === '[') depth += 1;
      else if (character === '}' || character === ']') {
        depth -= 1;
        if (depth === 0) {
          jsonEnd = index + 1;
          break;
        }
      }
    }
  }
  if (jsonEnd >= 0 && raw.slice(jsonEnd).trim().length > 0) {
    return {
      ok: false,
      errors: [error('metadata-delimiter', snapshot.path, 'metadata block', 'non-whitespace text appears between the JSON object and closing delimiter')],
      highLevelIdentities,
      lowLevelIdentities,
      sourceCandidates,
    };
  }
  const metadata = parseAssuranceJson(raw, snapshot.path);
  if (!metadata.ok) {
    return { ...metadata, highLevelIdentities, lowLevelIdentities, sourceCandidates };
  }
  errors.push(...metadata.errors);
  const rawValue = metadata.value;
  if (isObject(rawValue)) {
    highLevelIdentities = typeof rawValue.requirementId === 'string'
      ? [{ value: rawValue.requirementId, location: '/requirementId' }]
      : [];
    lowLevelIdentities = stringMemberIdentities(
      rawValue.lowLevelRequirements,
      'id',
      '/lowLevelRequirements'
    );
  }
  if (!isObjectAndCollectClosedFieldErrors(rawValue, ['formatVersion', 'kind', 'requirementId', 'sources', 'lowLevelRequirements'], snapshot.path, '', errors)) {
    return { ok: false, errors, highLevelIdentities, lowLevelIdentities, sourceCandidates };
  }
  const value = rawValue;
  checkLiteralVersionKind(value, 1, 'requirement', snapshot.path, errors);
  const hOk = typeof value.requirementId === 'string' && H_ID.test(value.requirementId);
  if (!hOk) errors.push(error('invalid-field', snapshot.path, '/requirementId', 'invalid H requirement id'));

  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    errors.push(error('invalid-field', snapshot.path, '/sources', 'sources must be a non-empty array'));
  } else {
    value.sources.forEach((item, index) => {
      const at = `/sources/${index}`;
      const errorsBeforeSource = errors.length;
      if (!isObjectAndCollectClosedFieldErrors(item, ['kind', 'path', 'fragment'], snapshot.path, at, errors)) return;
      let ok = true;
      if (item.kind !== 'document-section') {
        errors.push(error('invalid-field', snapshot.path, `${at}/kind`, "source kind must equal 'document-section'"));
        ok = false;
      }
      if (!checkPath(item.path, snapshot.path, `${at}/path`, errors)) ok = false;
      if (typeof item.fragment !== 'string' || !FRAGMENT.test(item.fragment)) {
        errors.push(error('invalid-field', snapshot.path, `${at}/fragment`, 'invalid Markdown fragment'));
        ok = false;
      }
      if (ok && errors.length === errorsBeforeSource) {
        sourceCandidates.push(item as unknown as SourceRef);
      }
    });
  }
  duplicateValues(
    Array.isArray(value.sources)
      ? value.sources.flatMap((item, index) =>
        isObject(item) && typeof item.path === 'string' && typeof item.fragment === 'string'
          ? [{ value: `${item.path}#${item.fragment}`, location: `/sources/${index}` }]
          : []
      )
      : [],
    snapshot.path,
    errors
  );

  const lowLevelRequirements: LowLevelRef[] = [];
  if (!Array.isArray(value.lowLevelRequirements) || value.lowLevelRequirements.length === 0) {
    errors.push(error('invalid-field', snapshot.path, '/lowLevelRequirements', 'lowLevelRequirements must be a non-empty array'));
  } else {
    value.lowLevelRequirements.forEach((item, index) => {
      const at = `/lowLevelRequirements/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['id', 'parentId'], snapshot.path, at, errors)) return;
      const expectedPrefix = hOk ? `${value.requirementId as string}-L` : '';
      const idOk = typeof item.id === 'string' && new RegExp(`^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[0-9]{2}$`).test(item.id);
      if (!idOk) errors.push(error('invalid-field', snapshot.path, `${at}/id`, 'L id must be the parent H id followed by -L and two digits'));
      const parentOk = item.parentId === value.requirementId;
      if (!parentOk) errors.push(error('parent-mismatch', snapshot.path, `${at}/parentId`, 'L parentId does not equal requirementId'));
      if (idOk && parentOk) lowLevelRequirements.push(item as unknown as LowLevelRef);
    });
  }
  duplicateValues(stringMemberIdentities(value.lowLevelRequirements, 'id', '/lowLevelRequirements'), snapshot.path, errors);

  const markdown = content.slice(end + close.length);
  const linesBeforeMarkdown = content.slice(0, end + close.length).split('\n').length - 1;
  const headings = markdown.split('\n').map((line, index) => ({ line, number: linesBeforeMarkdown + index + 1 }));
  const firstH1 = headings.find((h) => /^#\s+/.test(h.line));
  if (!firstH1 || !hOk || !firstH1.line.startsWith(`# ${value.requirementId as string} —`)) {
    errors.push(error('heading-mismatch', snapshot.path, firstH1 ? `line ${firstH1.number}` : 'after metadata', 'first H1 does not match requirementId'));
  }
  const declared = headings.flatMap((h) => {
    const match = h.line.match(/^###\s+([A-Z][A-Z0-9-]*-REQ-[0-9]{3}-L[0-9]{2})\s+—/);
    return match?.[1] ? [{ value: match[1], location: `line ${h.number}` }] : [];
  });
  duplicateValues(declared, snapshot.path, errors);
  const metadataIds = new Set(lowLevelRequirements.map((l) => l.id));
  const headingIds = new Set(declared.map((d) => d.value));
  for (const id of metadataIds) if (!headingIds.has(id)) errors.push(error('heading-mismatch', snapshot.path, '/lowLevelRequirements', `metadata L '${id}' has no matching H3 heading`));
  for (const declaration of declared) if (!metadataIds.has(declaration.value)) errors.push(error('heading-mismatch', snapshot.path, declaration.location, `H3 '${declaration.value}' is absent from metadata`));

  if (!hOk || errors.length > 0) {
    return { ok: false, errors, highLevelIdentities, lowLevelIdentities, sourceCandidates };
  }
  return {
    ok: true,
    value: { formatVersion: 1, kind: 'requirement', requirementId: value.requirementId as string, sources: sourceCandidates, lowLevelRequirements },
    errors,
    highLevelIdentities,
    lowLevelIdentities,
    sourceCandidates,
  };
}

function slugHeading(text: string): string {
  let normalized = '';
  for (const character of text.trim()) {
    const code = character.charCodeAt(0);
    if (code >= 65 && code <= 90) normalized += character.toLowerCase();
    else if (
      code < 128 &&
      character !== ' ' &&
      character !== '-' &&
      ((code >= 33 && code <= 47) ||
        (code >= 58 && code <= 64) ||
        (code >= 91 && code <= 96) ||
        (code >= 123 && code <= 126))
    ) {
      continue;
    } else normalized += character;
  }
  return normalized.replace(/ +/g, '-').replace(/-+/g, '-');
}

function validateSource(
  source: SourceRef,
  requirementPath: string,
  sourceSnapshot: AssuranceFileSnapshot | undefined,
  errors: AssuranceError[]
): void {
  if (!sourceSnapshot) return;
  const decodeErrors: AssuranceError[] = [];
  const content = decodeSnapshot(sourceSnapshot, decodeErrors);
  if (content === undefined) {
    errors.push(...decodeErrors);
    return;
  }
  const matches = content.split('\n').flatMap((line, index) => {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    return heading !== undefined && slugHeading(heading) === source.fragment ? [index + 1] : [];
  });
  if (matches.length === 0) errors.push(error('source-not-found', requirementPath, '/sources', `source fragment '${source.path}#${source.fragment}' was not found`));
  else if (matches.length > 1) errors.push(error('source-ambiguous', requirementPath, '/sources', `source fragment '${source.path}#${source.fragment}' matched headings at lines ${matches.join(', ')}`));
}

function snapshotError(snapshot: AssuranceReadFailure): AssuranceError {
  return error(snapshot.code, snapshot.path, '/', snapshot.detail);
}

function sameRef(a: ContentRef, b: ContentRef): boolean {
  return a.path === b.path && a.sha256 === b.sha256;
}

/** Validate a v2 candidate and its upstream closure before any review exists. */
export function validateBaselineCandidate(args: {
  manifestPath: string;
  snapshots: readonly AssuranceSnapshot[];
  allocationPath: string;
  submittedObligationIds: readonly string[];
}): BaselineCandidateResult {
  const errors: AssuranceError[] = [];
  const byPath = new Map(args.snapshots.map((item) => [item.path, item]));
  const manifestSnapshot = byPath.get(args.manifestPath);
  if (!manifestSnapshot) return { ok: false, errors: [error('missing', args.manifestPath, '/', 'candidate manifest snapshot was not loaded')] };
  if (manifestSnapshot.status === 'error') return { ok: false, errors: [snapshotError(manifestSnapshot)] };
  const parsedManifest = parseBaselineManifest(manifestSnapshot);
  errors.push(...parsedManifest.errors);
  if (!parsedManifest.ok) return { ok: false, errors };
  if (parsedManifest.value.formatVersion !== 2) return { ok: false, errors: [error('unsupported-version', args.manifestPath, '/formatVersion', 'requirements review requires a v2 candidate manifest')] };
  const manifest = parsedManifest.value;
  const expectedPath = `docs/requirements/baselines/${manifest.baselineId}.json`;
  if (args.manifestPath !== expectedPath) errors.push(error('subject-mismatch', args.manifestPath, '/', `baselineId '${manifest.baselineId}' requires manifest path '${expectedPath}'`));
  for (const ref of [...manifest.requirements, ...manifest.dependencies]) {
    const input = byPath.get(ref.path);
    if (!input) errors.push(error('missing', ref.path, '/', 'referenced candidate input was not loaded'));
    else if (input.status === 'error') errors.push(snapshotError(input));
    else if (input.sha256 !== ref.sha256) errors.push(error('digest-mismatch', ref.path, '/', `computed ${input.sha256}; expected ${ref.sha256}`));
  }
  const high: IdentityCandidate[] = [];
  const low: IdentityCandidate[] = [];
  const requirementSources: { path: string; sources: SourceRef[] }[] = [];
  for (const ref of manifest.requirements) {
    const input = byPath.get(ref.path);
    if (!input || input.status === 'error') continue;
    const parsed = parseRequirement(input);
    errors.push(...parsed.errors);
    high.push(...parsed.highLevelIdentities.map((item) => ({ value: item.value, location: `${ref.path}#${item.location}` })));
    low.push(...parsed.lowLevelIdentities.map((item) => ({ value: item.value, location: `${ref.path}#${item.location}` })));
    requirementSources.push({ path: ref.path, sources: parsed.sourceCandidates });
  }
  duplicateValues(high, args.manifestPath, errors);
  duplicateValues(low, args.manifestPath, errors);
  const declared = [...high, ...low].map((item) => item.value);
  const declaredSet = new Set(declared);
  const scope = new Set(manifest.reviewObligationIds);
  for (const id of manifest.reviewObligationIds) {
    if (!declaredSet.has(id)) errors.push(error('review-coverage-unknown', args.manifestPath, '/reviewObligationIds', `obligation '${id}' is not declared by the candidate requirements`));
    const parent = id.match(/^(.+-REQ-[0-9]{3})-L[0-9]{2}$/)?.[1];
    if (parent && !scope.has(parent)) errors.push(error('review-coverage-missing', args.manifestPath, '/reviewObligationIds', `L obligation '${id}' requires parent '${parent}' in review scope`));
  }
  duplicateValues(args.submittedObligationIds.map((value, index) => ({ value, location: `selection.md#REVIEW_OBLIGATION_IDS/${index}` })), args.manifestPath, errors);
  const submitted = new Set(args.submittedObligationIds);
  for (const id of manifest.reviewObligationIds) if (!submitted.has(id)) errors.push(error('review-coverage-missing', args.manifestPath, '/reviewObligationIds', `candidate obligation '${id}' is absent from the selection packet`));
  for (const id of submitted) if (!scope.has(id)) errors.push(error('review-coverage-unknown', args.manifestPath, '/reviewObligationIds', `selection obligation '${id}' is absent from the candidate manifest`));
  const requirementPaths = new Set(manifest.requirements.map((r) => r.path));
  const sourcePaths = new Set(manifest.dependencies.filter((d) => d.role === 'source').map((d) => d.path));
  for (const requirement of requirementSources) for (const source of requirement.sources) {
    const inRequirements = requirementPaths.has(source.path);
    const inSources = sourcePaths.has(source.path);
    if (inRequirements === inSources) errors.push(error(inRequirements ? 'source-ambiguous' : 'source-not-found', requirement.path, '/sources', `source path '${source.path}' must occur in exactly one requirements or role-source entry`));
    else {
      const sourceSnapshot = byPath.get(source.path);
      validateSource(source, requirement.path, sourceSnapshot?.status === 'ok' ? sourceSnapshot : undefined, errors);
    }
  }
  const allocationPaths = manifest.dependencies.filter((d) => d.role === 'allocation').map((d) => d.path);
  if (allocationPaths.filter((path) => path === args.allocationPath).length !== 1) errors.push(error('subject-mismatch', args.manifestPath, '/dependencies', `authored slice '${args.allocationPath}' must occur exactly once as an allocation dependency`));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, candidate: { manifest, manifestRef: { path: args.manifestPath, sha256: manifestSnapshot.sha256 }, allocationPaths, declaredObligationIds: declared } };
}

/** Validate one complete, already-read baseline closure. */
export function validateBaselineAdmission(args: {
  manifestPath: string;
  snapshots: readonly AssuranceSnapshot[];
  expectedManifest?: ContentRef;
  allocationPath?: string;
}): BaselineAdmissionResult {
  const errors: AssuranceError[] = [];
  const byPath = new Map(args.snapshots.map((snapshot) => [snapshot.path, snapshot]));
  const manifestSnapshot = byPath.get(args.manifestPath);
  if (!manifestSnapshot) return { ok: false, errors: [error('missing', args.manifestPath, '/', 'manifest snapshot was not loaded')] };
  if (manifestSnapshot.status === 'error') return { ok: false, errors: [snapshotError(manifestSnapshot)] };
  if (args.expectedManifest && manifestSnapshot.sha256 !== args.expectedManifest.sha256) {
    errors.push(error('digest-mismatch', args.manifestPath, '/', `manifest digest ${manifestSnapshot.sha256} does not match persisted ${args.expectedManifest.sha256}`));
  }
  const parsedManifest = parseBaselineManifest(manifestSnapshot);
  errors.push(...parsedManifest.errors);
  if (!parsedManifest.ok) return { ok: false, errors };
  const manifest = parsedManifest.value;
  const expectedManifestPath = `docs/requirements/baselines/${manifest.baselineId}.json`;
  if (args.manifestPath !== expectedManifestPath) {
    errors.push(error('subject-mismatch', args.manifestPath, '/', `baselineId '${manifest.baselineId}' requires manifest path '${expectedManifestPath}'`));
  }

  const referenced = [...manifest.requirements, ...manifest.dependencies];
  for (const ref of referenced) {
    const snapshot = byPath.get(ref.path);
    if (!snapshot) {
      errors.push(error('missing', ref.path, '/', 'referenced input snapshot was not loaded'));
    } else if (snapshot.status === 'error') {
      errors.push(snapshotError(snapshot));
    } else if (snapshot.sha256 !== ref.sha256) {
      errors.push(error('digest-mismatch', ref.path, '/', `computed ${snapshot.sha256}; expected ${ref.sha256}`));
    }
  }

  const requirementSources: { path: string; sources: SourceRef[] }[] = [];
  const highLevelIdentities: IdentityCandidate[] = [];
  const lowLevelIdentities: IdentityCandidate[] = [];
  for (const ref of manifest.requirements) {
    const snapshot = byPath.get(ref.path);
    if (!snapshot || snapshot.status === 'error') continue;
    const parsed = parseRequirement(snapshot);
    errors.push(...parsed.errors);
    highLevelIdentities.push(...parsed.highLevelIdentities.map((item) => ({
      value: item.value,
      location: `${ref.path}#${item.location}`,
    })));
    lowLevelIdentities.push(...parsed.lowLevelIdentities.map((item) => ({
      value: item.value,
      location: `${ref.path}#${item.location}`,
    })));
    requirementSources.push({ path: ref.path, sources: parsed.sourceCandidates });
  }
  duplicateValues(highLevelIdentities, args.manifestPath, errors);
  duplicateValues(lowLevelIdentities, args.manifestPath, errors);
  if (manifest.formatVersion === 2) {
    const declared = new Set([...highLevelIdentities, ...lowLevelIdentities].map((item) => item.value));
    const scope = new Set(manifest.reviewObligationIds);
    for (const id of manifest.reviewObligationIds) {
      if (!declared.has(id)) errors.push(error('review-coverage-unknown', args.manifestPath, '/reviewObligationIds', `obligation '${id}' is not declared by the manifest requirements`));
      const parent = id.match(/^(.+-REQ-[0-9]{3})-L[0-9]{2}$/)?.[1];
      if (parent && !scope.has(parent)) errors.push(error('review-coverage-missing', args.manifestPath, '/reviewObligationIds', `L obligation '${id}' requires parent '${parent}' in review scope`));
    }
  }

  const requirementPaths = new Set(manifest.requirements.map((r) => r.path));
  const sourcePaths = new Set(manifest.dependencies.filter((d) => d.role === 'source').map((d) => d.path));
  for (const requirement of requirementSources) {
    for (const source of requirement.sources) {
      const inRequirements = requirementPaths.has(source.path);
      const inSources = sourcePaths.has(source.path);
      if (inRequirements === inSources) {
        errors.push(error(inRequirements ? 'source-ambiguous' : 'source-not-found', requirement.path, '/sources', `source path '${source.path}' must occur in exactly one requirements or role-source entry`));
        continue;
      }
      const snapshot = byPath.get(source.path);
      validateSource(source, requirement.path, snapshot?.status === 'ok' ? snapshot : undefined, errors);
    }
  }

  const reviewPath = `docs/assurance/${manifest.baselineId}/requirements-review.json`;
  const approvalPath = `docs/assurance/${manifest.baselineId}/baseline-approval.json`;
  const reviewSnapshot = byPath.get(reviewPath);
  const approvalSnapshot = byPath.get(approvalPath);
  let review: ReviewRecord | RequirementsReviewRecord | undefined;
  let approval: ApprovalRecord | ApprovalRecordV2 | undefined;
  if (!reviewSnapshot) errors.push(error('missing', reviewPath, '/', 'fixed review record was not loaded'));
  else if (reviewSnapshot.status === 'error') errors.push(snapshotError(reviewSnapshot));
  else {
    const parsed = manifest.formatVersion === 1
      ? parseReview(reviewSnapshot)
      : parseRequirementsReviewRecord(reviewSnapshot, manifest.reviewObligationIds);
    errors.push(...parsed.errors);
    if (parsed.ok) review = parsed.value;
  }
  if (!approvalSnapshot) errors.push(error('missing', approvalPath, '/', 'fixed approval record was not loaded'));
  else if (approvalSnapshot.status === 'error') errors.push(snapshotError(approvalSnapshot));
  else {
    const parsed = manifest.formatVersion === 1
      ? parseApprovalRecord(approvalSnapshot)
      : parseApprovalRecordV2(approvalSnapshot);
    errors.push(...parsed.errors);
    if (parsed.ok) approval = parsed.value;
  }

  const manifestRef = { path: args.manifestPath, sha256: manifestSnapshot.sha256 };
  if (review) {
    if (!sameRef(review.subject, manifestRef)) errors.push(error('subject-mismatch', reviewPath, '/subject', 'review subject does not equal selected manifest path and digest'));
    if (review.result !== 'accepted') errors.push(error('review-not-accepted', reviewPath, '/result', `review result is '${review.result}'`));
    if (manifest.formatVersion === 2 && review.kind === 'requirements-review') {
      if (!sameInputContext(review.authorInputProvenance, review.reviewerInputProvenance)) errors.push(error('role-context-mismatch', reviewPath, '/', 'author and reviewer accepted-baseline/common input identities differ'));
    }
  }
  if (approval) {
    if (!sameRef(approval.subject, manifestRef)) errors.push(error('subject-mismatch', approvalPath, '/subject', 'approval subject does not equal selected manifest path and digest'));
    if (reviewSnapshot?.status === 'ok' && !sameRef(approval.review, { path: reviewPath, sha256: reviewSnapshot.sha256 })) errors.push(error('subject-mismatch', approvalPath, '/review', 'approval review reference does not equal the fixed review record and digest'));
    if (approval.decision !== 'approved') errors.push(error('approval-not-approved', approvalPath, '/decision', `approval decision is '${approval.decision}'`));
    if (manifest.formatVersion === 2 && approval.formatVersion === 2 && (approval.target.projectId !== manifest.target.projectId || approval.target.root !== manifest.target.root)) errors.push(error('subject-mismatch', approvalPath, '/target', 'approval target does not equal manifest target'));
    const actualDecisions = new Set(approval.resolvedDecisions.map((d) => d.id));
    const requiredDecisions = new Set(manifest.requiredDecisionIds);
    for (const id of requiredDecisions) if (!actualDecisions.has(id)) errors.push(error('subject-mismatch', approvalPath, '/resolvedDecisions', `required decision '${id}' is unresolved`));
    for (const id of actualDecisions) if (!requiredDecisions.has(id)) errors.push(error('subject-mismatch', approvalPath, '/resolvedDecisions', `resolved decision '${id}' is not required by the manifest`));
    for (const ref of [approval.authorityBasis, ...approval.resolvedDecisions.map((d) => d.record)]) {
      const snapshot = byPath.get(ref.path);
      if (!snapshot) errors.push(error('missing', ref.path, '/', 'authority/decision snapshot was not loaded'));
      else if (snapshot.status === 'error') errors.push(snapshotError(snapshot));
      else if (snapshot.sha256 !== ref.sha256) errors.push(error('digest-mismatch', ref.path, '/', `computed ${snapshot.sha256}; expected ${ref.sha256}`));
    }
  }

  const allocationPaths = manifest.dependencies.filter((d) => d.role === 'allocation').map((d) => d.path);
  if (args.allocationPath !== undefined && !allocationPaths.includes(args.allocationPath)) {
    errors.push(error('subject-mismatch', args.manifestPath, '/dependencies', `sliceDoc '${args.allocationPath}' is not an allocation dependency`));
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, admission: { enforcement: manifest.formatVersion === 1 ? BASELINE_ADMISSION : REVIEWED_INPUTS, manifest: manifestRef, baselineId: manifest.baselineId, allocationPaths } };
}

function sameInputContext(a: RunInputProvenance, b: RunInputProvenance): boolean {
  return a.baseline.path === b.baseline.path && a.baseline.sha256 === b.baseline.sha256 && JSON.stringify(a.commonInputs) === JSON.stringify(b.commonInputs);
}

/** Parse the closed persisted mode object without accepting partial assurance. */
export function parsePersistedAssurance(value: unknown, recordPath: string, location = '/assurance'): ParsedRecord<AnyPersistedAssurance> {
  const errors: AssuranceError[] = [];
  const isV2 = isObject(value) && value.contract === STAGE2_CONTRACT;
  const fields = isV2 ? ['contract', 'enforcement', 'manifest', 'instructions'] : ['contract', 'enforcement', 'manifest'];
  if (!isObjectAndCollectClosedFieldErrors(value, fields, recordPath, location, errors)) return { ok: false, errors };
  let literalsOk = true;
  if (value.contract !== (isV2 ? STAGE2_CONTRACT : STAGE1_CONTRACT)) {
    errors.push(error('unsupported-version', recordPath, `${location}/contract`, `unsupported assurance contract '${String(value.contract)}'`));
    literalsOk = false;
  }
  const expectedEnforcement = isV2 ? REVIEWED_INPUTS : BASELINE_ADMISSION;
  if (value.enforcement !== expectedEnforcement) {
    errors.push(error('invalid-field', recordPath, `${location}/enforcement`, `enforcement must equal '${expectedEnforcement}'`));
    literalsOk = false;
  }
  const manifest = parseContentRef(value.manifest, recordPath, `${location}/manifest`, errors);
  if (!isV2) {
    if (!literalsOk || !manifest || errors.length > 0) return { ok: false, errors };
    return { ok: true, value: { contract: STAGE1_CONTRACT, enforcement: BASELINE_ADMISSION, manifest }, errors };
  }
  const instructions = parsePersistedInstructions(value.instructions, recordPath, `${location}/instructions`, errors);
  if (!literalsOk || !manifest || !instructions || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { contract: STAGE2_CONTRACT, enforcement: REVIEWED_INPUTS, manifest, instructions }, errors };
}

export function persistedAssurance(admission: BaselineAdmission): PersistedAssurance {
  if (admission.enforcement !== BASELINE_ADMISSION) throw new Error('v2 admission requires persistedAssuranceV2 with explicit instruction identities');
  return { contract: STAGE1_CONTRACT, enforcement: BASELINE_ADMISSION, manifest: admission.manifest };
}

export function persistedAssuranceV2(admission: BaselineAdmission, instructions: PersistedAssuranceV2['instructions']): PersistedAssuranceV2 {
  if (admission.enforcement !== REVIEWED_INPUTS) throw new Error('v1 admission cannot be persisted as reviewed-inputs');
  return { contract: STAGE2_CONTRACT, enforcement: REVIEWED_INPUTS, manifest: admission.manifest, instructions };
}

const OBLIGATION_ID = /^[A-Z][A-Z0-9-]*-REQ-[0-9]{3}(?:-L[0-9]{2})?$/;
const PRESERVATION_ID = /^P-[A-Z0-9-]+$/;
const CHECK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const GIT_HEAD = /^[0-9a-f]{40}$/;
const IMPLEMENTATION_METADATA_OPEN = '<!-- requirements-assurance-implementation-v1\n';
const IMPLEMENTATION_METADATA_CLOSE = '\n-->';

function parseStringArray(
  value: unknown,
  recordPath: string,
  at: string,
  errors: AssuranceError[],
  pattern: RegExp,
  allowEmpty: boolean
): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push(error('invalid-field', recordPath, at, `expected ${allowEmpty ? 'an' : 'a non-empty'} array`));
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !pattern.test(item) || item.includes('\0')) errors.push(error('invalid-field', recordPath, `${at}/${index}`, 'invalid identifier'));
    else result.push(item);
  });
  duplicateValues(result.map((value, index) => ({ value, location: `${at}/${index}` })), recordPath, errors);
  return result;
}

function parseNonEmptyStrings(value: unknown, recordPath: string, at: string, errors: AssuranceError[], allowEmpty: boolean): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push(error('invalid-field', recordPath, at, `expected ${allowEmpty ? 'an' : 'a non-empty'} array`));
    return [];
  }
  const result: string[] = [];
  value.forEach((item, index) => {
    if (!validString(item)) errors.push(error('invalid-field', recordPath, `${at}/${index}`, 'expected a non-empty string'));
    else result.push(item);
  });
  return result;
}

function parseCheckMethod(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): ImplementationCheckMethod | undefined {
  if (!isObject(value) || typeof value.kind !== 'string') {
    errors.push(error('invalid-field', recordPath, at, 'expected a check method object'));
    return undefined;
  }
  const fields = value.kind === 'command'
    ? ['kind', 'command', 'cwd', 'environment', 'inputs']
    : value.kind === 'inspection'
      ? ['kind', 'subject', 'criterion', 'inputs']
      : ['kind'];
  isObjectAndCollectClosedFieldErrors(value, fields, recordPath, at, errors);
  if (value.kind !== 'command' && value.kind !== 'inspection') {
    errors.push(error('invalid-field', recordPath, `${at}/kind`, 'unsupported check method'));
    return undefined;
  }
  const required = value.kind === 'command' ? ['command', 'cwd', 'environment', 'inputs'] : ['subject', 'criterion', 'inputs'];
  let ok = true;
  for (const field of required) if (!validString(value[field])) { errors.push(error('invalid-field', recordPath, `${at}/${field}`, `${field} must be non-empty`)); ok = false; }
  return ok ? value as unknown as ImplementationCheckMethod : undefined;
}

/** Parse the deliberately narrow byte-zero stage-3 allocation metadata block. */
export function parseImplementationAllocation(args: {
  snapshot: AssuranceFileSnapshot;
  expectedWorkItemId: string;
  expectedBaselinePath: string;
  expectedPacketObligationIds: readonly string[];
  reviewedObligationIds: readonly string[];
}): ParsedRecord<ImplementationAllocation> {
  const errors: AssuranceError[] = [];
  const raw = decodeSnapshot(args.snapshot, errors);
  if (raw === undefined) return { ok: false, errors };
  if (!raw.startsWith(IMPLEMENTATION_METADATA_OPEN)) {
    return { ok: false, errors: [error('metadata-delimiter', args.snapshot.path, 'line 1', 'implementation allocation metadata must begin at byte zero')] };
  }
  const end = raw.indexOf(IMPLEMENTATION_METADATA_CLOSE, IMPLEMENTATION_METADATA_OPEN.length);
  if (end < 0 || raw.indexOf(IMPLEMENTATION_METADATA_OPEN, IMPLEMENTATION_METADATA_OPEN.length) >= 0 || raw.indexOf(IMPLEMENTATION_METADATA_CLOSE, end + IMPLEMENTATION_METADATA_CLOSE.length) >= 0) {
    return { ok: false, errors: [error('metadata-delimiter', args.snapshot.path, 'line 1', 'expected exactly one closed implementation allocation metadata block')] };
  }
  const parsed = parseAssuranceJson(raw.slice(IMPLEMENTATION_METADATA_OPEN.length, end), args.snapshot.path);
  if (!parsed.ok) return parsed as ParsedRecord<ImplementationAllocation>;
  if (!isObjectAndCollectClosedFieldErrors(parsed.value, ['formatVersion', 'kind', 'workItemId', 'baselinePath', 'parentRequirementIds', 'implements', 'preserves', 'preservationObligationIds', 'changes', 'acceptanceBoundary', 'candidatePaths', 'postReviewRecordPaths', 'candidateExclusions', 'checks'], args.snapshot.path, '', errors)) return { ok: false, errors };
  const value = parsed.value;
  if (value.formatVersion !== 1) errors.push(error(typeof value.formatVersion === 'number' ? 'unsupported-version' : 'invalid-field', args.snapshot.path, '/formatVersion', 'formatVersion must equal 1'));
  if (value.kind !== 'implementation-allocation') errors.push(error(typeof value.kind === 'string' ? 'unsupported-kind' : 'invalid-field', args.snapshot.path, '/kind', "kind must equal 'implementation-allocation'"));
  const workItemOk = checkId(value.workItemId, args.snapshot.path, '/workItemId', errors);
  if (workItemOk && value.workItemId !== args.expectedWorkItemId) errors.push(error('subject-mismatch', args.snapshot.path, '/workItemId', `allocation names '${value.workItemId}', expected '${args.expectedWorkItemId}'`));
  const baselineOk = checkPath(value.baselinePath, args.snapshot.path, '/baselinePath', errors);
  if (baselineOk && value.baselinePath !== args.expectedBaselinePath) errors.push(error('subject-mismatch', args.snapshot.path, '/baselinePath', `allocation names '${value.baselinePath}', expected '${args.expectedBaselinePath}'`));
  const parents = parseStringArray(value.parentRequirementIds, args.snapshot.path, '/parentRequirementIds', errors, H_ID, false);
  const implementsIds = parseStringArray(value.implements, args.snapshot.path, '/implements', errors, OBLIGATION_ID, true);
  const preserves = parseStringArray(value.preserves, args.snapshot.path, '/preserves', errors, OBLIGATION_ID, true);
  const changes = parseStringArray(value.changes, args.snapshot.path, '/changes', errors, OBLIGATION_ID, true);
  const preservationIds = parseStringArray(value.preservationObligationIds, args.snapshot.path, '/preservationObligationIds', errors, PRESERVATION_ID, false);
  const allocated = [...implementsIds, ...preserves, ...changes];
  duplicateValues(allocated.map((id, index) => ({ value: id, location: `/allocated/${index}` })), args.snapshot.path, errors);
  if (allocated.length === 0) errors.push(error('invalid-field', args.snapshot.path, '/implements', 'implements/preserves/changes union must be non-empty'));
  const packet = new Set(args.expectedPacketObligationIds);
  const reviewed = new Set(args.reviewedObligationIds);
  for (const id of allocated) {
    if (!packet.has(id)) errors.push(error('subject-mismatch', args.snapshot.path, '/implements', `allocated obligation '${id}' is absent from IMPLEMENT_OBLIGATION_IDS`));
    if (!reviewed.has(id)) errors.push(error('review-coverage-unknown', args.snapshot.path, '/implements', `allocated obligation '${id}' was not reviewed`));
  }
  for (const id of packet) if (!allocated.includes(id)) errors.push(error('review-coverage-missing', args.snapshot.path, '/implements', `packet obligation '${id}' is not allocated`));
  for (const id of allocated) {
    const parent = id.match(/^(.*-REQ-[0-9]{3})-L[0-9]{2}$/)?.[1];
    if (parent && !parents.includes(parent)) errors.push(error('parent-mismatch', args.snapshot.path, '/parentRequirementIds', `allocated low-level obligation '${id}' requires contextual parent '${parent}'`));
  }
  const fullScope = new Set([...parents, ...allocated]);
  for (const id of args.reviewedObligationIds) if (!fullScope.has(id)) errors.push(error('review-coverage-missing', args.snapshot.path, '/parentRequirementIds', `reviewed obligation '${id}' is not contextual or allocated`));
  for (const id of fullScope) if (!reviewed.has(id)) errors.push(error('review-coverage-unknown', args.snapshot.path, '/parentRequirementIds', `allocation identity '${id}' is outside reviewed scope`));
  if (!validString(value.acceptanceBoundary)) errors.push(error('invalid-field', args.snapshot.path, '/acceptanceBoundary', 'acceptanceBoundary must be non-empty'));
  const candidatePaths = parseNonEmptyStrings(value.candidatePaths, args.snapshot.path, '/candidatePaths', errors, false).filter((path, index) => checkPath(path, args.snapshot.path, `/candidatePaths/${index}`, errors));
  const postPaths = parseNonEmptyStrings(value.postReviewRecordPaths, args.snapshot.path, '/postReviewRecordPaths', errors, false).filter((path, index) => checkPath(path, args.snapshot.path, `/postReviewRecordPaths/${index}`, errors));
  if (postPaths.length !== 2) errors.push(error('invalid-field', args.snapshot.path, '/postReviewRecordPaths', 'exactly two post-review record paths are required'));
  duplicateValues([...candidatePaths.map((path, index) => ({ value: path, location: `/candidatePaths/${index}` })), ...postPaths.map((path, index) => ({ value: path, location: `/postReviewRecordPaths/${index}` }))], args.snapshot.path, errors);
  const exclusions: { pathPrefix: string; reason: string }[] = [];
  if (!Array.isArray(value.candidateExclusions)) errors.push(error('invalid-field', args.snapshot.path, '/candidateExclusions', 'candidateExclusions must be an array'));
  else value.candidateExclusions.forEach((item, index) => {
    const at = `/candidateExclusions/${index}`;
    if (!isObjectAndCollectClosedFieldErrors(item, ['pathPrefix', 'reason'], args.snapshot.path, at, errors)) return;
    const pathOk = checkPath(typeof item.pathPrefix === 'string' ? item.pathPrefix.replace(/\/$/, '') : item.pathPrefix, args.snapshot.path, `${at}/pathPrefix`, errors) && typeof item.pathPrefix === 'string' && item.pathPrefix.endsWith('/');
    if (typeof item.pathPrefix === 'string' && !item.pathPrefix.endsWith('/')) errors.push(error('invalid-field', args.snapshot.path, `${at}/pathPrefix`, 'exclusion prefix must end with /'));
    const reasonOk = validString(item.reason);
    if (!reasonOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/reason`, 'reason must be non-empty'));
    if (pathOk && reasonOk) exclusions.push(item as unknown as { pathPrefix: string; reason: string });
  });
  duplicateValues(exclusions.map((item, index) => ({ value: item.pathPrefix, location: `/candidateExclusions/${index}/pathPrefix` })), args.snapshot.path, errors);
  for (const exclusion of exclusions) for (const path of [...candidatePaths, ...postPaths]) if (path === exclusion.pathPrefix.slice(0, -1) || path.startsWith(exclusion.pathPrefix)) errors.push(error('subject-mismatch', args.snapshot.path, '/candidateExclusions', `exclusion conceals declared path '${path}'`));
  const checks: ImplementationCheckPlan[] = [];
  if (!Array.isArray(value.checks) || value.checks.length === 0) errors.push(error('invalid-field', args.snapshot.path, '/checks', 'checks must be a non-empty array'));
  else {
    duplicateValues(stringMemberIdentities(value.checks, 'checkId', '/checks'), args.snapshot.path, errors);
    value.checks.forEach((item, index) => {
      const at = `/checks/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['checkId', 'obligationIds', 'owner', 'method', 'expected'], args.snapshot.path, at, errors)) return;
      const idOk = typeof item.checkId === 'string' && CHECK_ID.test(item.checkId);
      if (!idOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/checkId`, 'invalid check identifier'));
      const obligationIds = parseStringArray(item.obligationIds, args.snapshot.path, `${at}/obligationIds`, errors, /^(?:[A-Z][A-Z0-9-]*-REQ-[0-9]{3}(?:-L[0-9]{2})?|P-[A-Z0-9-]+)$/, false);
      for (const id of obligationIds) if (!allocated.includes(id) && !preservationIds.includes(id)) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/obligationIds`, `check references unallocated obligation '${id}'`));
      const ownerOk = item.owner === 'builder' || item.owner === 'reviewer';
      if (!ownerOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/owner`, 'owner must be builder or reviewer'));
      const method = parseCheckMethod(item.method, args.snapshot.path, `${at}/method`, errors);
      const expectedOk = validString(item.expected);
      if (!expectedOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/expected`, 'expected must be non-empty'));
      if (idOk && ownerOk && method && expectedOk) checks.push({ checkId: item.checkId as string, obligationIds, owner: item.owner as 'builder' | 'reviewer', method, expected: item.expected as string });
    });
  }
  const covered = new Set(checks.flatMap((check) => check.obligationIds));
  for (const id of [...allocated, ...preservationIds]) if (!covered.has(id)) errors.push(error('review-coverage-missing', args.snapshot.path, '/checks', `obligation '${id}' has no planned check`));
  for (const id of preserves) {
    const matching = checks.filter((check) => check.obligationIds.includes(id));
    if (!matching.some((check) => /no[- ]behavior[- ]change|remain|preserv/i.test(check.expected))) errors.push(error('invalid-field', args.snapshot.path, '/checks', `preserved obligation '${id}' lacks an explicit no-behavior-change oracle`));
  }
  const prose = raw.slice(end + IMPLEMENTATION_METADATA_CLOSE.length);
  for (const id of preservationIds) if (!new RegExp(`(?:^|\\n)(?:###\\s+${id}\\b|\\|\\s*${id}\\s*\\|)`, 'm').test(prose)) errors.push(error('heading-mismatch', args.snapshot.path, 'Markdown', `preservation obligation '${id}' has no prose declaration`));
  if (!workItemOk || !baselineOk || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { formatVersion: 1, kind: 'implementation-allocation', workItemId: value.workItemId as string, baselinePath: value.baselinePath as string, parentRequirementIds: parents, implements: implementsIds, preserves, preservationObligationIds: preservationIds, changes, acceptanceBoundary: value.acceptanceBoundary as string, candidatePaths, postReviewRecordPaths: postPaths, candidateExclusions: exclusions, checks }, errors };
}

function parseEvidenceOutcome(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): EvidenceOutcome | undefined {
  if (!isObject(value) || typeof value.kind !== 'string') { errors.push(error('invalid-field', recordPath, at, 'expected evidence outcome object')); return undefined; }
  if (value.kind === 'passed' || value.kind === 'failed') {
    isObjectAndCollectClosedFieldErrors(value, ['kind', 'actual', 'supportingEvidence'], recordPath, at, errors);
    const actualOk = validString(value.actual);
    if (!actualOk) errors.push(error('invalid-field', recordPath, `${at}/actual`, 'actual must be non-empty'));
    const evidence = parseNonEmptyStrings(value.supportingEvidence, recordPath, `${at}/supportingEvidence`, errors, false);
    return actualOk && evidence.length > 0 ? { kind: value.kind, actual: value.actual as string, supportingEvidence: evidence } : undefined;
  }
  if (value.kind === 'not-run' || value.kind === 'execution-failed') {
    const member = value.kind === 'not-run' ? 'reason' : 'failure';
    isObjectAndCollectClosedFieldErrors(value, ['kind', member], recordPath, at, errors);
    if (!validString(value[member])) { errors.push(error('invalid-field', recordPath, `${at}/${member}`, `${member} must be non-empty`)); return undefined; }
    return value as unknown as EvidenceOutcome;
  }
  errors.push(error('invalid-field', recordPath, `${at}/kind`, 'unsupported evidence outcome'));
  return undefined;
}

/** Validate one provider evidence result against its pre-approved plan and checkpoint. */
export function parseImplementationEvidenceResult(args: { snapshot: AssuranceFileSnapshot; allocation: ImplementationAllocation; allocationRef: ContentRef; checkpoint: CandidateCheckpoint }): ParsedRecord<ImplementationEvidenceResult> {
  const decodedErrors: AssuranceError[] = [];
  const raw = decodeJsonBearingSnapshot(args.snapshot, decodedErrors);
  if (raw === undefined) return { ok: false, errors: decodedErrors };
  const parsed = parseAssuranceJson(raw, args.snapshot.path);
  if (!parsed.ok) return parsed as ParsedRecord<ImplementationEvidenceResult>;
  const errors: AssuranceError[] = [];
  if (!isObjectAndCollectClosedFieldErrors(parsed.value, ['formatVersion', 'kind', 'allocation', 'checks', 'changeJustifications', 'limitations', 'report'], args.snapshot.path, '', errors)) return { ok: false, errors };
  const value = parsed.value;
  if (value.formatVersion !== 3) errors.push(error(typeof value.formatVersion === 'number' ? 'unsupported-version' : 'invalid-field', args.snapshot.path, '/formatVersion', 'formatVersion must equal 3'));
  if (value.kind !== 'implementation-evidence-result') errors.push(error(typeof value.kind === 'string' ? 'unsupported-kind' : 'invalid-field', args.snapshot.path, '/kind', "kind must equal 'implementation-evidence-result'"));
  const allocation = parseContentRef(value.allocation, args.snapshot.path, '/allocation', errors);
  if (allocation && (allocation.path !== args.allocationRef.path || allocation.sha256 !== args.allocationRef.sha256)) errors.push(error('subject-mismatch', args.snapshot.path, '/allocation', 'evidence allocation does not match loaded slice'));
  const checks: ImplementationEvidenceResult['checks'] = [];
  if (!Array.isArray(value.checks)) errors.push(error('invalid-field', args.snapshot.path, '/checks', 'checks must be an array'));
  else {
    duplicateValues(stringMemberIdentities(value.checks, 'checkId', '/checks'), args.snapshot.path, errors);
    value.checks.forEach((item, index) => {
      const at = `/checks/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['checkId', 'outcome'], args.snapshot.path, at, errors)) return;
      const planned = args.allocation.checks.find((check) => check.checkId === item.checkId);
      if (!planned) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/checkId`, `unplanned check '${String(item.checkId)}'`));
      const outcome = parseEvidenceOutcome(item.outcome, args.snapshot.path, `${at}/outcome`, errors);
      if (planned && outcome) checks.push({ checkId: planned.checkId, outcome });
    });
  }
  for (const planned of args.allocation.checks) if (!checks.some((check) => check.checkId === planned.checkId)) errors.push(error('review-coverage-missing', args.snapshot.path, '/checks', `planned check '${planned.checkId}' has no result`));
  const actualPaths = args.checkpoint.entries.map((entry) => entry.path);
  const justifications: ImplementationEvidenceResult['changeJustifications'] = [];
  if (!Array.isArray(value.changeJustifications)) errors.push(error('invalid-field', args.snapshot.path, '/changeJustifications', 'changeJustifications must be an array'));
  else {
    duplicateValues(stringMemberIdentities(value.changeJustifications, 'path', '/changeJustifications'), args.snapshot.path, errors);
    value.changeJustifications.forEach((item, index) => {
      const at = `/changeJustifications/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['path', 'obligationIds', 'summary'], args.snapshot.path, at, errors)) return;
      const pathOk = checkPath(item.path, args.snapshot.path, `${at}/path`, errors);
      if (pathOk && !actualPaths.includes(item.path as string)) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/path`, `path '${item.path}' is not in the candidate checkpoint`));
      const ids = parseStringArray(item.obligationIds, args.snapshot.path, `${at}/obligationIds`, errors, /^(?:[A-Z][A-Z0-9-]*-REQ-[0-9]{3}(?:-L[0-9]{2})?|P-[A-Z0-9-]+)$/, false);
      const authorized = new Set([...args.allocation.implements, ...args.allocation.preserves, ...args.allocation.changes, ...args.allocation.preservationObligationIds]);
      for (const id of ids) if (!authorized.has(id)) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/obligationIds`, `unallocated justification obligation '${id}'`));
      const summaryOk = validString(item.summary);
      if (!summaryOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/summary`, 'summary must be non-empty'));
      if (pathOk && ids.length > 0 && summaryOk) justifications.push({ path: item.path as string, obligationIds: ids, summary: item.summary as string });
    });
  }
  for (const path of actualPaths) if (!justifications.some((item) => item.path === path)) errors.push(error('review-coverage-missing', args.snapshot.path, '/changeJustifications', `candidate path '${path}' has no justification`));
  const limitations = parseNonEmptyStrings(value.limitations, args.snapshot.path, '/limitations', errors, true);
  if (!validString(value.report)) errors.push(error('invalid-field', args.snapshot.path, '/report', 'report must be non-empty'));
  if (errors.length > 0 || !allocation) return { ok: false, errors };
  return { ok: true, value: { formatVersion: 3, kind: 'implementation-evidence-result', allocation, checks, changeJustifications: justifications, limitations, report: value.report as string }, errors };
}

/** Validate and canonicalize one Git/index/working-tree checkpoint. */
export function makeCandidateCheckpoint(args: { observation: CandidateTreeObservation; allocation: ImplementationAllocation; computeDigest: (content: string) => string }): ParsedRecord<CandidateCheckpoint> {
  const errors: AssuranceError[] = [];
  const recordPath = 'candidate-observation';
  if (!GIT_HEAD.test(args.observation.baseRevision)) errors.push(error('invalid-field', recordPath, '/baseRevision', 'expected a 40-character lowercase Git object id'));
  const allowed = new Set(args.allocation.candidatePaths);
  if (!Array.isArray(args.observation.entries)) return { ok: false, errors: [...errors, error('invalid-field', recordPath, '/entries', 'entries must be an array')] };
  const encoder = new TextEncoder();
  const entries = [...args.observation.entries].sort((a, b) => {
    const left = encoder.encode(String(a.path));
    const right = encoder.encode(String(b.path));
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      if (left[index] !== right[index]) return (left[index] as number) - (right[index] as number);
    }
    return left.length - right.length;
  });
  duplicateValues(entries.map((entry, index) => ({ value: entry.path, location: `/entries/${index}/path` })), recordPath, errors);
  const underExclusion = (path: string) => args.allocation.candidateExclusions.some((item) => path === item.pathPrefix.slice(0, -1) || path.startsWith(item.pathPrefix));
  for (const [index, entry] of entries.entries()) {
    if (!isObject(entry) || Object.keys(entry).sort().join(',') !== 'index,path,porcelainStatus,workingTree') {
      errors.push(error('unknown-field', recordPath, `/entries/${index}`, 'candidate entry must contain exactly path, porcelainStatus, index and workingTree'));
      continue;
    }
    if (!checkPath(entry.path, recordPath, `/entries/${index}/path`, errors)) continue;
    if (underExclusion(entry.path)) continue;
    if (!allowed.has(entry.path)) errors.push(error('subject-mismatch', recordPath, `/entries/${index}/path`, `changed path '${entry.path}' is outside candidatePaths`));
    const statusOk = entry.porcelainStatus === '??' || (/^[ MADRC][ MD]$/.test(entry.porcelainStatus) && entry.porcelainStatus !== '  ');
    if (!statusOk) errors.push(error('invalid-field', recordPath, `/entries/${index}/porcelainStatus`, 'expected a supported, non-conflicted two-character porcelain status'));
    for (const [name, state] of [['index', entry.index], ['workingTree', entry.workingTree]] as const) {
      if (!isObject(state) || (state.kind !== 'absent' && state.kind !== 'present')) {
        errors.push(error('invalid-field', recordPath, `/entries/${index}/${name}`, 'expected a closed present/absent file state'));
        continue;
      }
      const expectedFields = state.kind === 'absent'
        ? ['kind']
        : name === 'index'
          ? ['kind', 'gitMode', 'stage', 'sha256', 'byteLength']
          : ['kind', 'gitMode', 'sha256', 'byteLength'];
      isObjectAndCollectClosedFieldErrors(state, expectedFields, recordPath, `/entries/${index}/${name}`, errors);
      if (state.kind === 'present') {
        if ((state.gitMode !== '100644' && state.gitMode !== '100755') || !SHA256.test(state.sha256) || !Number.isInteger(state.byteLength) || state.byteLength < 0) errors.push(error('invalid-field', recordPath, `/entries/${index}/${name}`, 'invalid regular-file identity'));
        if (name === 'index' && (!('stage' in state) || state.stage !== 0)) errors.push(error('invalid-field', recordPath, `/entries/${index}/index/stage`, 'only stage-0 index entries are supported'));
      }
    }
    if (statusOk) {
      const indexPresent = entry.index.kind === 'present';
      const workingPresent = entry.workingTree.kind === 'present';
      const [indexStatus, workingStatus] = entry.porcelainStatus;
      const expectedIndexPresent = entry.porcelainStatus === '??' ? false : indexStatus !== 'D';
      const expectedWorkingPresent = entry.porcelainStatus === '??' ? true : workingStatus !== 'D' && indexStatus !== 'D';
      if (indexPresent !== expectedIndexPresent || workingPresent !== expectedWorkingPresent) {
        errors.push(error('invalid-field', recordPath, `/entries/${index}`, `porcelain status '${entry.porcelainStatus}' is inconsistent with index/working-tree presence`));
      }
    }
  }
  const retained = entries.filter((entry) => !underExclusion(entry.path)).map((entry) => ({
    path: entry.path,
    porcelainStatus: entry.porcelainStatus,
    index: entry.index.kind === 'absent'
      ? { kind: 'absent' as const }
      : { kind: 'present' as const, gitMode: entry.index.gitMode, stage: 0 as const, sha256: entry.index.sha256, byteLength: entry.index.byteLength },
    workingTree: entry.workingTree.kind === 'absent'
      ? { kind: 'absent' as const }
      : { kind: 'present' as const, gitMode: entry.workingTree.gitMode, sha256: entry.workingTree.sha256, byteLength: entry.workingTree.byteLength },
  }));
  if (errors.length > 0) return { ok: false, errors };
  const body = { contract: 'requirements-assurance/v3-candidate-checkpoint' as const, baseRevision: args.observation.baseRevision, entries: retained };
  return { ok: true, value: { ...body, sha256: args.computeDigest(JSON.stringify(body)) }, errors };
}

function parseReviewVerification(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): ReviewVerification | undefined {
  if (!isObject(value) || typeof value.kind !== 'string') { errors.push(error('invalid-field', recordPath, at, 'expected verification object')); return undefined; }
  if (value.kind === 'reproduced') {
    isObjectAndCollectClosedFieldErrors(value, ['kind', 'outcome'], recordPath, at, errors);
    const outcome = parseEvidenceOutcome(value.outcome, recordPath, `${at}/outcome`, errors);
    return outcome ? { kind: 'reproduced', outcome } : undefined;
  }
  if (value.kind === 'relied-on-builder-evidence') {
    isObjectAndCollectClosedFieldErrors(value, ['kind', 'limitation'], recordPath, at, errors);
    if (!validString(value.limitation)) { errors.push(error('invalid-field', recordPath, `${at}/limitation`, 'limitation must be non-empty')); return undefined; }
    return { kind: value.kind, limitation: value.limitation as string };
  }
  errors.push(error('invalid-field', recordPath, `${at}/kind`, 'unsupported verification disposition'));
  return undefined;
}

/** Validate a structured implementation review and exact obligation/check/path coverage. */
export function parseImplementationReviewResult(args: { snapshot: AssuranceFileSnapshot; allocation: ImplementationAllocation; checkpoint: CandidateCheckpoint; verificationSha256: string; evidence: ImplementationEvidenceResult }): ParsedRecord<ImplementationReviewResult> {
  const decodeErrors: AssuranceError[] = [];
  const raw = decodeJsonBearingSnapshot(args.snapshot, decodeErrors);
  if (raw === undefined) return { ok: false, errors: decodeErrors };
  const parsed = parseAssuranceJson(raw, args.snapshot.path);
  if (!parsed.ok) return parsed as ParsedRecord<ImplementationReviewResult>;
  const errors: AssuranceError[] = [];
  if (!isObjectAndCollectClosedFieldErrors(parsed.value, ['formatVersion', 'kind', 'subject', 'result', 'obligationAssessments', 'checkAssessments', 'changedPathAssessments', 'findings', 'decisions', 'report'], args.snapshot.path, '', errors)) return { ok: false, errors };
  const value = parsed.value;
  if (value.formatVersion !== 3) errors.push(error(typeof value.formatVersion === 'number' ? 'unsupported-version' : 'invalid-field', args.snapshot.path, '/formatVersion', 'formatVersion must equal 3'));
  if (value.kind !== 'implementation-review-result') errors.push(error(typeof value.kind === 'string' ? 'unsupported-kind' : 'invalid-field', args.snapshot.path, '/kind', "kind must equal 'implementation-review-result'"));
  if (!isObjectAndCollectClosedFieldErrors(value.subject, ['candidateSha256', 'verificationSha256'], args.snapshot.path, '/subject', errors)) return { ok: false, errors };
  const subject = value.subject;
  if (subject.candidateSha256 !== args.checkpoint.sha256 || subject.verificationSha256 !== args.verificationSha256) errors.push(error('subject-mismatch', args.snapshot.path, '/subject', 'review subject does not match candidate/verification identities'));
  const expectedObligations = [...args.allocation.implements, ...args.allocation.preserves, ...args.allocation.changes, ...args.allocation.preservationObligationIds];
  const expectedChecks = args.allocation.checks.map((check) => check.checkId);
  const expectedPaths = args.checkpoint.entries.map((entry) => entry.path);
  const parseSimpleAssessments = (rawValue: unknown, at: string, key: 'obligationId' | 'path', expected: readonly string[]) => {
    const results: { identity: string; result: ReviewOutcome; findingIds: string[]; decisionIds: string[] }[] = [];
    if (!Array.isArray(rawValue) || (key === 'obligationId' && rawValue.length === 0)) { errors.push(error('invalid-field', args.snapshot.path, at, 'expected assessment array')); return results; }
    duplicateValues(stringMemberIdentities(rawValue, key, at), args.snapshot.path, errors);
    rawValue.forEach((item, index) => {
      const here = `${at}/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, [key, 'result', 'findingIds', 'decisionIds'], args.snapshot.path, here, errors)) return;
      const identity = item[key];
      if (typeof identity !== 'string' || !expected.includes(identity)) errors.push(error('review-coverage-unknown', args.snapshot.path, `${here}/${key}`, `unexpected ${key} '${String(identity)}'`));
      const outcomeOk = typeof item.result === 'string' && REVIEW_OUTCOMES.has(item.result as ReviewOutcome);
      if (!outcomeOk) errors.push(error('invalid-field', args.snapshot.path, `${here}/result`, 'unsupported review outcome'));
      const findingIds = parseIdArray(item.findingIds, args.snapshot.path, `${here}/findingIds`, errors, true);
      const decisionIds = parseIdArray(item.decisionIds, args.snapshot.path, `${here}/decisionIds`, errors, true);
      if (outcomeOk && item.result === 'accepted' && (findingIds.length || decisionIds.length)) errors.push(error('review-result-mismatch', args.snapshot.path, here, 'accepted assessment cannot reference findings/decisions'));
      if (typeof identity === 'string' && expected.includes(identity) && outcomeOk) results.push({ identity, result: item.result as ReviewOutcome, findingIds, decisionIds });
    });
    for (const identity of expected) if (!results.some((item) => item.identity === identity)) errors.push(error('review-coverage-missing', args.snapshot.path, at, `missing assessment for '${identity}'`));
    return results;
  };
  const obligationRaw = parseSimpleAssessments(value.obligationAssessments, '/obligationAssessments', 'obligationId', expectedObligations);
  const pathRaw = parseSimpleAssessments(value.changedPathAssessments, '/changedPathAssessments', 'path', expectedPaths);
  const checkAssessments: ImplementationReviewResult['checkAssessments'] = [];
  if (!Array.isArray(value.checkAssessments) || value.checkAssessments.length === 0) errors.push(error('invalid-field', args.snapshot.path, '/checkAssessments', 'checkAssessments must be non-empty'));
  else {
    duplicateValues(stringMemberIdentities(value.checkAssessments, 'checkId', '/checkAssessments'), args.snapshot.path, errors);
    value.checkAssessments.forEach((item, index) => {
      const at = `/checkAssessments/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['checkId', 'result', 'findingIds', 'verification'], args.snapshot.path, at, errors)) return;
      const idOk = typeof item.checkId === 'string' && expectedChecks.includes(item.checkId);
      if (!idOk) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/checkId`, `unexpected check '${String(item.checkId)}'`));
      const resultOk = typeof item.result === 'string' && REVIEW_OUTCOMES.has(item.result as ReviewOutcome);
      if (!resultOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/result`, 'unsupported review outcome'));
      const findingIds = parseIdArray(item.findingIds, args.snapshot.path, `${at}/findingIds`, errors, true);
      const verification = parseReviewVerification(item.verification, args.snapshot.path, `${at}/verification`, errors);
      const evidence = args.evidence.checks.find((check) => check.checkId === item.checkId);
      if (item.result === 'accepted' && evidence?.outcome.kind !== 'passed') errors.push(error('review-result-mismatch', args.snapshot.path, at, 'accepted check requires passed builder evidence'));
      if (item.result === 'accepted' && verification?.kind === 'reproduced' && verification.outcome.kind !== 'passed') errors.push(error('review-result-mismatch', args.snapshot.path, at, 'accepted reproduced check requires a passed outcome'));
      if (idOk && resultOk && verification) checkAssessments.push({ checkId: item.checkId as string, result: item.result as ReviewOutcome, findingIds, verification });
    });
  }
  for (const id of expectedChecks) if (!checkAssessments.some((item) => item.checkId === id)) errors.push(error('review-coverage-missing', args.snapshot.path, '/checkAssessments', `missing assessment for check '${id}'`));
  const findings: ImplementationReviewFinding[] = [];
  const findingCategories = new Set<ImplementationReviewFinding['category']>(['correctness', 'preservation', 'evidence', 'integration', 'scope', 'naming', 'architecture', 'traceability']);
  if (!Array.isArray(value.findings)) errors.push(error('invalid-field', args.snapshot.path, '/findings', 'findings must be an array'));
  else {
    duplicateValues(stringMemberIdentities(value.findings, 'findingId', '/findings'), args.snapshot.path, errors);
    value.findings.forEach((item, index) => {
      const at = `/findings/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['findingId', 'obligationIds', 'locations', 'category', 'evidence', 'consequence', 'requiredAction'], args.snapshot.path, at, errors)) return;
      const idOk = checkId(item.findingId, args.snapshot.path, `${at}/findingId`, errors);
      const ids = parseStringArray(item.obligationIds, args.snapshot.path, `${at}/obligationIds`, errors, /^(?:[A-Z][A-Z0-9-]*-REQ-[0-9]{3}(?:-L[0-9]{2})?|P-[A-Z0-9-]+)$/, false);
      for (const id of ids) if (!expectedObligations.includes(id)) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/obligationIds`, `finding references unallocated obligation '${id}'`));
      const locations = parseNonEmptyStrings(item.locations, args.snapshot.path, `${at}/locations`, errors, false);
      const categoryOk = typeof item.category === 'string' && findingCategories.has(item.category as ImplementationReviewFinding['category']);
      if (!categoryOk) errors.push(error('invalid-field', args.snapshot.path, `${at}/category`, 'unsupported implementation finding category'));
      const proseOk = ['evidence', 'consequence', 'requiredAction'].every((field) => validString(item[field]));
      if (!proseOk) errors.push(error('invalid-field', args.snapshot.path, at, 'finding prose fields must be non-empty'));
      if (idOk && ids.length && locations.length && categoryOk && proseOk) findings.push(item as unknown as ImplementationReviewFinding);
    });
  }
  const decisions: ReviewDecision[] = [];
  if (!Array.isArray(value.decisions)) errors.push(error('invalid-field', args.snapshot.path, '/decisions', 'decisions must be an array'));
  else {
    duplicateValues(stringMemberIdentities(value.decisions, 'decisionId', '/decisions'), args.snapshot.path, errors);
    value.decisions.forEach((item, index) => {
      const at = `/decisions/${index}`;
      if (!isObjectAndCollectClosedFieldErrors(item, ['decisionId', 'obligationIds', 'question', 'options', 'recommendation', 'blockingReason'], args.snapshot.path, at, errors)) return;
      const idOk = checkId(item.decisionId, args.snapshot.path, `${at}/decisionId`, errors);
      const obligationIds = parseStringArray(item.obligationIds, args.snapshot.path, `${at}/obligationIds`, errors, OBLIGATION_ID, false);
      for (const id of obligationIds) if (!expectedObligations.includes(id)) errors.push(error('review-coverage-unknown', args.snapshot.path, `${at}/obligationIds`, `decision references unallocated obligation '${id}'`));
      const options: ReviewDecision['options'] = [];
      if (!Array.isArray(item.options) || item.options.length === 0) errors.push(error('invalid-field', args.snapshot.path, `${at}/options`, 'options must be non-empty'));
      else {
        duplicateValues(stringMemberIdentities(item.options, 'option', `${at}/options`), args.snapshot.path, errors);
        item.options.forEach((option, optionIndex) => {
          const oat = `${at}/options/${optionIndex}`;
          if (!isObjectAndCollectClosedFieldErrors(option, ['option', 'reward', 'risk'], args.snapshot.path, oat, errors)) return;
          if (validString(option.option) && validString(option.reward) && validString(option.risk)) options.push(option as unknown as ReviewDecision['options'][number]);
          else errors.push(error('invalid-field', args.snapshot.path, oat, 'option, reward and risk must be non-empty strings'));
        });
      }
      const proseOk = validString(item.question) && validString(item.recommendation) && validString(item.blockingReason);
      if (!proseOk) errors.push(error('invalid-field', args.snapshot.path, at, 'question, recommendation and blockingReason must be non-empty'));
      if (typeof item.recommendation === 'string' && !options.some((option) => option.option === item.recommendation)) errors.push(error('review-result-mismatch', args.snapshot.path, `${at}/recommendation`, 'recommendation must name one option'));
      if (idOk && obligationIds.length && options.length && proseOk) decisions.push({ ...(item as unknown as ReviewDecision), obligationIds, options });
    });
  }
  const assessmentValues = [...obligationRaw, ...pathRaw];
  const findingIds = new Set(findings.map((finding) => finding.findingId));
  const decisionIds = new Set(decisions.map((decision) => decision.decisionId));
  const referencedFindings = new Set([...assessmentValues.flatMap((item) => item.findingIds), ...checkAssessments.flatMap((item) => item.findingIds)]);
  const referencedDecisions = new Set(assessmentValues.flatMap((item) => item.decisionIds));
  for (const assessment of assessmentValues) {
    if (assessment.result === 'accepted' && (assessment.findingIds.length || assessment.decisionIds.length)) errors.push(error('review-result-mismatch', args.snapshot.path, '/', 'accepted assessment cannot reference findings or decisions'));
    if (assessment.result === 'refinement-required' && (assessment.findingIds.length === 0 || assessment.decisionIds.length > 0)) errors.push(error('review-result-mismatch', args.snapshot.path, '/', 'refinement-required assessment needs findings and no decisions'));
    if (assessment.result === 'decision-required' && assessment.decisionIds.length === 0) errors.push(error('review-result-mismatch', args.snapshot.path, '/', 'decision-required assessment needs a decision'));
  }
  for (const item of checkAssessments) {
    if (item.result === 'accepted' && item.findingIds.length) errors.push(error('review-result-mismatch', args.snapshot.path, '/checkAssessments', 'accepted check cannot reference findings'));
    if (item.result === 'refinement-required' && item.findingIds.length === 0) errors.push(error('review-result-mismatch', args.snapshot.path, '/checkAssessments', 'refinement-required check needs a finding'));
  }
  for (const id of referencedFindings) if (!findingIds.has(id)) errors.push(error('review-result-mismatch', args.snapshot.path, '/', `referenced finding '${id}' does not exist`));
  for (const id of findingIds) if (!referencedFindings.has(id)) errors.push(error('review-result-mismatch', args.snapshot.path, '/findings', `finding '${id}' is not referenced`));
  for (const id of referencedDecisions) if (!decisionIds.has(id)) errors.push(error('review-result-mismatch', args.snapshot.path, '/', `referenced decision '${id}' does not exist`));
  for (const id of decisionIds) if (!referencedDecisions.has(id)) errors.push(error('review-result-mismatch', args.snapshot.path, '/decisions', `decision '${id}' is not referenced`));
  if (!validString(value.report)) errors.push(error('invalid-field', args.snapshot.path, '/report', 'report must be non-empty'));
  const resultOk = typeof value.result === 'string' && REVIEW_OUTCOMES.has(value.result as ReviewOutcome);
  if (!resultOk) errors.push(error('invalid-field', args.snapshot.path, '/result', 'unsupported review result'));
  const allResults = [...obligationRaw, ...pathRaw, ...checkAssessments].map((item) => item.result);
  const expectedAggregate: ReviewOutcome = allResults.includes('decision-required') ? 'decision-required' : allResults.includes('refinement-required') ? 'refinement-required' : 'accepted';
  if (allResults.includes('decision-required') && decisions.length === 0) errors.push(error('review-result-mismatch', args.snapshot.path, '/decisions', 'a decision-required assessment requires a referenced decision record'));
  if (resultOk && value.result !== expectedAggregate) errors.push(error('review-result-mismatch', args.snapshot.path, '/result', `aggregate must equal '${expectedAggregate}'`));
  if (errors.length > 0 || !resultOk) return { ok: false, errors };
  return { ok: true, value: { formatVersion: 3, kind: 'implementation-review-result', subject: subject as unknown as ImplementationReviewResult['subject'], result: value.result as ReviewOutcome, obligationAssessments: obligationRaw.map((item) => ({ obligationId: item.identity, result: item.result, findingIds: item.findingIds, decisionIds: item.decisionIds })), checkAssessments, changedPathAssessments: pathRaw.map((item) => ({ path: item.identity, result: item.result, findingIds: item.findingIds, decisionIds: item.decisionIds })), findings, decisions, report: value.report as string }, errors };
}

function parseRootedRef(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): RootedContentRef | undefined {
  if (!isObjectAndCollectClosedFieldErrors(value, ['root', 'path', 'sha256'], recordPath, at, errors)) return undefined;
  const rootOk = value.root === 'target' || value.root === 'prompt';
  if (!rootOk) errors.push(error('invalid-field', recordPath, `${at}/root`, 'root must be target or prompt'));
  const ref = parseContentRef({ path: value.path, sha256: value.sha256 }, recordPath, at, errors);
  return rootOk && ref ? { root: value.root as RootedContentRef['root'], ...ref } : undefined;
}

function parsePersistedInstructions(value: unknown, recordPath: string, at: string, errors: AssuranceError[]): PersistedAssuranceV2['instructions'] | undefined {
  const names = ['shared', 'commonRole', 'selectorRole', 'builderRole', 'reviewerRole', 'challengerRole', 'rebutterRole'] as const;
  if (!isObjectAndCollectClosedFieldErrors(value, names, recordPath, at, errors)) return undefined;
  const shared = parseRootedRef(value.shared, recordPath, `${at}/shared`, errors);
  const parsedArrays: Record<string, RootedContentRef[]> = {};
  const all: IdentityCandidate[] = [];
  for (const name of names.slice(1)) {
    const raw = value[name];
    const refs: RootedContentRef[] = [];
    if (!Array.isArray(raw) || raw.length === 0) errors.push(error('invalid-field', recordPath, `${at}/${name}`, `${name} must be a non-empty array`));
    else raw.forEach((item, index) => {
      const ref = parseRootedRef(item, recordPath, `${at}/${name}/${index}`, errors);
      if (ref) { refs.push(ref); all.push({ value: `${ref.root}:${ref.path}`, location: `${at}/${name}/${index}` }); }
    });
    parsedArrays[name] = refs;
  }
  duplicateValues(all, recordPath, errors);
  if (!shared || errors.length > 0) return undefined;
  return {
    shared,
    commonRole: parsedArrays['commonRole'] ?? [],
    selectorRole: parsedArrays['selectorRole'] ?? [],
    builderRole: parsedArrays['builderRole'] ?? [],
    reviewerRole: parsedArrays['reviewerRole'] ?? [],
    challengerRole: parsedArrays['challengerRole'] ?? [],
    rebutterRole: parsedArrays['rebutterRole'] ?? [],
  };
}

/** Exhaustive stable rendering for CLI/operator blocking output. */
export function renderAssuranceError(value: AssuranceError): string {
  let label: string;
  switch (value.code) {
    case 'missing': label = 'missing'; break;
    case 'unreadable': label = 'unreadable'; break;
    case 'io-failure': label = 'io-failure'; break;
    case 'path-escape': label = 'path-escape'; break;
    case 'malformed-json': label = 'malformed-json'; break;
    case 'metadata-delimiter': label = 'metadata-delimiter'; break;
    case 'duplicate-field': label = 'duplicate-field'; break;
    case 'duplicate-identity': label = 'duplicate-identity'; break;
    case 'unknown-field': label = 'unknown-field'; break;
    case 'invalid-field': label = 'invalid-field'; break;
    case 'unsupported-version': label = 'unsupported-version'; break;
    case 'unsupported-kind': label = 'unsupported-kind'; break;
    case 'digest-mismatch': label = 'digest-mismatch'; break;
    case 'source-not-found': label = 'source-not-found'; break;
    case 'source-ambiguous': label = 'source-ambiguous'; break;
    case 'heading-mismatch': label = 'heading-mismatch'; break;
    case 'parent-mismatch': label = 'parent-mismatch'; break;
    case 'review-not-accepted': label = 'review-not-accepted'; break;
    case 'approval-not-approved': label = 'approval-not-approved'; break;
    case 'subject-mismatch': label = 'subject-mismatch'; break;
    case 'review-coverage-missing': label = 'review-coverage-missing'; break;
    case 'review-coverage-unknown': label = 'review-coverage-unknown'; break;
    case 'review-result-mismatch': label = 'review-result-mismatch'; break;
    case 'role-context-mismatch': label = 'role-context-mismatch'; break;
    case 'approval-already-exists': label = 'approval-already-exists'; break;
  }
  const other = value.code === 'duplicate-field' || value.code === 'duplicate-identity'
    ? `; first location ${value.otherLocation}`
    : '';
  return `${label}: ${value.recordPath} ${value.location}: ${value.detail}${other}`;
}
