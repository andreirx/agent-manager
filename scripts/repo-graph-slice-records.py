#!/usr/bin/env python3
"""Assemble docs/assurance/<W>-INPUT-<k>/{requirements-review.json, baseline-approval.json} for an ACCEPTED
document item, from the relay's parsed review and run records (the shape of ALIAS-SUSPICION-1-INPUT-3).
Usage (from the repo-graph root):
  python3 <agent-manager>/scripts/repo-graph-slice-records.py <W> <PREP-slice-id> <k> <cycle-n> "<rationale>" [resolvedDecisionId ...]  (omit to resolve every requiredDecisionId; a partial list is refused)
The review record is the relay's parsed review-<n>.json re-keyed as the contract's `requirements-review`;
author/reviewer come from runs/build-<n>.json and runs/review-<n>.json; provenance from the same runs."""
import json, hashlib, os, sys, glob
W, PREP, K, N, RAT = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]; DEC = sys.argv[6:]
sha = lambda p: "sha256:" + hashlib.sha256(open(p, "rb").read()).hexdigest()
S = f".agent-manager/slices/{PREP}"
rev = json.load(open(f"{S}/review-{N}.json"))["parsed"]
assert rev["result"] == "accepted", rev["result"]
b = json.load(open(f"{S}/runs/build-{N}.json")); r = json.load(open(f"{S}/runs/review-{N}.json"))
assert r["status"] == "completed" and b["status"] == "completed"
man = f"docs/requirements/baselines/{W}-INPUT-{K}.json"
assert rev["subject"]["path"] == man and rev["subject"]["sha256"] == sha(man), (rev["subject"], sha(man))
out = {"formatVersion": 2, "kind": "requirements-review", "reviewId": r["runId"], "subject": rev["subject"],
       "author": {"role": "requirements-author", "provider": b["provider"], "model": b["model"], "effort": b["effort"], "runId": b["runId"]},
       "reviewer": {"role": "requirements-reviewer", "provider": r["provider"], "model": r["model"], "effort": r["effort"], "runId": r["runId"]},
       "independence": {"invocations": "separate", "providerDiversity": "different-provider" if b["provider"] != r["provider"] else "same-provider"},
       "authorInputProvenance": b["inputProvenance"], "reviewerInputProvenance": r["inputProvenance"],
       "result": rev["result"], "assessments": rev["assessments"], "findings": rev["findings"], "decisions": rev["decisions"],
       "completedAt": r["completedAt"], "report": rev["report"]}
d = f"docs/assurance/{W}-INPUT-{K}"; os.makedirs(d, exist_ok=True)
rp = f"{d}/requirements-review.json"; open(rp, "w").write(json.dumps(out, indent=2) + "\n")
m = json.load(open(man)); prev = json.load(open("docs/assurance/ALIAS-SUSPICION-1-INPUT-3/baseline-approval.json"))
recs = {os.path.basename(x["path"])[:-3]: x["path"] for x in m["dependencies"] if "/decisions/" in x["path"]}
DEC = DEC or list(m["requiredDecisionIds"])
assert set(DEC) == set(m["requiredDecisionIds"]), ("an approval resolves EVERY required decision, carried ones included", sorted(set(m["requiredDecisionIds"]) - set(DEC)), sorted(set(DEC) - set(m["requiredDecisionIds"])))
app = {"formatVersion": prev["formatVersion"], "kind": prev["kind"], "approvalId": f"{W}-BASELINE-APPROVAL-{K}", "target": m["target"],
       "subject": {"path": man, "sha256": sha(man)}, "review": {"path": rp, "sha256": sha(rp)}, "decision": "approved",
       "approvedBy": prev["approvedBy"], "recordedBy": prev["recordedBy"],
       "authorityBasis": {"path": prev["authorityBasis"]["path"], "sha256": sha(prev["authorityBasis"]["path"])},
       "resolvedDecisions": [{"id": i, "record": {"path": recs[i], "sha256": sha(recs[i])}} for i in DEC],
       "decidedAt": r["completedAt"], "rationale": RAT}
open(f"{d}/baseline-approval.json", "w").write(json.dumps(app, indent=2) + "\n")
print("records written:", rp, f"{d}/baseline-approval.json", "| assessments", len(out["assessments"]), "| decisions", DEC)
