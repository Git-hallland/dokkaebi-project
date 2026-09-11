import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [script, vercelConfig, migration] = await Promise.all([
  readFile(new URL("../../scripts/vercel-build.mjs", import.meta.url), "utf8"),
  readFile(new URL("../../vercel.json", import.meta.url), "utf8"),
  readFile(new URL("../../prisma/migrations/20260911010000_add_supporters_and_report_reason/migration.sql", import.meta.url), "utf8"),
]);

test("Vercel migration gate targets only Prisma Postgres and the reviewed migration", () => {
  assert.match(script, /20260911010000_add_supporters_and_report_reason/u);
  assert.match(script, /hostname\.endsWith\("\.prisma\.io"\)/u);
  assert.match(script, /hostname\.endsWith\("\.postgres\.database\.azure\.com"\)/u);
  assert.match(script, /\["prisma", "migrate", "deploy", "--config", "prisma\.deploy\.config\.ts"\]/u);
  assert.doesNotMatch(script, /migrate\s+reset|db\s+push|--force/u);
});

test("Vercel invokes the gate and the reviewed migration is additive", () => {
  assert.match(vercelConfig, /"buildCommand": "node scripts\/vercel-build\.mjs"/u);
  assert.doesNotMatch(migration, /\b(?:DROP|TRUNCATE)\b|^\s*DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\b/imu);
});
