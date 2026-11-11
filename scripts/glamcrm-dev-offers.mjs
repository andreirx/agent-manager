#!/usr/bin/env node
// PROTOTYPE — operator tool (2026-11-08). DEV ONLY. Human: "maybe remake some of the offers on the dev site too if they
// point to old products" — after the product wipe every offer item on dev pointed at a deleted product (77/77).
// 1. Deletes the offer world from the DEV table through DynamoDB: OFFER, OFFERITEM, ESTIMATE, ETAPA, PROJECT, INSTALLMENT,
//    and the GENERATED documents (`isGenerated === 'true'` — offer/deviz PDFs; uploads are kept). Refuses a non-dev table.
// 2. Rebuilds offers THROUGH THE API (the real write path: zod boundary, canonical snapshot, codification, S1 deal
//    serialization): N offers for real clients, 2–5 lines each on ACTIVE products from different pricelists, list price as
//    unit price, a few discounts; K of them issued as devize (POST /estimates → POST /estimates/{id}/generate-doc), two
//    put UNDER_REVIEW, the rest DRAFT. Assignees are the seed users; the first offer is OWNED by test-vanzator (the demo
//    accounts carry ULID ids since the 2026-11-08 re-key). Every quantity is a whole number of packages (see qtyFor).
// Usage: node scripts/glamcrm-dev-offers.mjs <api> <tokenFile> <table> <region> <resultsJson> --yes [offers=10] [issued=6] | remake=<snapshot.json>
import fs from 'node:fs';
import { createRequire } from 'node:module';
const req = createRequire('/Users/apple/Documents/APLICATII BIJUTERIE/glamCRM/serverless/package.json');
const { DynamoDBClient } = req('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } = req('@aws-sdk/lib-dynamodb');

const [api, tokenFile, table, region, resultsJson, yes, ...rest] = process.argv.slice(2);
if (!api || !tokenFile || !table || !region || !resultsJson || yes !== '--yes') {
  console.error('usage: node scripts/glamcrm-dev-offers.mjs <api> <tokenFile> <table> <region> <resultsJson> --yes [offers=10] [issued=6]'); process.exit(2);
}
if (!/dev/i.test(table)) { console.error(`REFUSED: table "${table}" is not a dev table`); process.exit(3); }
const opt = Object.fromEntries(rest.map((a) => a.split('=')));
const N_OFFERS = Number(opt.offers ?? 10), N_ISSUED = Number(opt.issued ?? 6);
const H = { Authorization: `Bearer ${fs.readFileSync(tokenFile, 'utf8').trim()}`, 'Content-Type': 'application/json' };
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const results = { wiped: {}, assignees: {}, probe: null, offers: [], errors: [] };

// ---------- 1. wipe ----------
async function keysOf(type, keep = () => false) {
  const keys = []; let ExclusiveStartKey;
  do {
    const r = await db.send(new QueryCommand({ TableName: table, IndexName: 'GSI2', KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `TYPE#${type}` }, ExclusiveStartKey }));
    for (const it of r.Items ?? []) if (!keep(it)) keys.push({ PK: it.PK, SK: it.SK });
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return keys;
}
async function deleteAll(keys) {
  let done = 0;
  for (let i = 0; i < keys.length; i += 25) {
    let batch = keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } }));
    for (let attempt = 0; batch.length && attempt < 8; attempt++) {
      const r = await db.send(new BatchWriteCommand({ RequestItems: { [table]: batch } }));
      const left = r.UnprocessedItems?.[table] ?? []; done += batch.length - left.length; batch = left;
      if (batch.length) await new Promise((res) => setTimeout(res, 200 * (attempt + 1)));
    }
    if (batch.length) throw new Error(`${batch.length} unprocessed at ${i}`);
  }
  return done;
}
for (const type of ['OFFERITEM', 'INSTALLMENT', 'ESTIMATE', 'ETAPA', 'PROJECT', 'OFFER']) {
  const keys = await keysOf(type); results.wiped[type] = await deleteAll(keys); console.log(`wiped ${type}: ${results.wiped[type]}`);
}
{ const keys = await keysOf('DOCUMENT', (it) => String(it.isGenerated) !== 'true'); results.wiped.DOCUMENT_generated = await deleteAll(keys); console.log(`wiped generated DOCUMENT: ${keys.length}`); }

