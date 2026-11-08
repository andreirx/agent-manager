/**
 * Git working-tree adapter tests (LEXMAP-1): a real temporary git repository
 * with tracked, modified, untracked, ignored, binary and oversized files.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { candidateLexicalHints, readCandidateChanges, readWorkingTreeFiles, LEXICAL_HINTS_HEADER } from './git-working-tree.js';

const execFile = promisify(execFileCallback);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFile('git', ['-C', cwd, ...args]);
  return stdout;
}

describe('git working-tree adapter', () => {
  let repo = '';

  beforeEach(async () => {
    repo = await mkdtemp('/private/tmp/LEXMAP-1-git-');
    await git(repo, 'init', '-q');
    await git(repo, 'config', 'user.email', 'test@example.com');
    await git(repo, 'config', 'user.name', 'test');
    await mkdir(join(repo, 'src'), { recursive: true });
    await mkdir(join(repo, 'sql'), { recursive: true });
    await writeFile(join(repo, 'src/orders.ts'), 'export function settleOrder() {\n  db.query("order_ledger");\n}\n');
    await writeFile(join(repo, 'src/users.ts'), 'export function createUser() {\n  db.query("user_table");\n}\n');
    await writeFile(join(repo, 'sql/schema.sql'), 'CREATE TABLE order_ledger (id TEXT);\nCREATE TABLE user_table (id TEXT);\n');
    await writeFile(join(repo, 'blob.bin'), Buffer.from([0x89, 0x50, 0x00, 0x47, 0x0d, 0x0a]));
    await writeFile(join(repo, '.gitignore'), 'ignored.txt\n.agent-manager/\n');
    await writeFile(join(repo, 'ignored.txt'), 'secret_token_name\n');
    // TRANSCRIPT-1: the relay's gitignored trail — indexed only on request, and only slices/ and transcripts/.
    await mkdir(join(repo, '.agent-manager/slices/S-1/runs'), { recursive: true });
    await writeFile(join(repo, '.agent-manager/slices/S-1/runs/build-0.json'), '{"runId":"build-S-1-0"}');
    await mkdir(join(repo, '.agent-manager/transcripts'), { recursive: true });
    await mkdir(join(repo, '.agent-manager/logs'), { recursive: true });
    await writeFile(join(repo, '.agent-manager/slices/S-1/build-0.md'), '# report\n');
    await writeFile(join(repo, '.agent-manager/transcripts/build-S-1-0.md'), '# build-S-1-0 · builder · claude\n');
    await writeFile(join(repo, '.agent-manager/logs/raw.txt'), '# Run Log\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-q', '-m', 'base');
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it('reads tracked + untracked text files, skips ignored, binary and oversized ones', async () => {
    await writeFile(join(repo, 'src/new.ts'), 'untracked_symbol();\n');
    await writeFile(join(repo, 'big.txt'), 'x'.repeat(2000));
    const read = await readWorkingTreeFiles(repo, { maxFileBytes: 1000 });
    const paths = read.files.map((f) => f.path);
    expect(paths).toEqual(['.gitignore', 'sql/schema.sql', 'src/new.ts', 'src/orders.ts', 'src/users.ts']);
    expect(read.skipped).toEqual({ binary: 1, large: 1, unreadable: 0 });
  });

  it('readCandidateChanges returns the diff against HEAD plus untracked text files', async () => {
    await writeFile(join(repo, 'src/orders.ts'), 'export function settleOrder() {\n  db.query("order_ledger_v2");\n}\n');
    await writeFile(join(repo, 'src/new.ts'), 'db.query("user_table");\n');
    const changes = await readCandidateChanges(repo);
    expect(changes.diffText).toContain('+++ b/src/orders.ts');
    expect(changes.diffText).toContain('+  db.query("order_ledger_v2");');
    expect(changes.changedPaths).toEqual(['src/orders.ts']);
    expect(changes.untracked.map((u) => u.path)).toEqual(['src/new.ts']);
  });

  it('readCandidateChanges names a pure rename and a non-ASCII path (no changed lines, raw path)', async () => {
    await git(repo, 'mv', 'src/users.ts', 'src/users-renamed.ts');
    await writeFile(join(repo, 'src/café.ts'), 'accent_symbol();\n');
    await git(repo, 'add', 'src/café.ts');
    const changes = await readCandidateChanges(repo);
    // git's rename detection names the destination only; the source no longer exists in the tree.
    expect(changes.changedPaths).toEqual(['src/café.ts', 'src/users-renamed.ts']);
    expect(changes.diffText).toContain('+++ b/src/café.ts');
    expect(changes.diffText).not.toContain('\\303\\251');
    expect(changes.diffText).not.toContain('+++ b/src/users-renamed.ts');
    expect(await readWorkingTreeFiles(repo).then((r) => r.bytes)).toBeGreaterThan(0);
  });

  it('candidateLexicalHints renders the section with ranked unchanged neighbors', async () => {
    await writeFile(join(repo, 'src/orders.ts'), 'export function settleOrder() {\n  db.query("order_ledger");\n  audit("user_table");\n}\n');
    const section = await candidateLexicalHints(repo);
    expect(section.startsWith(LEXICAL_HINTS_HEADER)).toBe(true);
    expect(section).toMatch(/Index: 4 files \(HEAD [0-9a-f]{7,}, 1 uncommitted entry, inputs sha256:[0-9a-f]{64}\)/);
    // The inputs digest pins content: the same tree digests the same, a one-byte edit does not.
    const a = (await readWorkingTreeFiles(repo)).inputsDigest;
    expect((await readWorkingTreeFiles(repo)).inputsDigest).toBe(a);
    await writeFile(join(repo, 'src/users.ts'), 'export function createUser() {\n  db.query("user_table");\n}\n// x\n');
    expect((await readWorkingTreeFiles(repo)).inputsDigest).not.toBe(a);
    expect(section).toContain('Candidate: 1 changed file');
    expect(section).toMatch(/sql\/schema\.sql +\[cross-language\] +— user_table/);
    expect(section).not.toContain('src/orders.ts  ');
  });

  it('candidateLexicalHints names the reason when the target is not a repository', async () => {
    const plain = await mkdtemp('/private/tmp/LEXMAP-1-norepo-');
    try {
      const section = await candidateLexicalHints(plain);
      expect(section.startsWith(LEXICAL_HINTS_HEADER)).toBe(true);
      expect(section).toContain('Unavailable:');
    } finally {
      await rm(plain, { recursive: true, force: true });
    }
  });

  it('includeTrail adds .agent-manager/slices and /transcripts (gitignored) but never logs/ or runs/*.json (TRANSCRIPT-1)', async () => {
    const plain = await readWorkingTreeFiles(repo);
    expect(plain.files.some((f) => f.path.startsWith('.agent-manager/'))).toBe(false);
    const withTrail = await readWorkingTreeFiles(repo, { maxFileBytes: 2_000_000, includeTrail: true });
    const trail = withTrail.files.map((f) => f.path).filter((p) => p.startsWith('.agent-manager/'));
    expect(trail).toEqual(['.agent-manager/slices/S-1/build-0.md', '.agent-manager/transcripts/build-S-1-0.md']);
    expect(withTrail.files.length).toBe(plain.files.length + 2);
  });
});
