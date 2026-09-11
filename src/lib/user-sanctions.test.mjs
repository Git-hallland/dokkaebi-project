import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./user-sanction-input.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const sanctions = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const now = new Date("2026-09-11T00:00:00.000Z");

test("validates timed suspensions and permanent bans", () => {
  assert.equal(sanctions.normalizeUserSanctionInput({ type: "POST_SUSPENSION", endsAt: "2026-09-12T00:00:00.000Z", reason: "도배" }, now).reason, "도배");
  assert.equal(sanctions.normalizeUserSanctionInput({ type: "BAN" }, now).endsAt, null);
  assert.throws(() => sanctions.normalizeUserSanctionInput({ type: "COMMENT_SUSPENSION", endsAt: "2026-09-10T00:00:00.000Z" }, now), /이후/u);
  assert.throws(() => sanctions.normalizeUserSanctionInput({ type: "OTHER" }, now), /종류/u);
});

test("expired and revoked sanctions are inactive", () => {
  assert.equal(sanctions.isSanctionActive({ startsAt: "2026-09-10T00:00:00Z", endsAt: "2026-09-12T00:00:00Z", revokedAt: null }, now), true);
  assert.equal(sanctions.isSanctionActive({ startsAt: "2026-09-10T00:00:00Z", endsAt: "2026-09-10T12:00:00Z", revokedAt: null }, now), false);
  assert.equal(sanctions.isSanctionActive({ startsAt: "2026-09-10T00:00:00Z", endsAt: null, revokedAt: now }, now), false);
});

test("migration is additive and server guards preserve like/report suspension access", async () => {
  const [migration, post, comment, like, report] = await Promise.all([
    readFile(new URL("../../prisma/migrations/20260911090000_add_user_sanctions/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/posts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/posts/[id]/comments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/posts/[id]/like/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/posts/[id]/report/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(migration, /\b(?:DROP|TRUNCATE)\b|^\s*DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\b/imu);
  assert.match(post, /getBlockingSanction\(session\.user\.id, "POST"\)/u);
  assert.match(comment, /getBlockingSanction\(session\.user\.id, "COMMENT"\)/u);
  assert.doesNotMatch(like, /POST_SUSPENSION|COMMENT_SUSPENSION/u);
  assert.doesNotMatch(report, /POST_SUSPENSION|COMMENT_SUSPENSION/u);
});
