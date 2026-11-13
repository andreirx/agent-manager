#!/usr/bin/env node
// glamcrm-dev-rehearsal.mjs — operator tool (PROTOTYPE). Imports every built 2026 workbook into the glamCRM DEV stack
// through the real API (upload → create pricelist → import), records each import result, and writes a results file.
// DEV ONLY: reversible rehearsal data. Usage: node scripts/glamcrm-dev-rehearsal.mjs <api> <tokenFile> <outDir> <resultsJson> [only=substring]
import fs from 'node:fs';
import path from 'node:path';
const [api, tokenFile, outDir, resultsJson, only] = process.argv.slice(2);
// SPLIT MODE (CATEGORY-SPLIT-1, human 2026-11-07 "wipe dev products and import fresh"): `only` = 'SPLIT' imports every
// `<list> — <Categorie>.xlsx` in outDir: producer = the first word(s) of the list name as in `plan`, category = the suffix
// after ' — ' (created on dev when missing), VAT 0 % except KUBERIT (19 %, human ruling). One pricelist per file.
// REPLACE MODE (human 2026-11-10, dev re-import): `only` = 'REPLACE:<substring>' takes the split workbooks whose name contains the
// substring and imports each as a REPLACEMENT VERSION of the one ACTIVE pricelist with the same producer + category + uploaded file name (`replacesId`);
// zero or several such lists -> that file is refused (recorded, nothing created). Unverified on live: the list route's field names.
const REPLACE = !!only && only.startsWith('REPLACE:');
const SPLIT = !!only && (only.startsWith('SPLIT') || REPLACE); // 'SPLIT' = every split workbook; 'SPLIT:<substring>' = only those whose name contains it
const SPLIT_FILTER = SPLIT && only.includes(':') ? only.slice(only.indexOf(':') + 1) : '';
const token = fs.readFileSync(tokenFile, 'utf8').trim();
const H = { Authorization: `Bearer ${token}` };
// Category / VAT mapping for the DEV rehearsal — an operator ASSUMPTION, listed as a Monday question (the category is
// the first segment of every minted codification; the real mapping is the client's).
// Categories are ALWAYS resolved by name from the live dev API (per-run cache only). 2026-11-08: a hardcoded id map here
// survived the category wipe and 35 lists were created against deleted category ids → the importer refused every row
// (categoryPublicId=""), leaving empty pricelist shells (the swallow defect GC-IMPORT-PARITY-1 made them 201s).
const CAT = {};
const VAT0 = '01KEEZ2ZNFBYX4BV5N735WDJTZ', VAT19 = '01KECM0MJR7MT0YHDE8S1JM8QF';
const plan = [
  ['BOEN wood 2026.xlsx', 'BOEN', 'Parchet', VAT0],
  ['BerryAlloc parquet 2026.xlsx', 'BerryAlloc', 'Parchet', VAT0],
  ['BerryAlloc Univers parquet 2026.xlsx', 'BerryAlloc', 'Parchet', VAT0],
  ['BerryAlloc laminate 2026.xlsx', 'BerryAlloc', 'Parchet', VAT0],
  ['BerryAlloc by BA laminate 2026.xlsx', 'BerryAlloc', 'Parchet', VAT0],
  ['BerryAlloc LVT SPC 2026.xlsx', 'BerryAlloc', 'Parchet', VAT0],
  ['ITC Belysse Arc Edition carpet 2026.xlsx', 'ITC Belysse', 'Mocheta', VAT0],
  ['LANO carpet 2026.xlsx', 'LANO', 'Mocheta', VAT0],
  ['Forbo Eurocol adhesives 2026.xlsx', 'Forbo Eurocol', 'Adezivi', VAT0],
  ['Greenflor vinyl 2026.xlsx', 'Greenflor', 'Parchet', VAT0],
  ['Gerflor vinyl 2026.xlsx', 'Gerflor', 'Parchet', VAT0],
  ['Tuscania ceramica 2026.xlsx', 'Tuscania', 'Ceramica', VAT0],
  ['Dr. Schutz floor care 2026.xlsx', 'Dr. Schutz', 'Accesorii', VAT0], // producer of two words: the first-word rule would give 'Dr.'
  ['ALPOD laminate 2025.xlsx', 'ALPOD', 'Parchet', VAT0],
  ['ALPOD wood 2025.xlsx', 'ALPOD', 'Parchet', VAT0],
  ['ALPOD SPC 2025.xlsx', 'ALPOD', 'Parchet', VAT0],
  ['ALPOD vinyl 2025.xlsx', 'ALPOD', 'Parchet', VAT0],
  ['ALPOD decking 2025.xlsx', 'ALPOD', 'Parchet', VAT0],
  ['ALPOD skirting 2025.xlsx', 'ALPOD', 'Plinte', VAT0],
  ['ALPOD transition profiles 2025.xlsx', 'ALPOD', 'Profilele', VAT0],
  ['ALPOD underlays 2025.xlsx', 'ALPOD', 'Accesorii', VAT0],
  ['ALPOD floor care 2025.xlsx', 'ALPOD', 'Accesorii', VAT0],
];
async function ensureCategory(name) {
  if (CAT[name]) return CAT[name];
  const list = await (await fetch(`${api}/api/v2/categories`, { headers: H })).json();
  const hit = list.find((c) => c.name === name);
  if (hit) return (CAT[name] = hit.id);
  const r = await fetch(`${api}/api/v2/categories`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, isMaterialType: true }) });
  const c = await r.json(); if (!r.ok) throw new Error(`category ${name}: ${r.status} ${JSON.stringify(c).slice(0, 200)}`);
  return (CAT[name] = c.id);
}
const results = fs.existsSync(resultsJson) ? JSON.parse(fs.readFileSync(resultsJson, 'utf8')) : [];
// Every outcome (absent file, failed upload, import response) is written to the results file and
// echoed, so a silent run cannot hide a failure (2026-11-06: an expired token produced 401 on
// upload and the run printed nothing).
let stopRun = false;
function record(rec) {
  results.push(rec); fs.writeFileSync(resultsJson, JSON.stringify(results, null, 2));
  // REPLACE mode stops at the first failed file (2026-11-13: a second large file was sent after the first had failed).
  if (REPLACE && rec.step && !String(rec.step).startsWith('replace-target')) { console.log(`STOP: ${rec.file} failed at ${rec.step}; no further file is sent.`); stopRun = true; }
  if (rec.skipped || rec.step) console.log(`${rec.status ?? '-'} ${rec.file.padEnd(40)} ${rec.skipped ? 'SKIPPED absent' : `FAILED at ${rec.step}: ${rec.body}`}`);
}
const producerOf = (file) => { const base = file.split(' — ')[0]; const hit = plan.find(([f]) => f.replace('.xlsx', '') === base); return hit ? hit[1] : base.split(' ')[0]; };
const splitPlan = SPLIT ? fs.readdirSync(outDir).filter((f) => f.endsWith('.xlsx') && f.includes(' — ') && (!SPLIT_FILTER || f.includes(SPLIT_FILTER))).sort().map((f) => {
  const cat = f.split(' — ')[1].replace('.xlsx', '');
  return [f, producerOf(f), cat, /^KUBERIT/i.test(f) ? VAT19 : VAT0];
}) : null;
if (SPLIT) console.log(`split mode: ${splitPlan.length} workbooks`);
for (const [file, producer, cat, vat] of (splitPlan ?? plan)) {
  if (stopRun) break;
  if (only && !SPLIT && !file.includes(only)) continue;
  const p = path.join(outDir, file); if (!fs.existsSync(p)) { record({ file, skipped: 'absent' }); continue; }
  const t0 = Date.now();
  const uploadName = file.replace(/ — /g, ' - ').replace(/[^\x20-\x7e]/g, '_');
  const categoryId = await ensureCategory(cat);
  let replacesId = null;
  if (REPLACE) {
    const lr = await fetch(`${api}/api/v2/pricelists`, { headers: { ...H, 'Accept-Encoding': 'gzip' } });
    const lj = await lr.json(); const lists = Array.isArray(lj) ? lj : (lj.items ?? lj.data ?? []);
    // Target = the ONE active list of this producer + category that was uploaded under this same file name (the API stores
    // `<ms>_<uuid>_<x-file-name>`). Producer + category alone is ambiguous (2026-11-13: ALPOD, BerryAlloc, IVC, KUBERIT each
    // hold several active lists in one category), so the file name is part of the identity.
    const hits = lists.filter((x) => x.active && x.producerName === producer && x.categoryId === categoryId && String(x.fileName ?? '').endsWith(`_${uploadName}`));
    if (hits.length !== 1) { record({ file, step: 'replace-target (nothing uploaded)', status: lr.status, body: `expected exactly 1 active ${producer} / ${cat} pricelist uploaded as "${uploadName}", found ${hits.length}` }); continue; }
    replacesId = hits[0].id;
  }
  const up = await fetch(`${api}/api/v2/files`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'x-file-name': uploadName }, body: fs.readFileSync(p) });
  const upj = await up.json(); if (!up.ok) { record({ file, step: 'upload', status: up.status, body: JSON.stringify(upj).slice(0, 300) }); continue; }
  const body = { producerName: producer, categoryId, applicableVatId: vat, fileName: upj.key, introducedAt: new Date().toISOString(), active: true, replacesId };
  const cr = await fetch(`${api}/api/v2/pricelists`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await cr.text(); let j = null; try { j = JSON.parse(text); } catch {}
  const ir = j?.importResult || null;
  const items = ir?.items || [];
  const rec = { file, producer, category: cat, vat: vat === VAT0 ? '0' : '19', status: cr.status, seconds: Math.round((Date.now() - t0) / 100) / 10,
    pricelistId: j?.id, publicId: j?.publicId, replacesId, added: ir?.added, replaced: ir?.replaced, removed: ir?.removed, items: items.length,
    importResultNull: j ? ir === null : undefined, error: cr.ok ? undefined : text.slice(0, 300), firstItems: items.slice(0, 2).map((i) => ({ name: i.name, code: i.producerCode, format: i.format, collection: i.collectionName })) };
  record(rec);
  if (REPLACE && (!cr.ok || ir === null)) { console.log(`STOP: ${file}: status ${cr.status}, import result ${ir === null ? 'absent' : 'present'}; no further file is sent.`); stopRun = true; }
  console.log(`${cr.status} ${file.padEnd(40)} added ${rec.added ?? '-'} replaced ${rec.replaced ?? '-'} ${rec.importResultNull ? 'IMPORT RESULT NULL (refused?)' : ''} ${rec.seconds}s`);
}
console.log('results →', resultsJson);
