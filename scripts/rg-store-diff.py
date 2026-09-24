#!/usr/bin/env python3
"""rg-store-diff — the standard before/after store oracle for repo-graph slices (operator tool, 2026-09-24).

Dumps the served facts of two rmap state roots as NORMALIZED row sets keyed by stable identity and diffs them:
  files       (path) → language, is_test, is_generated, is_excluded
  nodes       (stable_key) → path, kind, subtype, name, qualified_name, line/col span, signature, visibility, doc_comment, metadata_json, parent stable_key
  edges       (source stable_key, target stable_key, type, line/col span) → resolution, extractor family, metadata_json, is_type_only
  unresolved  (source stable_key, target_key, type, line/col span) → category, classification, basis_code, metadata_json, extractor family
Row identifiers, snapshot/repo uids (also stripped from stable keys), timestamps and extractor VERSIONS are never compared (the extractor family is).

Usage:
  rg-store-diff.py <before-root> <after-root> [--ignore-metadata-keys k1,k2] [--only tables] [--summary]
                   [--expect '<table>:<n>' ...]   # exact number of differing rows allowed for a table (default 0)
Exit 0 iff every table's differing-row count equals its expectation. Prints per-table counts and up to 8 sample
differences per table. Reads with SQLite `immutable=1` (never writes, never serves); refuses a store whose `-wal` file is non-empty (an immutable read would miss its pages).
"""
import sys, os, glob, json, sqlite3, argparse

def open_ro(root):
    dbs = glob.glob(root + "/databases/*.db")
    if len(dbs) != 1: sys.exit(f"rg-store-diff: expected exactly one database under {root}/databases, found {len(dbs)}")
    # `immutable=1` reads the main file only: pages still in an uncheckpointed WAL are invisible. A store the
    # daemon closed cleanly has no `-wal` (or an empty one); anything else is refused rather than read short
    # (TEST-EDGE-SCOPE-1B review-0 F-TESB-FIELD, 2026-09-24). Stop the serving daemon (its exit checkpoints) first.
    wal = dbs[0] + "-wal"
    if os.path.exists(wal) and os.path.getsize(wal) > 0:
        sys.exit(f"rg-store-diff: {wal} holds {os.path.getsize(wal)} uncheckpointed bytes — stop the daemon that serves {root} (a clean exit checkpoints the WAL) and rerun; refusing to read a partial store")
    return sqlite3.connect("file:" + dbs[0] + "?immutable=1", uri=True)

def latest_snapshot(c):
    row = c.execute("select snapshot_uid from snapshots where status='ready' order by created_at desc limit 1").fetchone()
    if not row: sys.exit("rg-store-diff: no ready snapshot")
    return row[0]

def norm_md(s, ignore):
    if s is None: return None
    try: d = json.loads(s)
    except Exception: return s
    if isinstance(d, dict):
        for k in ignore: d.pop(k, None)
        return json.dumps(d, sort_keys=True)
    return json.dumps(d, sort_keys=True)

import re
_REPO = re.compile(r"^repo_[a-z0-9]+:")
def sk(k):
    """stable key without the per-index repo uid prefix (the same corpus re-indexed gets a new uid; the key is otherwise stable)."""
    return None if k is None else _REPO.sub("", k)

def family(extractor):
    return None if extractor is None else extractor.split(":")[0]

def dump(c, snap, ignore):
    out = {}
    out["files"] = {r[0]: (r[1], r[2], r[3], r[4]) for r in c.execute(
        "select f.path, f.language, f.is_test, f.is_generated, f.is_excluded from files f join file_versions v on v.file_uid=f.file_uid where v.snapshot_uid=?", (snap,))}
    parent = {}
    cols = [r[1] for r in c.execute("pragma table_info(nodes)")]
    has_parent = "parent_node_uid" in cols
    q = ("select n.stable_key, f.path, n.kind, n.subtype, n.name, n.qualified_name, n.line_start, n.col_start, n.line_end, n.col_end, "
         "n.signature, n.visibility, n.doc_comment, n.metadata_json" + (", p.stable_key" if has_parent else ", null") +
         " from nodes n left join files f on f.file_uid=n.file_uid" + (" left join nodes p on p.node_uid=n.parent_node_uid" if has_parent else "") + " where n.snapshot_uid=?")
    out["nodes"] = {}
    for r in c.execute(q, (snap,)):
        out["nodes"][sk(r[0])] = tuple(r[1:13]) + (norm_md(r[13], ignore), sk(r[14]))
    out["edges"] = {}
    for r in c.execute("select s.stable_key, t.stable_key, e.type, e.line_start, e.col_start, e.line_end, e.col_end, e.resolution, e.extractor, e.metadata_json, e.is_type_only "
                       "from edges e join nodes s on s.node_uid=e.source_node_uid join nodes t on t.node_uid=e.target_node_uid where e.snapshot_uid=?", (snap,)):
        key = (sk(r[0]), sk(r[1])) + tuple(r[2:7]); val = (r[7], family(r[8]), norm_md(r[9], ignore), r[10])
        out["edges"].setdefault(key, []).append(val)
    out["unresolved"] = {}
    for r in c.execute("select s.stable_key, u.target_key, u.type, u.line_start, u.col_start, u.line_end, u.col_end, u.category, u.classification, u.basis_code, u.metadata_json, u.extractor "
                       "from unresolved_edges u join nodes s on s.node_uid=u.source_node_uid where u.snapshot_uid=?", (snap,)):
        key = (sk(r[0]),) + tuple(r[1:7]); val = (r[7], r[8], r[9], norm_md(r[10], ignore), family(r[11]))
        out["unresolved"].setdefault(key, []).append(val)
    for t in ("edges", "unresolved"):
        out[t] = {k: tuple(sorted(v, key=lambda x: json.dumps(x, default=str))) for k, v in out[t].items()}
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("before"); ap.add_argument("after")
    ap.add_argument("--ignore-metadata-keys", default=""); ap.add_argument("--only", default="files,nodes,edges,unresolved")
    ap.add_argument("--expect", action="append", default=[]); ap.add_argument("--summary", action="store_true")
    a = ap.parse_args()
    ignore = [k for k in a.ignore_metadata_keys.split(",") if k]
    expect = {}
    for e in a.expect:
        t, n = e.split(":"); expect[t] = int(n)
    cb, ca = open_ro(a.before), open_ro(a.after)
    B, A = dump(cb, latest_snapshot(cb), ignore), dump(ca, latest_snapshot(ca), ignore)
    ok = True
    for t in [x for x in a.only.split(",") if x]:
        b, af = B[t], A[t]
        only_b = [k for k in b if k not in af]; only_a = [k for k in af if k not in b]; changed = [k for k in b if k in af and b[k] != af[k]]
        n = len(only_b) + len(only_a) + len(changed)
        want = expect.get(t, 0)
        status = "OK" if n == want else "DIFF"
        if n != want: ok = False
        print(f"{t}: before={len(b)} after={len(af)} removed={len(only_b)} added={len(only_a)} changed={len(changed)} total_differing={n} expected={want} {status}")
        if not a.summary and n != want:
            for k in only_b[:8]: print("  - removed:", k)
            for k in only_a[:8]: print("  + added:", k)
            for k in changed[:8]: print("  ~ changed:", k, "\n      before:", b[k], "\n      after: ", af[k])
    print("RG-STORE-DIFF", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
