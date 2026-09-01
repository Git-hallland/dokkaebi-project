import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./community-comments.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("validates plain-text comment body", () => {
  assert.equal(lib.normalizeCommentBody("  댓글\n내용  "), "댓글\n내용");
  assert.throws(() => lib.normalizeCommentBody("   "));
  assert.throws(() => lib.normalizeCommentBody("x".repeat(1001)));
  assert.throws(() => lib.normalizeCommentBody("bad\u0000text"));
});

test("enforces comment ownership", () => {
  const comment = { authorId: "mine", deletedAt: null };
  assert.doesNotThrow(() => lib.assertCommentAuthor("mine", comment));
  assert.throws(() => lib.assertCommentAuthor("other", comment));
  assert.throws(() => lib.assertCommentAuthor("mine", { ...comment, deletedAt: new Date() }));
});

test("allows only a live same-post top-level reply parent", () => {
  assert.doesNotThrow(() => lib.assertReplyParent("post", { postId: "post", parentId: null, deletedAt: null }));
  assert.throws(() => lib.assertReplyParent("post", { postId: "other", parentId: null, deletedAt: null }));
  assert.throws(() => lib.assertReplyParent("post", { postId: "post", parentId: "root", deletedAt: null }));
});

test("rejects own-comment likes", () => {
  assert.throws(() => lib.assertCommentLikeAllowed("mine", { authorId: "mine", deletedAt: null }));
  assert.doesNotThrow(() => lib.assertCommentLikeAllowed("mine", { authorId: "other", deletedAt: null }));
});

test("prevents self notifications and creates deterministic non-PII keys", () => {
  assert.equal(lib.shouldNotify("me", "me"), false);
  assert.equal(lib.shouldNotify("you", "me"), true);
  assert.equal(lib.notificationDedupeKey("POST_LIKE", "post", "actor"), "post_like:post:actor");
  assert.equal(lib.notificationDedupeKey("COMMENT_REPLY", "reply"), "comment_reply:reply");
});
