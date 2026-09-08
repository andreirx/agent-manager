#!/bin/bash
# Operator release-cut checklist for ../repo-graph (tracked; run STEP BY STEP, never chained after an unverified gate).
# Usage: scripts/repo-graph-release-cut.sh <step>   steps: 1 cut | 2 push | 3 install | 4 restart | 5 relocate | 6 warm
# Preconditions for step 1: the last slice is COMMITTED on a green gate (scripts/repo-graph-gates.sh log asserted),
# no relay running (pgrep -fl "relay-target|codex exec|claude.*stream-json" empty), tree clean.
set -u
RG="/Users/apple/Documents/APLICATII BIJUTERIE/repo-graph"
RET_DST="$HOME/repo-graph-retained"          # durable home for retained state roots (out of /private/tmp purge)
case "${1:-}" in
  1) cd "$RG" && git status --short | grep -q . && { echo "tree not clean — stop"; exit 10; }
     ./scripts/cut_release_minor.sh; echo "cut-exit=$?" ;;
  2) cd "$RG" && git push && git push --tags; echo "push-exit=$?" ;;
  3) cd "$RG" && ./scripts/dev-install-local.sh; echo "install-exit=$?" ;;
  4) launchctl bootout gui/501 com.repo-graph.rmapd 2>/dev/null; sleep 2
     launchctl bootstrap gui/501 "$HOME/Library/LaunchAgents/com.repo-graph.rmapd.plist"; sleep 3
     pgrep -fl rmapd | cut -c1-60; rmap doctor 2>&1 | grep -iE "version|healthy|storage:" | head -4 ;;
  5) mkdir -p "$RET_DST"
     for r in /private/tmp/repo-graph-tests/audit-v0.17.0 /private/tmp/HT1-retained; do
       [ -d "$r" ] && { echo "moving $r → $RET_DST/"; mv "$r" "$RET_DST/"; }
     done
     # rewrite absolute db_path entries in the moved registries
     for reg in "$RET_DST"/*/registry.json; do
       [ -f "$reg" ] && python3 - "$reg" "$RET_DST" <<'PY'
import json,sys,os
p,dst=sys.argv[1],sys.argv[2]; d=json.load(open(p)); n=0
root=os.path.dirname(p)
for r in d.get('repos',[]):
    old=r.get('db_path','')
    if old.startswith('/private/tmp/'):
        r['db_path']=os.path.join(root,'databases',os.path.basename(old)); n+=1
json.dump(d,open(p,'w'),indent=2); print(f"{p}: {n} db_path entries rewritten")
PY
     done; ls "$RET_DST"; du -sh "$RET_DST" ;;
  6) cd "$RG/rust" && cargo build --workspace --tests 2>&1 | tail -2; echo "warm-exit=${PIPESTATUS[0]}"; du -sg target | cut -f1 ;;
  *) echo "usage: $0 <1..6>"; exit 2 ;;
esac
