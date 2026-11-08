#!/usr/bin/env node
// PROTOTYPE — operator tool (2026-11-08). DEV ONLY. The eight DEMO_TEST_* user records were seeded with ids like
// `DEMO_TEST_VANZATOR`; every create schema types a user reference as a 26-char ULID, so `POST /offers` refuses them as
// salesId/technicalId/… (400). Human: "Of course fix those accounts." This re-keys each such USER item to a fresh ULID in
// ONE transaction per user (Put new + Delete old; same username/cognitoId/role/names, so the Cognito login maps to the
// new record through `getByCognitoId` → `getByUsername`). Refuses a non-dev table. Prints old → new.
// Usage: node scripts/glamcrm-dev-rekey-demo-users.mjs <table> <region> --yes
import { createRequire } from 'node:module';
const req = createRequire('/Users/apple/Documents/APLICATII BIJUTERIE/glamCRM/serverless/package.json');
const { DynamoDBClient } = req('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, TransactWriteCommand } = req('@aws-sdk/lib-dynamodb');
const { ulid } = req('ulid');
const [table, region, yes] = process.argv.slice(2);
if (!table || !region || yes !== '--yes') { console.error('usage: node scripts/glamcrm-dev-rekey-demo-users.mjs <table> <region> --yes'); process.exit(2); }
if (!/dev/i.test(table)) { console.error(`REFUSED: table "${table}" is not a dev table`); process.exit(3); }
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const r = await db.send(new QueryCommand({ TableName: table, IndexName: 'GSI2', KeyConditionExpression: 'GSI2PK = :pk', ExpressionAttributeValues: { ':pk': 'TYPE#USER' } }));
const demo = (r.Items ?? []).filter((u) => /^DEMO_TEST_/.test(String(u.id)));
for (const old of demo) {
  const id = ulid();
  const item = { ...old, id, PK: `USER#${id}`, updatedAt: new Date().toISOString() };
  await db.send(new TransactWriteCommand({ TransactItems: [
    { Put: { TableName: table, Item: item, ConditionExpression: 'attribute_not_exists(PK)' } },
    { Delete: { TableName: table, Key: { PK: old.PK, SK: old.SK }, ConditionExpression: 'attribute_exists(PK)' } },
  ] }));
  console.log(`${old.username.padEnd(16)} ${old.role.padEnd(13)} ${old.id} → ${id}`);
}
console.log(`re-keyed ${demo.length} users`);
