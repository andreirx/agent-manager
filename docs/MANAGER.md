# In-place manager playbook

Maturity: PROTOTYPE operating protocol. Date: 2026-09-11.
Status: APPROVED operating protocol; execution evidence is recorded per actual run.
Source: [AM-REQ-009](requirements/am-req-009-in-place-manager.md).

## What this role is

The human starts a capable, persistent AI session, points it at a target project,
and authorizes a bounded outcome. That session is the manager. It uses Agent Manager
to dispatch builders/reviewers, observes their records and logs, and steers the work.
It is not another name for the relay's --supervisor provider, and it is not a daemon.

Use [the manager prompt](../prompts/roles/manager.md) as explicit role instructions
for that session. It does not auto-start from a file or select a model. The human
chooses the manager model; preserve separately authorized builder/reviewer choices.

## 1. Establish context before acting

Verify, by filesystem/source/status inspection:

1. Agent Manager root and the runner revision to be used.
2. Target root, its CLAUDE.md and additional required governance.
3. Product intent, roadmap, current slice, scope, and authority to edit/launch/commit.
4. Existing run status, build/review artifacts, and any relevant live process family.
5. Shared-prompt path/content identity and actual builder/reviewer invocation choices.
6. Worktree state, including pre-existing or other-actor edits.

Do not infer the target from the manager's working directory. Record both roots.
Do not launch over an unaccounted-for writer. Investigate a reported process by its
PID, command, cwd/ancestry where available; a matching substring alone is not ownership.
Do not stop unrelated jobs.

For new work, require the authority/requirements appropriate to the currently
implemented process. During bootstrap record which checks are manual. Do not pretend
the proposed assurance commands or acceptance records already exist.

## 2. Prepare eligible work

The manager turns the authorized need into a requirements/design work item or an
implementation packet, depending on existing approved inputs. It checks that the
packet serves a user/system outcome, not just an attractive technical change.

For document work, declare document-only scope and required review. For implementation,
name the accepted obligations, preservation set, output/use-case acceptance boundary,
allowed files, relevant consumers, exact checks, isolation, and stop conditions.
Keep large problems in coherent increments; support must be exercised, not dormant.

The current target relay allows operator bootstrapping under
<target>/.agent-manager/slices/<ID>/ with selection.md, selection.json, and status.json.
Read the current contract and a valid record before constructing one; do not guess
fields or mark a draft ready. For a SPEC item, sliceDoc must identify the actual
document being authored, not the roadmap, because decision discovery currently
reads that registered document.

Durable decisions belong in target specifications/accepted records. The local
selection packet can carry instructions but cannot be their only lasting authority.

## 3. Launch a bounded relay

Use the existing relay-target CLI, with target as an explicit argument. Inspect
--dry-run after changes to provider, shared prompt, permission posture, or invocation
shape. Dry-run prints planned routing; it is not proof the provider obeyed the prompt.

Read current iteration before choosing --max-iter. Follow CLAUDE.md's checkpoint
rule: bound the run at current iteration plus at most three build/review cycles.
For a fresh slice this normally means a bound of three; for resume do not blindly
reuse a ceiling already reached. Preserve the current approved model/effort choices.
A human naming a manager model is not authorization to change the builder model.

Start the relay as its own managed process/tool action, not hidden behind another
command chain. Record its PID/session handle, target, work item, starting iteration,
bound, and log/report locations. Never launch two builder relays against one target
working tree. A clean second checkout is a separate, explicitly managed target.

Use current supported flags only. Future baseline/assurance flags in the rollout
document must not be invoked before their increments are accepted.

## 4. Observe evidence, not activity theater

While the relay runs, use its process output and log/report paths. At each bounded
checkpoint, or a meaningful failure/decision event, inspect:

- status.json: phase and iteration;
- newest build-N.md and review-N.json;
- build-progress.md when present, especially after interruption;
- the relevant provider log tail and final status;
- changed-file distribution and actual diff, including unrelated pre-existing edits.

A growing log is progress evidence, not correctness. A quiet log is not proof of a
dead process. An exit code is not proof that the requirements or mandatory checks
were satisfied. Prefer event/process waiting over repeated unchanged polling.
Notify the human of meaningful outcomes, failures, and decisions, not unchanged logs.

Do not let a loop exceed its planned checkpoint because it looks busy. The manager
reviews product sense and scope at the checkpoint, not only the reviewer's verdict.

## 5. Choose the next action

