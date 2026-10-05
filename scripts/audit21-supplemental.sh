#!/bin/bash
# v0.21.0 supplemental captures (audit round nine): re-probe every slice shipped since v0.20.0 against the ground
# truth recorded in its ROADMAP ship block (repo-graph docs/ROADMAP.md, blocks 2026-10-03 → 2026-10-05).
# Expects: RMAP_STATE_ROOT / RMAP_SOCKET_PATH exported to the ISOLATED audit-v0.21.0 root (settled: every repo indexed by
# the v0.21.0 smoke). Never the operator's real state root. Read-only: never index/refresh here. The rmap on PATH must be
# the installed 0.21.0 (`rmap --version` is captured first). Expected texts quoted from the ship blocks are the ORACLE a
# grader compares against; this script only captures.
set -u
OUT="${AUDIT21_OUT:-/private/tmp/audit21/captures}"; mkdir -p "$OUT"
L="/Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases"
B="/Users/apple/Documents/APLICATII BIJUTERIE"
cap(){ local d="$1" n="$2"; shift 2; { echo "== CMD: rmap $*"; echo "== CWD: $d"; (cd "$d" && rmap "$@") 2>&1; echo "== EXIT: $?"; } > "$OUT/$n.txt"; echo "cap $n ($(wc -c < "$OUT/$n.txt") bytes)"; }
{ rmap --version; echo "state root: $RMAP_STATE_ROOT"; } > "$OUT/00-version.txt"; cat "$OUT/00-version.txt"

# IMPORTS-UNRESOLVED-REMAINDER-1 (36cc1367): amodx Toolbar.tsx — after TS-ALIAS-RESOLUTION-1: `4 imports` static (tsconfig paths) + `4 imports without a confirmed target:`
#   (@tiptap/react, react, lucide-react, @amodx/plugins/admin line 10 external library?); nginx src/core/ngx_core.h: 32 static rows, `+2 inferred imports, not shown`,
#   `13 imports without a confirmed target:` incl. `ngx_time.h  line 52  several indexed files matched (same file name in 2 places) — 2 candidates: …` never a pick;
#   leveldb table/table_test.cc: 14 static + `3 imports without a confirmed target:` (./gtest/gtest.h line 10 this repository?); explain gains `+N imports without a confirmed target — rmap imports <file>`.
cap "$B/amodx"       iur-amodx-imports-toolbar   imports admin/src/components/editor/Toolbar.tsx
cap "$B/amodx"       iur-amodx-explain-toolbar   explain admin/src/components/editor/Toolbar.tsx
cap "$L/nginx"       iur-nginx-imports-core      imports src/core/ngx_core.h
cap "$L/leveldb"     iur-leveldb-imports-tabletest imports table/table_test.cc

# TS-ALIAS-RESOLUTION-1 (1510da10): hexmanos frontend/src/App.tsx `7 imports`, all `static (resolved through tsconfig paths)`, one row left (react-router-dom);
#   amodx 416/416 alias rows → one static edge each (basis tsconfig_paths).
cap "$B/hexmanos"    tsa-hexmanos-imports-app    imports frontend/src/App.tsx
cap "$B/amodx"       tsa-amodx-imports-toolbar-json imports admin/src/components/editor/Toolbar.tsx --json

# DEPS-GRADLE-CATALOG-1B (f69759f4): kafka `deps list` clients row `used 26 · no static import found 9 · undeclared 2 (declared set incomplete) · builtins 42`
#   (build.gradle:1879 implementation libs.zstd → gradle/dependencies.gradle:247 → com.github.luben); grpc-java `deps list core` `used 4 · no static import found 8 · undeclared 1`.
cap "$L/kafka"       dgc-kafka-deps-list         deps list
cap "$L/kafka"       dgc-kafka-deps-list-clients deps list clients
cap "$L/grpc-java"   dgc-grpc-deps-list-core     deps list core

# MODULES-DEPS-SUMMARY-SCOPE-1 (b5c67086): leveldb `modules deps table` → `Summary (module table, all directions):` 46 / 19 / 0 above four edges summing to 46;
#   `--direction outbound` 41 = sum of outbound edges; poco `modules deps Foundation` 1653 / 1751 / 27 above 24 edges; unscoped `modules deps` unchanged; JSON `diagnostics_scope`.
cap "$L/leveldb"     mds-leveldb-modules-deps-table modules deps table
cap "$L/leveldb"     mds-leveldb-modules-deps-table-out modules deps table --direction outbound
cap "$L/leveldb"     mds-leveldb-modules-deps-table-json modules deps table --json
cap "$L/poco"        mds-poco-modules-deps-foundation modules deps Foundation
cap "$L/leveldb"     mds-leveldb-modules-deps    modules deps

