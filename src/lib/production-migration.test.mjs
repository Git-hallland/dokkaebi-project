import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [script, packageJson, migration] = await Promise.all([
  readFile(new URL("../../scripts/deploy-production-migrations.mjs", import.meta.url), "utf8"),
  readFile(new URL("../../package.json", import.meta.url), "utf8"),
  readFile(new URL("../../prisma/migrations/20260911010000_add_supporters_and_report_reason/migration.sql", import.meta.url), "utf8"),
]);

test("production migration gate targets only Prisma Postgres and one reviewed migration", () => {
  assert.match(script, /process\.env\.VERCEL_ENV !== "production"/u);
  assert.match(script, /hostname\.endsWith\("\.prisma\.io"\)/u);
  assert.match(script, /dokkaebi-postgres-dev\.postgres\.database\.azure\.com/u);
  assert.match(script, /pending\.length !== 1 \|\| pending\[0\] !== TARGET_MIGRATION/u);
  assert.match(script, /\["prisma", "migrate", "deploy"\]/u);
  assert.doesNotMatch(script, /migrate\s+reset|db\s+push|--force/u);
});

test("production build invokes the gate and the reviewed migration is additive", () => {
  assert.match(packageJson, /"build": "node scripts\/deploy-production-migrations\.mjs && next build"/u);
  assert.doesNotMatch(migration, /\b(?:DROP|TRUNCATE)\b|^\s*DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\b/imu);
});
