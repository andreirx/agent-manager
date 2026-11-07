#!/usr/bin/env node
// PROTOTYPE — operator tool (2026-11-07). Builds the client-review APPENDIX workbook for the Monday meeting from the
// pl-tools outputs: every processed pricelist (unsplit and split), every exception / packaging decision / category
// assignment with the vendor's text quoted, the dev import results, and the client's verbatim rows for the discussion
// items. Reads only; writes ONE .xlsx. Usage:
//   node scripts/glamcrm-client-review.mjs <glamCRM root> <dev results json> <out xlsx>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [rootArg, devJson, outXlsx] = process.argv.slice(2); const root = rootArg && path.resolve(rootArg);
if (!root || !devJson || !outXlsx) { console.error('usage: node scripts/glamcrm-client-review.mjs <glamCRM root> <dev results json> <out xlsx>'); process.exit(2); }
const req = createRequire(path.join(root, 'serverless', 'package.json'));
const XLSX = req('xlsx');
const OUT = path.join(root, 'pl-tools', 'out');
const CLIENT = path.join(root, 'fwdlistedepreturiglamourfloors2026');

const readCsv = (file) => {
  if (!fs.existsSync(file)) return [];
  const wb = XLSX.read(fs.readFileSync(file, 'utf8'), { type: 'string' });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
};
const walk = (dir, pred, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc); else if (pred(p)) acc.push(p);
  }
  return acc;
};
const isProductRow = (x) => (x[1] || x[2]) && (x[3] || x[4]);

// 1. Lists: unsplit and split workbooks with importer counts, image coverage, packaging coverage.
const report = JSON.parse(fs.readFileSync(path.join(OUT, 'assemble-report.json'), 'utf8'));
const lists = [];
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith('.xlsx')).sort()) {
  const wb = XLSX.readFile(path.join(OUT, f));
  let products = 0, withImage = 0, withPack = 0, blankCode = 0;
  for (const sn of wb.SheetNames) {
    const R = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
    for (const x of R.slice(1)) { if (!isProductRow(x)) continue; products++; if (x[9]) withImage++; if (x[7] && x[7] !== '0') withPack++; if (!x[2]) blankCode++; }
  }
  const rep = report.find((w) => w.out === f);
  const importer = rep ? rep.sheets.reduce((n, s) => n + (s.importer?.productRows ?? 0), 0) : '';
  const split = f.includes(' — ');
  lists.push({ workbook: f, kind: split ? 'split (per category)' : 'unsplit (per supplier file)', category: split ? f.split(' — ')[1].replace('.xlsx', '') : '',
    sheets: wb.SheetNames.join(', '), 'product rows (workbook scan)': products, 'products (importer view)': importer, 'with image link': withImage, 'with packaging multiple': withPack, 'without producer code': blankCode });
}

// 2. Exceptions (best guesses) — every row, vendor text quoted.
const exceptions = [];
for (const f of walk(OUT, (p) => p.endsWith('.exceptions.csv'))) {
  const rel = path.relative(OUT, f); const vendor = rel.split(path.sep)[0]; const sheet = path.basename(f).replace('.exceptions.csv', '');
  for (const r of readCsv(f)) exceptions.push({ vendor, sheet, ...r });
}

// 3. Packaging decisions (PACKAGING-FROM-SPECS-1) — every derived / question / malformed / unmatched row.
const packaging = [];
for (const f of walk(OUT, (p) => p.endsWith('.review.csv'))) {
  const rel = path.relative(OUT, f); const vendor = rel.split(path.sep)[0]; const sheet = path.basename(f).replace('.review.csv', '');
  for (const r of readCsv(f)) if (String(r.type || '').startsWith('packaging-')) packaging.push({ vendor, sheet, ...r });
}

// 4. Categories (CATEGORY-SPLIT-1) — every product's category and the rule that assigned it.
const categories = [];
for (const f of walk(path.join(OUT, 'categories'), (p) => p.endsWith('.categories.csv'))) {
  const workbook = path.basename(f).replace('.categories.csv', '');
  for (const r of readCsv(f)) categories.push({ workbook, ...r });
}

// 5. Dev import results.
const dev = fs.existsSync(devJson) ? JSON.parse(fs.readFileSync(devJson, 'utf8')) : [];
const devRows = dev.map((r) => ({ workbook: r.file, producer: r.producer, category: r.category, vat: r.vat, status: r.status, publicId: r.publicId, added: r.added, replaced: r.replaced, removed: r.removed, seconds: r.seconds, error: r.error || r.body || r.skipped || '' }));

