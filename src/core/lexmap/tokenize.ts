/**
 * Lexical tokenizer for the lexmap index (LEXMAP-1).
 *
 * One rule, no grammar: an identifier is `[A-Za-z_][A-Za-z0-9_]*`, taken from
 * the whole text — code and the insides of string literals alike — so route
 * strings, event names and table names enter the index the same way a function
 * name does. Language keywords are not filtered here; the index drops them by
 * document frequency (a token present in most files carries no signal).
 *
 * The single heuristic this module adds is `likelyDefinition`: the previous
 * word on the same line is a definition keyword (`fn`, `def`, `class`, …).
 * It is a hint for ordering `where` results, never a resolved fact.
 *
 * Pure: no I/O, no Node APIs.
 *
 * @module core/lexmap
 * @maturity PROTOTYPE
 */

/** One identifier occurrence. `line` and `col` are 1-based. */
export interface TokenOccurrence {
  readonly token: string;
  readonly line: number;
  readonly col: number;
  /** The previous word on the line is a definition keyword. */
  readonly likelyDefinition: boolean;
}

/**
 * Words that, immediately before an identifier, mark it as a likely
 * definition. Starting value (parameter, not doctrine): the common
 * declaration keywords of the languages in the targets this relay runs on
 * (TypeScript, Rust, Python, Java, Go, C/C++, Kotlin/Scala).
 */
export const DEFINITION_KEYWORDS: ReadonlySet<string> = new Set([
  'fn', 'def', 'class', 'struct', 'interface', 'type', 'enum', 'func', 'function',
  'impl', 'trait', 'mod', 'module', 'package', 'namespace', 'const', 'let', 'var',
  'val', 'static', 'union', 'typedef', 'record', 'object', 'protocol',
]);

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;

const isUpper = (c: string): boolean => c >= 'A' && c <= 'Z';
const isLowerOrDigit = (c: string): boolean => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');

/**
 * The concept key of an identifier (LEXMAP-2, sub-tokenization): its parts,
 * lower-cased, joined by `_`, so the spellings of one name in different
 * languages meet — `settleOrder`, `settle_order`, `SettleOrder`, `SETTLE_ORDER`
 * all give `settle_order`. Parts split at `_`, at a lower/digit→Upper boundary
 * (`settleOrder`, `v2Handler`) and before the last capital of a run followed by
 * a lower-case letter (`HTTPServer` → `http_server`, `IOError` → `io_error`).
 * Digits stay with their part (`sha256`). Parts are never indexed alone: `order`
 * is not a key of `settle_order`. An identifier of only underscores has no key ('').
 */
export function conceptKey(token: string): string {
  const parts: string[] = [];
  for (const chunk of token.split('_')) {
    if (chunk === '') continue;
    let start = 0;
    for (let i = 1; i < chunk.length; i += 1) {
      const prev = chunk[i - 1] ?? '';
      const cur = chunk[i] ?? '';
      const next = chunk[i + 1];
      const lowerToUpper = isLowerOrDigit(prev) && isUpper(cur);
      const runEnd = isUpper(prev) && isUpper(cur) && next !== undefined && next >= 'a' && next <= 'z';
      if (lowerToUpper || runEnd) {
        parts.push(chunk.slice(start, i));
        start = i;
      }
    }
    parts.push(chunk.slice(start));
  }
  return parts.map((p) => p.toLowerCase()).join('_');
}

function isWordChar(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_';
}

/**
 * The word immediately before `index` on `line` (blanks allowed between).
 * A backward scan bounded by the word's own length: an end-anchored regex
 * over `line.slice(0, index)` is O(line length) per token and turned a
 * minified single-line bundle into minutes (measured on amodx, 2026-11-07).
 */
function wordBefore(line: string, index: number): string {
  let j = index - 1;
  while (j >= 0 && (line[j] === ' ' || line[j] === '\t')) j -= 1;
  const end = j + 1;
  while (j >= 0 && isWordChar(line[j] ?? '')) j -= 1;
  return line.slice(j + 1, end);
}

/**
 * Tokenize a text into identifier occurrences of at least `minLength`
 * characters. Lines are split on `\n` only; a trailing `\r` is harmless to the
 * identifier regex.
 */
export function tokenize(text: string, minLength: number): TokenOccurrence[] {
  const out: TokenOccurrence[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    IDENTIFIER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IDENTIFIER.exec(line)) !== null) {
      const token = match[0];
      if (token.length < minLength) continue;
      const likelyDefinition = DEFINITION_KEYWORDS.has(wordBefore(line, match.index));
      out.push({ token, line: i + 1, col: match.index + 1, likelyDefinition });
    }
  }
  return out;
}

/** Distinct identifiers of a text (used for document-frequency counting). */
export function distinctTokens(text: string, minLength: number): Set<string> {
  const set = new Set<string>();
  IDENTIFIER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IDENTIFIER.exec(text)) !== null) {
    if (match[0].length >= minLength) set.add(match[0]);
  }
  return set;
}
