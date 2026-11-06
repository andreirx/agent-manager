#!/usr/bin/env node
// glamcrm-dev-rehearsal.mjs — operator tool (PROTOTYPE). Imports every built 2026 workbook into the glamCRM DEV stack
// through the real API (upload → create pricelist → import), records each import result, and writes a results file.
// DEV ONLY: reversible rehearsal data. Usage: node scripts/glamcrm-dev-rehearsal.mjs <api> <tokenFile> <outDir> <resultsJson> [only=substring]
import fs from 'node:fs';
import path from 'node:path';
const [api, tokenFile, outDir, resultsJson, only] = process.argv.slice(2);
const token = fs.readFileSync(tokenFile, 'utf8').trim();
const H = { Authorization: `Bearer ${token}` };
// Category / VAT mapping for the DEV rehearsal — an operator ASSUMPTION, listed as a Monday question (the category is
// the first segment of every minted codification; the real mapping is the client's).
const CAT = { Parchet: '01KECM0M89CKN20WS0PWXT80WF', Mocheta: '01KECM0M9N3CG6H3S3H9658VZX', Plinte: '01KECM0MCK9ESVQB968QPE8XPD', Accesorii: '01KECM0MH3GZVFJAYZA4DJYRN4', Adezivi: '01KECM0MFK91HPMGTMTZMA71XD', Profilele: '01KECM0ME114173P8V921FNMH2' };
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
for (const [file, producer, cat, vat] of plan) {
  if (only && !file.includes(only)) continue;
  const p = path.join(outDir, file); if (!fs.existsSync(p)) { results.push({ file, skipped: 'absent' }); continue; }
  const t0 = Date.now();
  const up = await fetch(`${api}/api/v2/files`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'x-file-name': file }, body: fs.readFileSync(p) });
  const upj = await up.json(); if (!up.ok) { results.push({ file, step: 'upload', status: up.status, body: JSON.stringify(upj).slice(0, 300) }); continue; }
  const categoryId = await ensureCategory(cat);
  const body = { producerName: producer, categoryId, applicableVatId: vat, fileName: upj.key, introducedAt: new Date().toISOString(), active: true, replacesId: null };
  const cr = await fetch(`${api}/api/v2/pricelists`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await cr.text(); let j = null; try { j = JSON.parse(text); } catch {}
  const ir = j?.importResult || null;
  const items = ir?.items || [];
  const rec = { file, producer, category: cat, vat: vat === VAT0 ? '0' : '19', status: cr.status, seconds: Math.round((Date.now() - t0) / 100) / 10,
    pricelistId: j?.id, publicId: j?.publicId, added: ir?.added, replaced: ir?.replaced, removed: ir?.removed, items: items.length,
    importResultNull: j ? ir === null : undefined, error: cr.ok ? undefined : text.slice(0, 300), firstItems: items.slice(0, 2).map((i) => ({ name: i.name, code: i.producerCode, format: i.format, collection: i.collectionName })) };
  results.push(rec); fs.writeFileSync(resultsJson, JSON.stringify(results, null, 2));
  console.log(`${cr.status} ${file.padEnd(40)} added ${rec.added ?? '-'} replaced ${rec.replaced ?? '-'} ${rec.importResultNull ? 'IMPORT RESULT NULL (refused?)' : ''} ${rec.seconds}s`);
}
console.log('results →', resultsJson);
