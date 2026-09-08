#!/bin/bash
# v0.18.0 supplemental captures: re-probe every slice shipped since v0.17.0 against known ground truth.
# Expects: RMAP_STATE_ROOT / RMAP_SOCKET_PATH exported to the ISOLATED audit-v0.18.0 root (settled, all
# repos indexed by the v0.18.0 smoke). Never the operator's real state root.
set -u
OUT=/private/tmp/audit18/captures; mkdir -p "$OUT"
L="/Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases"
B="/Users/apple/Documents/APLICATII BIJUTERIE"
cap(){ local d="$1" n="$2"; shift 2; { echo "== CMD: $*"; (cd "$d" && rmap "$@") 2>&1; echo "== EXIT: $?"; } > "$OUT/$n.txt"; echo "cap $n ($(wc -c < "$OUT/$n.txt")b)"; }
# uncontended retests of any batch-load bounces (fill in after the smoke)
# IMPORT-RESOLUTION-RUST-1 / JAVA-1: module graphs exist; zero-states carry counts
cap "$B/repo-graph"  ir-rg-modules      modules list
cap "$B/repo-graph"  ir-rg-cycles       cycles
cap "$B/repo-graph"  ir-rg-trust        trust
cap "$L/kafka"       ir-kafka-modules   modules list
cap "$L/kafka"       ir-kafka-cycles    cycles
cap "$L/grpc-java"   ir-grpc-modules    modules list
cap "$L/hadoop"      ir-hadoop-modules  modules list
cap "$L/leveldb"     ir-leveldb-modules modules list
# MODULES-METHOD-1: method line + recommendation, repo-specific
cap "$L/hadoop"      mm-hadoop-orient   orient --budget large
cap "$L/vcmi"        mm-vcmi-modules    modules list
cap "$B/FRAKTAG"     mm-fraktag-modules modules list
# CPP-DECLARATORS-1 + SYMBOL-IDENTITY-1: names, decl/def, hand-off
cap "$L/hadoop"      cpp-hadoop-orient  orient --budget large
cap "$L/vcmi"        cpp-find-hero      find CGHeroInstance
cap "$L/vcmi"        cpp-explain-hero   explain CGHeroInstance
cap "$L/leveldb"     si-explain-recover explain DBImpl::Recover
cap "$L/leveldb"     si-callers-recover callers leveldb::DBImpl::Recover
cap "$L/leveldb"     si-callees-recover callees leveldb::DBImpl::Recover
cap "$L/django"      si-explain-getresp explain BaseHandler.get_response
cap "$L/spring-petclinic" si-callers-pcf callers OwnerController.processCreationForm
# DEPS-CLASSIFIER-1 / 1B
cap "$L/django"      dc-django-deps     deps list
cap "$L/django"      dc-django-npm      deps list --ecosystem npm
cap "$L/storybook"   dc-storybook-deps  deps list
cap "$B/FRAKTAG"     dc-fraktag-deps    deps list
# HEADLINE-TRUTH-1
cap "$L/grpc-java"   ht-grpc-orient     orient --budget large
cap "$L/grpc-java"   ht-grpc-stats      stats
cap "$L/leveldb"     ht-leveldb-orient  orient --budget medium
cap "$L/zvec-grep"   ht-zvec-full       orient --full
cap "$L/spring-petclinic" ht-pc-surfaces surfaces list
cap "$B/glamCRM"     ht-glam-surfaces   surfaces list
cap "$B/repo-graph"  ht-rg-inferences   inferences list
cap "$B/repo-graph"  ht-rg-dead         dead
cap "$L/vscode"      ht-vscode-orient   orient --budget large
# SEED-CHUNK-3
cap "$B/FRAKTAG"     sc3-persist        find "where are conversations persisted to disk"
cap "$L/leveldb"     sc3-recovery       find "how does the database recover after a crash"
# AUDIT5-MINORS-1
cap "$L/vscode"      a5-vscode-docs     docs list
cap "$L/hadoop"      a5-hadoop-docs     docs list
cap "$B/repo-graph"  a5-rg-docs         docs list
cap "$L/gstreamer"   a5-gst-boundaries  boundaries list
cap "$B/repo-graph"  a5-callers-nf      callers definitelyNotASymbolZzz
cap "$B/repo-graph"  a5-rg-trust        trust
cap "$B/repo-graph"  a5-rg-doctor       doctor
cap "$B/FRAKTAG"     a5-fraktag-surfaces surfaces list
# EXIT-CODES-1
cap "$B/repo-graph"  ec-dead            dead
cap "$L/django"      ec-orient-full     orient --full
# DAEMON-RESIDUALS-2 (doctor fields; repo rebuild verb usage text only — NEVER run it here)
cap "$B/repo-graph"  dr-doctor          doctor
cap "$B/repo-graph"  dr-rebuild-help    repo rebuild --help
echo ALL-SUPPLEMENTAL-DONE