| Evidence | Manager action |
|---|---|
| In-scope revise findings, valid baseline | Amend steering if needed and launch the next bounded cycle |
| Missing required verification only | Arrange the specific permitted proof and preserve who ran it; do not relabel it as builder execution |
| Provider auth/quota/environment interruption | Record infrastructure failure; resume only after the condition is resolved and inputs remain valid |
| Malformed/dangling active local state | Refuse implicit dispatch; inspect retained records, progress, worktree, approved inputs, and owned processes; restore only operational state supported by that evidence, then explicitly resume and revalidate admission when existing authority settles the recovery |
| Timeout with partial edits | Read progress and edit distribution; preserve work; split or narrow if the slice is too large |
| Repeated substantive disagreement/non-convergence | Inspect root cause and scope; surface model escalation only under current human/delegated authority |
| Requirement/design contradiction | Stop dependent code, prepare the change/decision evidence, obtain proper review/authority |
| Decision only the human can make | Present the problem, evidence, materially distinct options and risk/reward; do not buy another build cycle |
| Positive reviewer verdict | Perform operator closeout checks below; do not equate verdict with final acceptance |

When terminating an owned run, follow the current tool permissions and verify that
its descendant provider/build processes are accounted for before relaunch. Record
what was stopped and why. Do not discard the partial tree or use stash/reset to hide
work. A retry is not permission to change requirements or silently raise every limit.

### Conscious recovery protocol

1. Stop implicit dispatch and account for possible writers. Do not treat the stop
   itself as a request for human approval.
2. Inspect the available status, newest reports, incremental progress, worktree,
   approved inputs, and owned process evidence. State what each source establishes
   and what remains unknown.
3. If the evidence identifies one interrupted slice and a non-destructive repair
   within existing authority, record the cause and repair in the existing handoff,
   restore only the supported operational state, and explicitly resume that slice.
   Revalidate its admission before dispatch. The builder inspects and continues the
   preserved partial diff; it does not restart from a blank tree unnecessarily.
4. Ask the human only if the inspection leaves a consequential ambiguity or missing
   authority, requires changing approved inputs, or would risk losing work. Explain
   the conflict and why existing authority cannot settle it before giving options.

Example — clear interruption: status, build progress, the diff, and process exit
all identify the same builder timeout with no live writer. The manager explains the
timeout, preserves the diff, repairs only the supported local pointer if needed,
and explicitly resumes the same admitted slice without seeking a new approval.

Example — conflicting evidence: the pointer names one slice while progress and
unaccounted live edits indicate another writer or work item. The manager first
investigates process ownership and the tree, then escalates because choosing either
position could discard or misattribute work; it does not manufacture a run position.

Steering belongs in the existing local packet/operator note and references the
unchanged authoritative obligations. New obligations or altered acceptance require
controlled specification change, not an informal note that overrides the baseline.

## 6. Close out under explicit authority

Check the final candidate against scope, requirements, preservation, required
verification, independent review, unresolved decisions, and unnecessary structure.
Check names: do they communicate actual effects and guarantees to a new reader?

Record manager judgment as manager judgment. If the manager performs a missing test,
label it manager-executed. Never edit a reviewer record to pretend the reviewer said
something else; use a separate operator decision referencing it.

Publish durable acceptance evidence once the corresponding mechanism exists; during
bootstrap use the agreed tracked target record and label manual actions. Commit
deliverables only under explicit human or standing operator authority, after checking
the exact candidate and relevant gates. Do not auto-install or deploy. Clean only
isolated resources owned by this run, preserving evidence needed for acceptance.

Advance the roadmap only to the state actually achieved. A slice implementation,
a parent requirement's satisfaction, final human acceptance, and release are distinct.

## 7. Leave a restartable handoff

Keep an operational handoff in the existing slice directory, not a new global state
service. Include verified roots, work item, runner/prompt/baseline identities, latest
phase/iteration, owned process handles, changes present, executed checks, unresolved
findings/decisions, and the exact next action. Link durable decisions rather than
copying and reinterpreting them.

After session loss, the next manager rechecks those facts before acting. When the
session ends, do not claim continued monitoring unless an explicitly configured
continuation mechanism actually exists. This playbook creates no scheduler.

## 8. First demonstration

Use the [rollout's self-host sequence](slices/requirements-assurance-rollout.md#6-self-hosting-without-circular-assurance):
an existing manager session points relay-target at Agent Manager, prepares a real
approved increment, runs one bounded build/review checkpoint, inspects the artifacts,
and leaves a handoff. Record which of AM-REQ-009's criteria were observed versus
only inspected in this playbook. No extra manager service is necessary.
