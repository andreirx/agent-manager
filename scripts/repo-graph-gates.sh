#!/bin/bash
# Operator gate suite for ../repo-graph (tracked here because /private/tmp purges idle files after ~3 days —
# the original /private/tmp/ch1-gates.sh vanished 2026-09-08 and a commit chained after `echo` slipped through).
# Usage: scripts/repo-graph-gates.sh > <logfile> 2>&1 ; then grep -c ALL-GATES-GREEN <logfile> (must be 1)
# and grep -cE 'panicked at|test result: FAILED|GATE-FAIL' <logfile> (must be 0). Never chain a commit after this.
cd "/Users/apple/Documents/APLICATII BIJUTERIE/repo-graph/rust" || exit 90
echo "== fmt =="; cargo fmt --check; e=$?; [ $e -ne 0 ] && { echo "GATE-FAIL fmt $e"; exit 1; }
echo "== clippy --all-targets =="; cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -2; e=${PIPESTATUS[0]}; [ $e -ne 0 ] && { echo "GATE-FAIL clippy $e"; exit 2; }
for p in rgr agent daemon-runtime module-queries repo-index storage; do
  echo "== test $p =="
  cargo test -p "repo-graph-$p" 2>&1 | grep -E -A2 'Running tests/|test result|panicked at|assertion' | tail -20
  e=${PIPESTATUS[0]}; [ $e -ne 0 ] && { echo "GATE-FAIL test-$p $e"; exit 3; }
done
echo "== witness =="; cargo test -p repo-graph-daemon-runtime --test consolidation_witness -q >/dev/null 2>&1; e=$?; [ $e -ne 0 ] && { echo "GATE-FAIL witness $e"; exit 4; }; echo "witness ok"
echo "== release bins =="; cargo build --release --bin rmap --bin rmapd 2>&1 | tail -1; e=${PIPESTATUS[0]}; [ $e -ne 0 ] && { echo "GATE-FAIL release-build $e"; exit 6; }
echo "== dogfood =="; cd .. && ./scripts/dogfood-isolated.sh >/tmp/ch1-dogfood.out 2>&1; e=$?; [ $e -ne 0 ] && { echo "GATE-FAIL dogfood $e"; tail -5 /tmp/ch1-dogfood.out; exit 5; }; echo "dogfood ok"
echo "ALL-GATES-GREEN"
