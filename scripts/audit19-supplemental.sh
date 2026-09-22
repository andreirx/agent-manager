#!/bin/bash
# v0.19.0 supplemental captures (audit round seven): re-probe every slice shipped since v0.18.0 against its recorded
# ground truth (probe table extracted from repo-graph docs/ROADMAP.md ship blocks, 2026-09-23).
# Expects: RMAP_STATE_ROOT / RMAP_SOCKET_PATH exported to the ISOLATED audit-v0.19.0 root (settled, all repos indexed
# by the v0.19.0 smoke; seeds available). Never the operator's real state root. Read-only: never index/refresh here.
set -u
OUT=/private/tmp/audit19/captures; mkdir -p "$OUT"
L="/Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases"
B="/Users/apple/Documents/APLICATII BIJUTERIE"
cap(){ local d="$1" n="$2"; shift 2; { echo "== CMD: $*"; (cd "$d" && rmap "$@") 2>&1; echo "== EXIT: $?"; } > "$OUT/$n.txt"; echo "cap $n ($(wc -c < "$OUT/$n.txt") bytes)"; }
# TRUST-MODULE-EDGES-1 (Q2) + ALIAS-SUSPICION-1: suspicious modules from the derived edge set; alias reason names a module or disappears
cap "$B/repo-graph"  tme-rg-trust        trust
cap "$B/repo-graph"  tme-rg-modules-deps modules deps
cap "$L/kafka"       tme-kafka-trust     trust
cap "$L/kafka"       as-kafka-deps       deps list
cap "$L/hadoop"      tme-hadoop-trust    trust
cap "$B/FRAKTAG"     as-fraktag-trust    trust
cap "$B/FRAKTAG"     as-fraktag-trust-json trust --json
cap "$L/vcmi"        as-vcmi-trust       trust
# CALL-BINDING-RECEIVER-1 (Q1): the fabricated self-row is gone; callers anchor real sites
cap "$L/leveldb"     cbr-leveldb-callers-recover callers "leveldb::DBImpl::Recover"
cap "$L/leveldb"     cbr-leveldb-trust   trust
cap "$L/OpenXcom"    cbr-openxcom-trust  trust
cap "$L/poco"        cbr-poco-trust      trust
cap "$L/nginx"       cbr-nginx-trust     trust
# CPP-INCLUDE-ROOTS-1 (Q3): poco module pairs; a real cycle; ambiguous includes counted never bound
cap "$L/poco"        cir-poco-modules    modules list
cap "$L/poco"        cir-poco-cycles     cycles
cap "$L/poco"        cir-poco-modules-json modules list --json
cap "$L/OpenXcom"    cir-openxcom-modules modules list
cap "$L/vcmi"        cir-vcmi-modules    modules list
# EXPLAIN-CYCLES-HONEST-1 (Q4): explain's ring == cycles' ring on the same index; large SCC rendered unordered
cap "$L/leveldb"     ech-leveldb-explain-recover explain "leveldb::DBImpl::Recover"
cap "$L/leveldb"     ech-leveldb-cycles  cycles
cap "$L/vcmi"        ech-vcmi-explain-hero explain CGHeroInstance
cap "$L/vcmi"        ech-vcmi-cycles     cycles
# DEPS-ECOSYSTEM-PARTITION-1 (Q5): per-ecosystem views; foreign-file references named, never "undeclared"
cap "$L/django"      dep-django-deps     deps list
cap "$L/django"      dep-django-deps-npm deps list --ecosystem npm
cap "$L/gstreamer"   dep-gstreamer-deps  deps list
cap "$L/gstreamer"   dep-gstreamer-deps-cargo deps list --ecosystem cargo
cap "$B/FRAKTAG"     dep-fraktag-deps-npm deps list --ecosystem npm
cap "$L/nginx"       dep-nginx-deps      deps list
# EXPLAIN-TYPE-SECTIONS-1 (Q6): explain <Type> renders Members / Referenced by
cap "$L/vcmi"        ets-vcmi-explain-hero-medium explain CGHeroInstance --budget medium
cap "$L/django"      ets-django-explain-basehandler explain BaseHandler
cap "$B/FRAKTAG"     ets-fraktag-explain-cm explain ConversationManager
cap "$L/leveldb"     ets-leveldb-explain-dbimpl explain "leveldb::DBImpl"
# COMPLEXITY-SCOPE-1 (Q7): generated/vendored/test symbols excluded from complexity centers, stated
cap "$L/poco"        cs-poco-orient      orient
cap "$L/poco"        cs-poco-docs        docs list
cap "$L/codegraph"   cs-codegraph-orient orient
cap "$L/codegraph"   cs-codegraph-orient-all orient --include-all
cap "$B/repo-graph"  cs-rg-orient        orient
cap "$L/leveldb"     cs-leveldb-orient   orient
cap "$L/leveldb"     cs-leveldb-hotspots hotspots
# DOCS-DISCOVERY-1 (Q8): documentation found where the authors put it; refusals stated; recommendation from the same stems
cap "$L/hadoop"      dd-hadoop-docs      docs list
cap "$L/hadoop"      dd-hadoop-docs-json docs list --json
cap "$L/hadoop"      dd-hadoop-modules   modules list
cap "$L/hadoop"      dd-hadoop-orient-medium orient --budget medium
cap "$L/django"      dd-django-docs      docs list
cap "$L/django"      dd-django-orient-medium orient --budget medium
cap "$L/buildroot"   dd-buildroot-docs   docs list
cap "$L/leveldb"     dd-leveldb-docs     docs list
cap "$L/grpc-java"   dd-grpc-docs        docs list
cap "$B/FRAKTAG"     dd-fraktag-docs     docs list
cap "$L/kafka"       dd-kafka-docs       docs list
# PYTHON-SELF-BINDING-1 (Q9): self.<m> binds through the MRO; ambiguous collisions stay unresolved and named
cap "$L/django"      psb-django-explain-get-response explain "BaseHandler.get_response"
cap "$L/django"      psb-django-callers-get-response callers "BaseHandler.get_response"
cap "$L/django"      psb-django-trust    trust
cap "$L/django"      psb-django-explain-autodetector explain "MigrationAutodetector._get_dependencies_for_model"
# SEED-DOCUMENT-1: the working method reaches the floor on the requirement's own query; controls unchanged
cap "$B/FRAKTAG"     sd-fraktag-find-persist find "where are conversations persisted to disk"
cap "$B/FRAKTAG"     sd-fraktag-find-persist-json find "where are conversations persisted to disk" --json
cap "$B/FRAKTAG"     sd-fraktag-find-hash find "how are content atoms hashed"
cap "$B/FRAKTAG"     sd-fraktag-find-tree find "where are tree nodes saved to disk"
cap "$L/leveldb"     sd-leveldb-find-crash find "crash recovery"
# hand-off family (the round-six defect class): find → explain → callers on symbol identity
cap "$L/leveldb"     ho-leveldb-find-recover find "DBImpl::Recover"
cap "$L/django"      ho-django-find-get-response find "get_response"
echo "captures: $(ls "$OUT" | wc -l)"