# DGC-ATTRIBUTION-PRECISE-1 (f91162f7): grpc-java `deps list` root row `declared_manifest_paths: []`, 20 nested rows each citing its own build.gradle
#   (examples/example-tls build.gradle:28 → row example-tls declared_and_used 2); `modules list` `67 modules`, `Modules: 66 Gradle projects from 21 settings.gradle files · 1 inferred …`, `grpc  3 owned files`.
cap "$L/grpc-java"   dap-grpc-modules-list       modules list
cap "$L/grpc-java"   dap-grpc-deps-list-json     deps list --json
cap "$L/grpc-java"   dap-grpc-deps-list-exampletls deps list example-tls

# RUST-SELF-RESOLUTION-1 (3365f866): repo-graph on itself — `imports rust/crates/agent/src/aggregators/trust.rs` → `10 imports` (crate::/super::/self:: and bare heads bound
#   from the enclosing module; inline mod tests bodies; `rust/tools/xpart-probe/src/main.rs:22 use std::collections::…` binds NOTHING beside a lib.rs — D-RSR-ENTRY-CLIMB-1).
cap "$B/repo-graph"  rsr-rg-imports-trust        imports rust/crates/agent/src/aggregators/trust.rs
cap "$B/repo-graph"  rsr-rg-imports-xpart-main   imports rust/tools/xpart-probe/src/main.rs
cap "$B/repo-graph"  rsr-rg-imports-seedpass     imports rust/crates/daemon-runtime/src/seed_pass.rs
cap "$B/repo-graph"  rsr-rg-check-json           check --json

# HELP-SURFACE-PARITY-1 (381cbb1f): `rmap --help` lists all 44 dispatched commands (declare ×3 and coverage lines = the handlers' usage constants; perf accepted form;
#   daemon [deprecated — use rmapd], dead [disabled]); handler usage bytes unchanged (declare boundary with no args prints `usage: ` + constant, exit 1).
cap "$L/leveldb"     hsp-help                    --help
cap "$L/leveldb"     hsp-declare-boundary-usage  declare boundary
cap "$L/leveldb"     hsp-risk                    risk

# DOCTOR-FALLBACK-STATE-ROOT-1 (44f357bb): forced stdio under THIS isolated root → `transport: stdio (configured)`, `state_root: override (<root>)` first, five `n/a (stdio transport)`
#   (four in text, five in JSON — 27 probes), `[note] daemon_service: launchd service (global state root): …` with the forced-stdio detail, healthy exit 0; auto under the isolated
#   root keeps its socket semantics (this root HAS a socket daemon from the smoke: expect daemon_socket ok and the service probe a passing note with the neutral detail).
cap "$L/leveldb"     dfsr-doctor-auto            doctor
cap "$L/leveldb"     dfsr-doctor-auto-json       doctor --json
RMAP_TRANSPORT=stdio cap "$L/leveldb" dfsr-doctor-stdio doctor
RMAP_TRANSPORT=stdio cap "$L/leveldb" dfsr-doctor-stdio-json doctor --json

# JAVA-SYMBOL-AMBIGUITY-HINT-1 (66341d63): kafka `callers KafkaProducer.send` → exit 2, `Candidates (2) — each matches 'KafkaProducer.send'; pick one by its stable key:`,
#   rows :942 / :1061 with stored qualified name, kind, signature, two `rmap callers '<key>'` cursors, `hint: run one of the cursors above; a stable key names at most one symbol`;
#   `explain KafkaProducer --budget large` → class + `6 constructors also match:` six distinct keys; leveldb `explain Slice --budget large` → four distinct constructor cursors.
cap "$L/kafka"       jsah-kafka-callers-send     callers KafkaProducer.send
cap "$L/kafka"       jsah-kafka-callers-send-json callers --json KafkaProducer.send
cap "$L/kafka"       jsah-kafka-explain-kp       explain KafkaProducer --budget large
cap "$L/leveldb"     jsah-leveldb-explain-slice  explain Slice --budget large
cap "$L/leveldb"     jsah-leveldb-callers-slice-size callers Slice::size
cap "$L/leveldb"     jsah-leveldb-explain-writebatch explain WriteBatch

# README-vs-product probe (standing, human 2026-09-23): every command/flag the front-page README shows exists on this binary.
cap "$B/repo-graph"  readme-help-json            --help
echo "captures: $(ls "$OUT" | wc -l) files in $OUT"