// 6. Verbatim client rows for the discussion items (file, sheet, header row, row).
const QUOTES = [
  ['C2 held row example', /GERFLOR 2023\.xlsx/, /Access/i, /DRAIN KNIFE|GERFIX SUPER|TARACLEAN 1L/i, 3],
  ['C3 Creation 55 twins (GERFLOR 2023 sheet)', /GERFLOR 2023\.xlsx/, /^GERFLOR 2023$/, /^(6066|6067|6069|6089|3664)\b/, 5],
  ['C3 Creation 55 twins (Creation 55 sheet)', /GERFLOR 2023\.xlsx/, /^Creation 55$/, /^(6066|6067|6069|6089|3664)\b/, 5],
  ['C3 code 2000', /GERFLOR 2023\.xlsx/, /^GERFLOR 2023$/, /^2000\b/, 2],
  ['C4 BerryAlloc unit conflicts', /BERRYALLOC LVT/, null, /HP Glue|LVT Cleaner|PU protector/i, 6],
  ['C4 BerryAlloc HPGLUE (laminate)', /BERRYALLOC DPL/, null, /HP Glue/i, 2],
  ['C5 ZENN LL 55 Tiles Square', /BERRYALLOC LVT/, null, /Tiles Square/i, 2],
  ['C6 Tuscania stone rows', /TUSCANIA/, /TUSCANIA 2026/, /30x30|MIXED SIZE|15X30|La Leccese\/Colosseo/i, 8],
  ['C7 LANO quality rows (sample)', /LANO/, null, /^(Basalt|Boheme|Zen|Granit)/i, 4],
  ['C14 LANO red/green rows: colour is formatting — see sheet', /LANO/, null, /^$/, 0],
  ['C21 Mural Ultra Design (roll, cut tax *)', /GERFLOR 2023\.xlsx/, /^GERFLOR 2023$/, /\| Mural Ultra Design \|/i, 1],
  ['C21 Mipolam Affinity (roll, cut tax *)', /GERFLOR 2023\.xlsx/, /^GERFLOR 2023$/, /\| Mipolam Affinity \|/i, 1],
  ['C21 weld rod (per coil)', /GERFLOR 2023\.xlsx/, /Access/i, /WELD ROD .*CR40$/i, 1],
  ['C22 ALPOD plank row (no box content)', /ALPOD/, null, /^$/, 0],
];
const quotes = [];
for (const [item, filePat, sheetPat, rowPat, max] of QUOTES) {
  const f = fs.existsSync(CLIENT) ? fs.readdirSync(CLIENT).find((n) => filePat.test(n) && /^Ach/.test(n)) : null;
  if (!f || !max) { quotes.push({ item, file: f || '(no client file)', note: max ? 'file not found' : 'see the workbook / discussion text' }); continue; }
  const wb = XLSX.readFile(path.join(CLIENT, f));
  let n = 0;
  for (const sn of wb.SheetNames) {
    if (sheetPat && !sheetPat.test(sn)) continue;
    const R = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
    let hdr = null;
    for (let i = 0; i < R.length && n < max; i++) {
      const row = R[i]; const txt = row.join(' | ');
      if (hdr == null && /pre[tț]|price|cod|art/i.test(txt) && row.filter(Boolean).length > 3) hdr = i;
      if (rowPat.test(txt) || rowPat.test(String(row[0]))) {
        quotes.push({ item, file: f, sheet: sn, row: i + 1, 'header row': hdr == null ? '' : R[hdr].slice(0, 14).join(' | '), 'client row (verbatim)': row.slice(0, 14).join(' | ') });
        n++;
      }
    }
  }
  if (!n) quotes.push({ item, file: f, note: 'no matching row' });
}

// 7. Write the appendix.
const wb = XLSX.utils.book_new();
const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: 'none' }]), name.slice(0, 31));
add('Lists', lists);
add('Dev import', devRows);
add('Exceptions (best guess)', exceptions);
add('Packaging decisions', packaging);
add('Categories', categories);
add('Client rows quoted', quotes);
fs.mkdirSync(path.dirname(outXlsx), { recursive: true });
XLSX.writeFile(wb, outXlsx);
console.log(`lists ${lists.length} (split ${lists.filter((l) => l.category).length}) | dev ${devRows.length} | exceptions ${exceptions.length} | packaging ${packaging.length} | categories ${categories.length} | quotes ${quotes.length} → ${outXlsx}`);