// ---------- 2. rebuild through the API ----------
const get = async (p, extra = {}) => { const r = await fetch(`${api}${p}`, { headers: { ...H, ...extra } }); if (!r.ok) throw new Error(`GET ${p} ${r.status}`); return r.json(); };
const post = async (p, body) => { const r = await fetch(`${api}${p}`, { method: 'POST', headers: H, body: JSON.stringify(body) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; } return { ok: r.ok, status: r.status, body: j }; };
const put = async (p, body) => { const r = await fetch(`${api}${p}`, { method: 'PUT', headers: H, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }; };

const users = await get('/api/v2/users');
const byUsername = (u) => users.find((x) => x.username === u) ?? (() => { throw new Error(`user ${u} missing`); })();
const assignees = { salesId: byUsername('john.doe').id, technicalId: byUsername('tech.lead').id, accountantId: byUsername('accountant').id, managerId: byUsername('jane.smith').id };
results.assignees = assignees;
const vat21 = (await get('/api/v2/applicable-vat')).find((v) => Number(v.percentage) === 21)?.id;
if (!vat21) throw new Error('no 21 % VAT on dev');
const clients = (await get('/api/v2/clients')).filter((c) => c.name && c.name !== 'undefined' && !/^[a-z]{6,}$/.test(c.name));
const products = await get('/api/v2/products', { 'Accept-Encoding': 'gzip' });
const active = products.filter((p) => p.active && Number(p.listPrice) > 0);
const byList = new Map(); for (const p of active) (byList.get(p.priceListId) ?? byList.set(p.priceListId, []).get(p.priceListId)).push(p);
const lists = [...byList.entries()].filter(([, ps]) => ps.length >= 3).sort((a, b) => b[1].length - a[1].length);
console.log(`users ${users.length} · clients ${clients.length} · active products ${active.length} in ${lists.length} pricelists`);

// ---------- 2b. REMAKE MODE (human 2026-11-11: "remake any existing offers and estimates on dev on the new products") ----------
// `remake=<snapshot.json>`: instead of the synthetic offers below, rebuild the offers a snapshot recorded BEFORE the product
// wipe (per offer: the offer, its estimates, its lines each with the old product's identity). Each line is re-pointed at the
// ACTIVE product of the same producer with the same identity, tried in this order: code + name + collection + format; code +
// name; code alone when exactly one product carries it; name + collection + format whatever the code (the importer's own
// fallback — LANO's codes changed `LSOK-290` -> `SOK 290` and the products kept their identity). A line with no match is NOT
// guessed: it is left out and listed under `unmatched`. Quantity: the old one, rounded UP to a whole package when the new
// product has a packaging unit. Unit price: the new list price when the old line was at the old list price, else the old price.
if (opt.remake) {
  const snap = JSON.parse(fs.readFileSync(opt.remake, 'utf8'));
  const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const producerOf = (p) => norm(String(p.producerName ?? '').split(' - ')[0]);
  const idx = [new Map(), new Map(), new Map(), new Map()];
  const keys = (p) => { const pr = producerOf(p), c = norm(p.producerCode);
    return [c ? `${pr}|${c}|${norm(p.name)}|${norm(p.collectionName)}|${norm(p.format)}` : null, c ? `${pr}|${c}|${norm(p.name)}` : null, c ? `${pr}|${c}` : null, `${pr}|${norm(p.name)}|${norm(p.collectionName)}|${norm(p.format)}`]; };
  for (const p of active) keys(p).forEach((k, n) => { if (k) (idx[n].get(k) ?? idx[n].set(k, []).get(k)).push(p); });
  const find = (old) => { const ks = keys(old); for (let n = 0; n < 4; n++) { const hit = ks[n] && idx[n].get(ks[n]); if (hit && hit.length === 1) return { p: hit[0], rule: n }; } return null; };
  results.unmatched = [];
  for (const s of snap) {
    const o = s.offer; const rec = { internalName: o.internalName, client: o.clientName, oldStatus: o.status, lines: [], status: 'DRAFT' };
    const cr = await post('/api/v2/offers', { internalName: o.internalName, clientId: o.clientId, applicableVatId: o.applicableVatId, salesId: o.salesId, technicalId: o.technicalId, accountantId: o.accountantId, managerId: o.managerId, technicalComment: o.technicalComment ?? '', accountingComment: o.accountingComment ?? '', managerComment: o.managerComment ?? '' });
    if (!cr.ok) { results.errors.push({ step: 'offer', name: o.internalName, status: cr.status, body: cr.body }); console.log(`offer FAILED ${cr.status} ${o.internalName}`); continue; }
    rec.offerId = cr.body.id;
    for (const { item, product: old } of s.items) {
      const m = old && find(old);
      if (!m) { results.unmatched.push({ offer: o.internalName, producer: old?.producerName, code: old?.producerCode, name: old?.name, collection: old?.collectionName, format: old?.format, file: old?.file }); continue; }
      const p = m.p; const pu = Number(p.packagingUnit); let qty = Number(item.quantity);
      if (Number.isFinite(pu) && pu > 0) qty = Number((Math.max(1, Math.ceil(Number((qty / pu).toFixed(6)))) * pu).toFixed(2));
      const atList = Number(item.unitPrice) === Number(old.listPrice);
      const line = { offerId: rec.offerId, productId: p.id, customProductName: item.customProductName === old.name ? p.name : item.customProductName, quantity: qty, unitPrice: atList ? Number(p.listPrice) : Number(item.unitPrice), discountApplied: Number(item.discountApplied ?? 0) };
      const li = await post('/api/v2/offer-items', line);
      if (!li.ok) { results.errors.push({ step: 'item', offer: o.internalName, status: li.status, body: li.body, product: p.internalCodification }); continue; }
      rec.lines.push({ cod: p.internalCodification, oldCod: old.internalCodification, rule: m.rule, producer: p.producerName, code: p.producerCode, name: p.name, um: p.measurementUnit, qty, oldQty: Number(item.quantity), price: line.unitPrice, oldPrice: Number(item.unitPrice), disc: line.discountApplied });
    }
    const est = s.estimate[0];
    if (est && rec.lines.length) {
      const e = await post('/api/v2/estimates', { offerId: rec.offerId, exchangeRateId: '', paymentPercentage_1: est.paymentPercentage_1, paymentPercentage_2: est.paymentPercentage_2, paymentPercentage_3: est.paymentPercentage_3, paymentPercentage_4: est.paymentPercentage_4 });
      if (!e.ok) results.errors.push({ step: 'estimate', offer: o.internalName, status: e.status, body: e.body });
      else { rec.estimateId = e.body.id;
        const g = await post(`/api/v2/estimates/${e.body.id}/generate-doc`, { companyData: '', clientData: o.clientName ?? '', contractClauses: '', allSignatures: '' });
        if (!g.ok) results.errors.push({ step: 'generate-doc', offer: o.internalName, status: g.status, body: g.body });
        else { rec.status = 'ISSUED'; rec.totalRON = g.body.frozenTotalRON ?? g.body.totalRON ?? null; } }
    } else if (o.status === 'UNDER_REVIEW') { const u = await put(`/api/v2/offers/${rec.offerId}`, { status: 'UNDER_REVIEW' }); rec.status = u.ok ? 'UNDER_REVIEW' : `DRAFT (review PUT ${u.status})`; }
    results.offers.push(rec);
    console.log(`remade ${rec.status.padEnd(12)} ${rec.lines.length}/${s.items.length} lines  ${rec.internalName}`);
  }
  fs.writeFileSync(resultsJson, JSON.stringify(results, null, 1));
  console.log(`done: ${results.offers.length} offers, ${results.offers.reduce((n, x) => n + x.lines.length, 0)} lines, ${results.unmatched.length} unmatched, ${results.errors.length} errors → ${resultsJson}`);
  process.exit(0);
}

// deterministic pseudo-random so a rerun builds the same offers
let seed = 20261108; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
// PACKAGING RULE (human 2026-11-08: quantities that are not multiples of the packaging unit were generated here and the API
// accepted them — the rule lived only in the browsers). The raw quantity is rounded UP to a whole number of packages when the
// product has a packaging unit > 0 — the same `Math.ceil(q / pu) * pu` the admin page and the workspace apply — then to 2 dp.
const qtyFor = (p) => {
  const um = p.measurementUnit;
  const raw = /mp|m2|m²/i.test(um) ? Math.round((12 + rnd() * 70) * 10) / 10 : /ml|lm|m$/i.test(um) ? Math.round(5 + rnd() * 55) : 1 + Math.floor(rnd() * 20);
  const pu = Number(p.packagingUnit);
  if (!Number.isFinite(pu) || pu <= 0) return raw;
  return Number((Math.max(1, Math.ceil(raw / pu)) * pu).toFixed(2));
};

// The DEMO salesperson (test-vanzator; a ULID since the 2026-11-08 re-key) OWNS the first offer, so the salesperson demo
// account has an offer of its own in the workspace. (The former probe of the non-ULID id is gone with its cause.)
const demo = users.find((u) => u.username === 'test-vanzator');
results.demoSalesperson = demo ? demo.id : null;

const THEMES = ['Living + hol', 'Apartament 3 camere', 'Casă P+1 — parter', 'Birouri etaj 2', 'Showroom', 'Pensiune — 6 camere', 'Mansardă', 'Magazin', 'Grădiniță', 'Terasă + scară', 'Vilă — zona de zi', 'Studio'];
for (let i = 0; i < N_OFFERS; i++) {
  const client = clients[i % clients.length];
  const rec = { internalName: `${THEMES[i % THEMES.length]} — ${client.name}`, client: client.name, lines: [], status: 'DRAFT' };
  const o = await post('/api/v2/offers', { internalName: rec.internalName, clientId: client.id, applicableVatId: vat21, ...assignees, ...(i === 0 && demo ? { salesId: demo.id } : {}), technicalComment: '', accountingComment: '', managerComment: '' });
  if (i === 0 && demo) rec.salesId = demo.id;
  if (!o.ok) { results.errors.push({ step: 'offer', i, status: o.status, body: o.body }); console.log(`offer ${i} FAILED ${o.status}`); continue; }
  rec.offerId = o.body.id;
  // 2–5 lines from 2–3 different pricelists (floor + accessory/plinth where possible)
  const nLines = 2 + Math.floor(rnd() * 4);
  const chosenLists = new Set(); while (chosenLists.size < Math.min(3, lists.length)) chosenLists.add(pick(lists.slice(0, 20)));
  const pool = [...chosenLists].flatMap(([, ps]) => ps);
  const used = new Set();
  for (let k = 0; k < nLines; k++) {
    let p; do { p = pick(pool); } while (used.has(p.id) && used.size < pool.length); used.add(p.id);
    const line = { offerId: rec.offerId, productId: p.id, customProductName: p.name, quantity: qtyFor(p), unitPrice: Number(p.listPrice), discountApplied: [0, 0, 5, 10][Math.floor(rnd() * 4)] };
    const li = await post('/api/v2/offer-items', line);
    if (!li.ok) { results.errors.push({ step: 'item', offer: rec.offerId, status: li.status, body: li.body, product: p.internalCodification }); continue; }
    rec.lines.push({ cod: p.internalCodification, producer: p.producerName, name: p.name, um: p.measurementUnit, qty: line.quantity, price: line.unitPrice, disc: line.discountApplied });
  }
  if (i < N_ISSUED) {
    const e = await post('/api/v2/estimates', { offerId: rec.offerId, exchangeRateId: '', paymentPercentage_1: 30, paymentPercentage_2: 30, paymentPercentage_3: 30, paymentPercentage_4: 10 });
    if (!e.ok) { results.errors.push({ step: 'estimate', offer: rec.offerId, status: e.status, body: e.body }); }
    else {
      rec.estimateId = e.body.id;
      const g = await post(`/api/v2/estimates/${e.body.id}/generate-doc`, { companyData: '', clientData: client.name, contractClauses: '', allSignatures: '' });
      if (!g.ok) results.errors.push({ step: 'generate-doc', estimate: e.body.id, status: g.status, body: g.body });
      else { rec.status = 'ISSUED'; rec.generatedDate = g.body.generatedDate; rec.totalRON = g.body.frozenTotalRON ?? g.body.totalRON ?? null; }
    }
  } else if (i < N_ISSUED + 2) {
    const u = await put(`/api/v2/offers/${rec.offerId}`, { status: 'UNDER_REVIEW' });
    rec.status = u.ok ? 'UNDER_REVIEW' : `DRAFT (review PUT ${u.status})`;
  }
  results.offers.push(rec);
  console.log(`offer ${i + 1}/${N_OFFERS} ${rec.status.padEnd(12)} ${rec.lines.length} lines  ${rec.internalName}`);
}
fs.writeFileSync(resultsJson, JSON.stringify(results, null, 1));
console.log(`done: ${results.offers.length} offers, ${results.offers.reduce((n, o) => n + o.lines.length, 0)} lines, ${results.offers.filter((o) => o.status === 'ISSUED').length} issued, ${results.errors.length} errors → ${resultsJson}`);
