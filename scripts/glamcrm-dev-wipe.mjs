#!/usr/bin/env node
// PROTOTYPE — operator tool. Maturity: PROTOTYPE (dev only, by construction).
// DEV ONLY: deletes every PRODUCT and PRICELIST item from the glamCRM DEV DynamoDB table so the split 2026 lists can be
// imported fresh (human ruling 2026-11-07: "you can wipe dev products and import fresh"). Refuses any table whose name does
// not contain "dev". Reads the keys through GSI2 (`GSI2PK = TYPE#PRODUCT` / `TYPE#PRICELIST`, the repositories' own
// index) and deletes by PK/SK in batches of 25 with retry of unprocessed items. Prints counts only.
// Usage: node scripts/glamcrm-dev-wipe.mjs <tableName> <region> --yes
import { createRequire } from 'node:module';
const req = createRequire('/Users/apple/Documents/APLICATII BIJUTERIE/glamCRM/serverless/package.json');
const { DynamoDBClient } = req('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } = req('@aws-sdk/lib-dynamodb');

const [table, region, yes] = process.argv.slice(2);
if (!table || !region) { console.error('usage: node scripts/glamcrm-dev-wipe.mjs <tableName> <region> --yes'); process.exit(2); }
if (!/dev/i.test(table)) { console.error(`REFUSED: table "${table}" is not a dev table`); process.exit(3); }
if (yes !== '--yes') { console.error('REFUSED: pass --yes to delete (dev only)'); process.exit(3); }

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function keysOf(type) {
  const keys = []; let ExclusiveStartKey;
  do {
    const r = await db.send(new QueryCommand({ TableName: table, IndexName: 'GSI2', KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `TYPE#${type}` }, ProjectionExpression: 'PK, SK', ExclusiveStartKey }));
    for (const it of r.Items ?? []) keys.push({ PK: it.PK, SK: it.SK });
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
      const left = r.UnprocessedItems?.[table] ?? [];
      done += batch.length - left.length; batch = left;
      if (batch.length) await new Promise((res) => setTimeout(res, 200 * (attempt + 1)));
    }
    if (batch.length) throw new Error(`${batch.length} items still unprocessed after retries at offset ${i}`);
  }
  return done;
}

for (const type of ['PRODUCT', 'PRICELIST']) {
  const keys = await keysOf(type);
  const before = keys.length;
  const deleted = await deleteAll(keys);
  const after = (await keysOf(type)).length;
  console.log(`${type}: found ${before}, deleted ${deleted}, remaining ${after}`);
}
