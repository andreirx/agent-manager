#!/bin/bash
# v0.20.0 supplemental captures (audit round eight): re-probe every slice shipped since v0.19.0 against the ground
# truth recorded in its ROADMAP ship block (repo-graph docs/ROADMAP.md, blocks 2026-09-26 → 2026-10-03).
# Expects: RMAP_STATE_ROOT / RMAP_SOCKET_PATH exported to the ISOLATED audit-v0.20.0 root (settled: every repo indexed by
# the v0.20.0 smoke). Never the operator's real state root. Read-only: never index/refresh here. The rmap on PATH must be
# the installed 0.20.0 (`rmap --version` is captured first).
set -u
OUT="${AUDIT20_OUT:-/private/tmp/audit20/captures}"; mkdir -p "$OUT"
L="/Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases"
B="/Users/apple/Documents/APLICATII BIJUTERIE"
cap(){ local d="$1" n="$2"; shift 2; { echo "== CMD: rmap $*"; echo "== CWD: $d"; (cd "$d" && rmap "$@") 2>&1; echo "== EXIT: $?"; } > "$OUT/$n.txt"; echo "cap $n ($(wc -c < "$OUT/$n.txt") bytes)"; }
{ rmap --version; echo "state root: $RMAP_STATE_ROOT"; } > "$OUT/00-version.txt"; cat "$OUT/00-version.txt"

# TOOLCHAIN-STALENESS-1 (23d12a9b): on a fresh v0.20.0 index no toolchain line; check --json toolchain_staleness {"state":"current"}
cap "$L/leveldb"     ts1-leveldb-orient        orient
cap "$L/leveldb"     ts1-leveldb-check-json    check --json
# CPP-ATTRIBUTE-MACRO-1A (ddee0369): GUARDED_BY phantoms 0; 15 identity-undetermined members on explain <Type>
cap "$L/leveldb"     cam-leveldb-explain-dbtest explain db/db_test.cc
cap "$L/leveldb"     cam-leveldb-find-guarded   find GUARDED_BY
cap "$L/OpenXcom"    cam-openxcom-trust         trust
# PYTHON-SUBMODULE-IMPORT-1 (5a1b603f): wsgi.py:5 `from django.core.handlers import base` → base.py inferred, alt __init__.py
cap "$L/django"      psi-django-explain-wsgi    explain django/core/handlers/wsgi.py
cap "$L/django"      psi-django-imports-wsgi    imports django/core/handlers/wsgi.py --include-inferred
# DOCS-UNREADABLE-DECODE-1 (833e67b2): poco docs list 15 documents (16 JSON entries), README.txt byte hash
cap "$L/poco"        du-poco-docs-list          docs list
cap "$L/poco"        du-poco-docs-list-json     docs list --json
# PYTHON-RECEIVER-BINDING-1 (dac37a98): callers ListMixin.extend = 2 certain at :123/:141 + 266 inferred + 3 unresolved; trust states inferred beside the rate
cap "$L/django"      prb-django-callers-extend  callers ListMixin.extend
cap "$L/django"      prb-django-callers-extend-inferred callers ListMixin.extend --include-inferred --json
cap "$L/django"      prb-django-trust           trust
cap "$L/django"      prb-django-explain-extend  explain ListMixin.extend
# PORTABLE-TMP-1 (b8551d45): doctor renders the state root mode (socket route here; the stdio fallback is the operator-run check)
cap "$B/repo-graph"  ptmp-doctor                doctor
# DEPS-GRADLE-CATALOG-1A (24ca42ac): kafka clients row `no static import found 0`, 60 module rows, grgit gone; petclinic identical; grpc-java core loses guava classpath
cap "$L/kafka"       dgc-kafka-deps-list        deps list
cap "$L/kafka"       dgc-kafka-deps-list-json   deps list --json
cap "$L/spring-petclinic" dgc-petclinic-deps-list deps list
cap "$L/grpc-java"   dgc-grpc-deps-list         deps list
# TEST-EDGE-SCOPE-1A (df98b655): poco stats test files 796; explain CppUnit/include/CppUnit/Test.h → "test status: can't determine — open it and look inside"; complexity "2 of 97 ranked files"
cap "$L/poco"        tesa-poco-stats            stats
cap "$L/poco"        tesa-poco-explain-test-h   explain CppUnit/include/CppUnit/Test.h
cap "$L/poco"        tesa-poco-complexity       complexity
cap "$L/leveldb"     tesa-leveldb-explain-testutil explain util/testutil.cc
# TEST-EDGE-SCOPE-1B (f0693e28): poco Foundation→CppUnit leaves default modules deps (remainder stated); leveldb cycles omits db→table→db (named excluded), --include-tests restores; kafka trust zero-connectivity 34/65
cap "$L/poco"        tesb-poco-modules-deps     modules deps Foundation
cap "$L/poco"        tesb-poco-modules-deps-tests modules deps Foundation --include-tests
cap "$L/leveldb"     tesb-leveldb-cycles        cycles
cap "$L/leveldb"     tesb-leveldb-cycles-tests  cycles --include-tests
cap "$L/leveldb"     tesb-leveldb-modules-deps-table-tests modules deps table --include-tests
cap "$L/leveldb"     tesb-leveldb-imports-table-test imports table/table_test.cc
cap "$L/kafka"       tesb-kafka-trust           trust
cap "$L/kafka"       tesb-kafka-modules-list    modules list
# CPP-INCLUDE-BASENAME-1 (85001eec): nginx unresolved 299; ngx_config.h:26 inferred unique basename → src/os/unix/ngx_linux_config.h; ngx_core.h:52 ambiguous; poco elf.hpp:8 static unique suffix
cap "$L/nginx"       cib-nginx-imports-config   imports src/core/ngx_config.h --include-inferred
cap "$L/nginx"       cib-nginx-imports-core     imports src/core/ngx_core.h --include-inferred --json
cap "$L/nginx"       cib-nginx-trust            trust
cap "$L/nginx"       cib-nginx-modules-list     modules list
cap "$L/poco"        cib-poco-imports-elf       imports dependencies/cpptrace/src/binary/elf.hpp
# TS-WORKSPACE-RESOLUTION-1 (5dc4d997): FRAKTAG server.ts:6 @fraktag/engine → packages/engine/src/index.ts inferred (workspace source entry); amodx subpath unresolved; storybook addon-links unresolved
cap "$B/FRAKTAG"     twr-fraktag-imports-server imports packages/api/src/server.ts --include-inferred
cap "$B/FRAKTAG"     twr-fraktag-imports-server-json imports packages/api/src/server.ts --include-inferred --json
cap "$B/FRAKTAG"     twr-fraktag-modules-list   modules list
cap "$B/FRAKTAG"     twr-fraktag-trust          trust
cap "$B/amodx"       twr-amodx-imports-toolbar  imports admin/src/components/editor/Toolbar.tsx --include-inferred
cap "$L/storybook"   twr-storybook-imports-button imports code/frameworks/ember/template/cli/Button.stories.js --include-inferred
# README-vs-product probe (human direction 2026-09-23): every command/flag the README shows must exist in the binary under audit
cap "$B/repo-graph"  readme-help                --help
cap "$B/repo-graph"  readme-contracts           contracts --json
echo "captures: $(ls "$OUT" | wc -l | tr -d ' ') in $OUT"
