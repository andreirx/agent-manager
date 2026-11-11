#!/usr/bin/env node
// PROTOTYPE — operator tool (2026-11-08). DEV ONLY: creates the glamCRM category set in a FIXED ORDER on an empty dev
// table so the publicIds (the first element of every internal codification) are deterministic. Idempotent: a category
// whose name already exists is skipped and reported. Human ruling 2026-11-08: "start fresh and make one labor category too".
// Order = dev's pre-2026 numbering (Parchet 1 … Profilele 7, which mirrors the stage/prod seed) + the four categories
// CATEGORY-SPLIT-1 introduced, appended. Names are the ASCII spellings `vendors/assemble-mapping.mjs` CATEGORIES uses,
// because the split workbooks' ` — <Categorie>` suffix must match the dev category name exactly.
// Usage: node scripts/glamcrm-dev-categories.mjs <api> <tokenFile> --yes
import fs from 'node:fs';
const [api, tokenFile, yes] = process.argv.slice(2);
if (!api || !tokenFile || yes !== '--yes') { console.error('usage: node scripts/glamcrm-dev-categories.mjs <api> <tokenFile> --yes'); process.exit(2); }
const H = { Authorization: `Bearer ${fs.readFileSync(tokenFile, 'utf8').trim()}`, 'Content-Type': 'application/json' };
const ORDER = [
  ['Parchet', true], ['Manopera', false], ['Plinte', true], ['Mocheta', true], ['Accesorii', true], ['Adezivi', true],
  ['Profilele', true], ['Ceramica', true], ['Vinil', true], ['Decking', true], ['Laminat', true],
  ['Panouri', true], // wall panels (human 2026-11-10: a new category), appended as 12
];
const existing = await (await fetch(`${api}/api/v2/categories`, { headers: H })).json();
if (!Array.isArray(existing)) { console.error('categories read failed:', JSON.stringify(existing).slice(0, 200)); process.exit(1); }
for (const [name, isMaterialType] of ORDER) {
  const hit = existing.find((c) => c.name === name);
  if (hit) { console.log(`skip ${name}: exists as publicId ${hit.publicId}`); continue; }
  const r = await fetch(`${api}/api/v2/categories`, { method: 'POST', headers: H, body: JSON.stringify({ name, isMaterialType }) });
  const c = await r.json();
  if (!r.ok) { console.error(`FAIL ${name}: ${r.status} ${JSON.stringify(c).slice(0, 200)}`); process.exit(1); }
  console.log(`created ${name}: publicId ${c.publicId} (${c.materialType ? 'Materiale' : 'Manopera'})`);
}
