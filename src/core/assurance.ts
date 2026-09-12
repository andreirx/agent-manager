/**
 * Pure requirements-assurance stage-1 policy.
 *
 * The filesystem adapter supplies immutable raw-text snapshots and their
 * byte digests. This module validates the closed v1 records and returns either
 * the one admitted baseline value or a typed list of expected failures. It has
 * no filesystem, provider, Git, clock, or process dependencies.
 *
 * @module core
 * @maturity PROTOTYPE
 */

export const STAGE1_CONTRACT = 'requirements-assurance/v1-stage1' as const;
export const BASELINE_ADMISSION = 'baseline-admission' as const;

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
  | 'subject-mismatch';

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

interface DependencyRef extends ContentRef {
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

export interface BaselineManifest {
  formatVersion: 1;
  kind: 'requirements-baseline-manifest';
  baselineId: string;
  target: { projectId: string; root: '.' };
  requirements: ContentRef[];
  dependencies: DependencyRef[];
  requiredDecisionIds: string[];
}

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

interface RoleIdentity {
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

interface ActorIdentity {
  actorType: 'human' | 'operator';
  actorId: string;
}

export interface PersistedAssurance {
  contract: typeof STAGE1_CONTRACT;
  enforcement: typeof BASELINE_ADMISSION;
  manifest: ContentRef;
}

export interface BaselineAdmission {
  enforcement: typeof BASELINE_ADMISSION;
  manifest: ContentRef;
  baselineId: string;
  allocationPaths: readonly string[];
}

export type BaselineAdmissionResult =
  | { ok: true; admission: BaselineAdmission }
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
  expectedKind: string,
  recordPath: string,
  errors: AssuranceError[]
): void {
  if (typeof object.formatVersion !== 'number' || !Number.isInteger(object.formatVersion)) {
    errors.push(error('invalid-field', recordPath, '/formatVersion', 'formatVersion must be an integer'));
  } else if (object.formatVersion !== 1) {
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
  if (!isObjectAndCollectClosedFieldErrors(rawValue, ['formatVersion', 'kind', 'baselineId', 'target', 'requirements', 'dependencies', 'requiredDecisionIds'], snapshot.path, '', errors)) {
    return { ok: false, errors };
  }
  const value = rawValue;
  checkLiteralVersionKind(value, 'requirements-baseline-manifest', snapshot.path, errors);
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
  if (!baselineOk || !targetOk || errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      formatVersion: 1,
      kind: 'requirements-baseline-manifest',
      baselineId: value.baselineId as string,
      target: value.target as { projectId: string; root: '.' },
      requirements,
      dependencies,
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
  checkLiteralVersionKind(value, 'manual-requirements-review', snapshot.path, errors);
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
  checkLiteralVersionKind(value, 'requirements-baseline-approval', snapshot.path, errors);
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
  checkLiteralVersionKind(value, 'requirement', snapshot.path, errors);
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
  let review: ReviewRecord | undefined;
  let approval: ApprovalRecord | undefined;
  if (!reviewSnapshot) errors.push(error('missing', reviewPath, '/', 'fixed review record was not loaded'));
  else if (reviewSnapshot.status === 'error') errors.push(snapshotError(reviewSnapshot));
  else {
    const parsed = parseReview(reviewSnapshot);
    errors.push(...parsed.errors);
    if (parsed.ok) review = parsed.value;
  }
  if (!approvalSnapshot) errors.push(error('missing', approvalPath, '/', 'fixed approval record was not loaded'));
  else if (approvalSnapshot.status === 'error') errors.push(snapshotError(approvalSnapshot));
  else {
    const parsed = parseApprovalRecord(approvalSnapshot);
    errors.push(...parsed.errors);
    if (parsed.ok) approval = parsed.value;
  }

  const manifestRef = { path: args.manifestPath, sha256: manifestSnapshot.sha256 };
  if (review) {
    if (!sameRef(review.subject, manifestRef)) errors.push(error('subject-mismatch', reviewPath, '/subject', 'review subject does not equal selected manifest path and digest'));
    if (review.result !== 'accepted') errors.push(error('review-not-accepted', reviewPath, '/result', `review result is '${review.result}'`));
  }
  if (approval) {
    if (!sameRef(approval.subject, manifestRef)) errors.push(error('subject-mismatch', approvalPath, '/subject', 'approval subject does not equal selected manifest path and digest'));
    if (reviewSnapshot?.status === 'ok' && !sameRef(approval.review, { path: reviewPath, sha256: reviewSnapshot.sha256 })) errors.push(error('subject-mismatch', approvalPath, '/review', 'approval review reference does not equal the fixed review record and digest'));
    if (approval.decision !== 'approved') errors.push(error('approval-not-approved', approvalPath, '/decision', `approval decision is '${approval.decision}'`));
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
  return { ok: true, admission: { enforcement: BASELINE_ADMISSION, manifest: manifestRef, baselineId: manifest.baselineId, allocationPaths } };
}

/** Parse the closed persisted mode object without accepting partial assurance. */
export function parsePersistedAssurance(value: unknown, recordPath: string, location = '/assurance'): ParsedRecord<PersistedAssurance> {
  const errors: AssuranceError[] = [];
  if (!isObjectAndCollectClosedFieldErrors(value, ['contract', 'enforcement', 'manifest'], recordPath, location, errors)) return { ok: false, errors };
  let literalsOk = true;
  if (value.contract !== STAGE1_CONTRACT) {
    errors.push(error('unsupported-version', recordPath, `${location}/contract`, `unsupported assurance contract '${String(value.contract)}'`));
    literalsOk = false;
  }
  if (value.enforcement !== BASELINE_ADMISSION) {
    errors.push(error('invalid-field', recordPath, `${location}/enforcement`, `enforcement must equal '${BASELINE_ADMISSION}'`));
    literalsOk = false;
  }
  const manifest = parseContentRef(value.manifest, recordPath, `${location}/manifest`, errors);
  if (!literalsOk || !manifest || errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { contract: STAGE1_CONTRACT, enforcement: BASELINE_ADMISSION, manifest }, errors };
}

export function persistedAssurance(admission: BaselineAdmission): PersistedAssurance {
  return { contract: STAGE1_CONTRACT, enforcement: BASELINE_ADMISSION, manifest: admission.manifest };
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
  }
  const other = value.code === 'duplicate-field' || value.code === 'duplicate-identity'
    ? `; first location ${value.otherLocation}`
    : '';
  return `${label}: ${value.recordPath} ${value.location}: ${value.detail}${other}`;
}
