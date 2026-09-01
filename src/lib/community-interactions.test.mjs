import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./community-interactions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("rejects own-post likes and deleted posts", () => {
  assert.throws(() => lib.assertLikeAllowed("me", { authorId: "me", deletedAt: null }), /자신/);
  assert.throws(() => lib.assertLikeAllowed("me", { authorId: "other", deletedAt: new Date() }), /찾을 수/);
  assert.doesNotThrow(() => lib.assertLikeAllowed("me", { authorId: "other", deletedAt: null }));
});

test("validates reading progress including boundaries", () => {
  assert.equal(lib.normalizeReadingProgress(0), 0);
  assert.equal(lib.normalizeReadingProgress(1), 1);
  for (const invalid of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY, "0.5", null]) assert.throws(() => lib.normalizeReadingProgress(invalid));
});

test("signs viewer identity and rejects altered signatures", () => {
  const secret = "test-secret";
  const id = "A".repeat(32);
  const cookie = lib.createViewerCookie(secret, id);
  assert.equal(lib.verifyViewerCookie(cookie, secret), id);
  assert.equal(lib.verifyViewerCookie(`${id}.invalid`, secret), null);
  assert.equal(lib.verifyViewerCookie(undefined, secret), null);
  assert.equal(lib.hashViewerIdentifier(id, secret), lib.hashViewerIdentifier(id, secret));
});

test("uses a Seoul calendar day for daily view dedupe", () => {
  assert.equal(lib.getSeoulDate(new Date("2026-09-01T14:59:59Z")).toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(lib.getSeoulDate(new Date("2026-09-01T15:00:00Z")).toISOString(), "2026-09-02T00:00:00.000Z");
});

test("restores only meaningful mid-article progress", () => {
  assert.equal(lib.shouldRestoreProgress(0.049), false);
  assert.equal(lib.shouldRestoreProgress(0.05), true);
  assert.equal(lib.shouldRestoreProgress(0.95), true);
  assert.equal(lib.shouldRestoreProgress(0.951), false);
});

test("keeps duplicate like/favorite and repeated unlike operations idempotent", () => {
  assert.equal(lib.didCreateOrRemoveRelation(1), true);
  assert.equal(lib.didCreateOrRemoveRelation(0), false);
  assert.equal(lib.decrementLikeCountSafely(2), 1);
  assert.equal(lib.decrementLikeCountSafely(0), 0);
});
