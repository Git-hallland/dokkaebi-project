import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./guide-community.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const paragraph = (text) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

test("validates category and title", () => {
  assert.throws(() => lib.normalizeCommunityCategory("NEWS"));
  assert.throws(() => lib.normalizeCommunityTitle("한"));
  assert.equal(lib.normalizeCommunityTitle("  좋은 공략  "), "좋은 공략");
});

test("accepts only an allowlisted meaningful document", () => {
  assert.equal(lib.normalizeCommunityDocument(paragraph("내용")).type, "doc");
  assert.throws(() => lib.normalizeCommunityDocument({ type: "doc", content: [{ type: "script" }] }));
  assert.throws(() => lib.normalizeCommunityDocument({ type: "doc", content: [{ type: "paragraph" }] }));
});

test("rejects unsafe links", () => {
  const body = paragraph("링크");
  body.content[0].content[0].marks = [{ type: "link", attrs: { href: "javascript:alert(1)" } }];
  assert.throws(() => lib.normalizeCommunityDocument(body));
});

test("accepts only verified Cloudinary video nodes", () => {
  const src = "https://res.cloudinary.com/demo/video/upload/v1/dokkaebi/posts/videos/staging/123e4567-e89b-12d3-a456-426614174000.mp4";
  const body = { type: "doc", content: [{ type: "video", attrs: { src } }] };
  assert.equal(lib.normalizeCommunityDocument(body, "demo").content[0].attrs.src, src);
  assert.throws(() => lib.normalizeCommunityDocument({ type: "doc", content: [{ type: "youtube", attrs: { videoId: "dQw4w9WgXcQ" } }] }, "demo"));
  assert.throws(() => lib.normalizeCommunityDocument({ type: "doc", content: [{ type: "video", attrs: { src: "https://example.com/clip.mp4" } }] }, "demo"));
});

test("accepts the real TipTap 3 image shape and strips null resize attrs", () => {
  const src = "https://res.cloudinary.com/demo/image/upload/v1/dokkaebi/posts/staging/123e4567-e89b-12d3-a456-426614174000.png";
  const body = { type: "doc", content: [{ type: "image", attrs: { src, alt: "", title: null, width: null, height: null } }] };
  assert.deepEqual(lib.normalizeCommunityDocument(body, "demo").content[0], { type: "image", attrs: { src, alt: "", title: null } });
  const nullTextAttrs = { type: "doc", content: [{ type: "image", attrs: { src, alt: null, title: null, width: null, height: null } }] };
  assert.deepEqual(lib.normalizeCommunityDocument(nullTextAttrs, "demo").content[0], { type: "image", attrs: { src, alt: "", title: null } });
});

test("image validation rejects arbitrary or active attributes", () => {
  const src = "https://res.cloudinary.com/demo/image/upload/v1/dokkaebi/posts/staging/123e4567-e89b-12d3-a456-426614174000.webp";
  const image = (attrs) => ({ type: "doc", content: [{ type: "image", attrs }] });
  assert.throws(() => lib.normalizeCommunityDocument(image({ src, alt: null, title: null, width: null, height: null, style: "width:9999px" }), "demo"));
  assert.throws(() => lib.normalizeCommunityDocument(image({ src, alt: null, title: null, width: null, height: null, onerror: "alert(1)" }), "demo"));
  assert.throws(() => lib.normalizeCommunityDocument(image({ src, alt: null, title: null, width: 900, height: null }), "demo"));
  assert.throws(() => lib.normalizeCommunityDocument(image({ src: "https://example.com/image.png", alt: null, title: null, width: null, height: null }), "demo"));
});

test("create and edit payloads share normalized image validation", () => {
  const src = "https://res.cloudinary.com/demo/image/upload/v1/dokkaebi/posts/staging/123e4567-e89b-12d3-a456-426614174000.jpg";
  const payload = { category: "GUIDE", title: "이미지 공략", body: { type: "doc", content: [{ type: "image", attrs: { src, alt: null, title: null, width: null, height: null } }] } };
  const createInput = lib.normalizeCommunityPostInput(payload, "demo");
  const editInput = lib.normalizeCommunityPostInput(structuredClone(payload), "demo");
  assert.deepEqual(createInput, editInput);
  const unsafeCreate = structuredClone(payload);
  unsafeCreate.body.content[0].attrs.onerror = "alert(1)";
  const unsafeEdit = structuredClone(unsafeCreate);
  assert.throws(() => lib.normalizeCommunityPostInput(unsafeCreate, "demo"));
  assert.throws(() => lib.normalizeCommunityPostInput(unsafeEdit, "demo"));
});

test("enforces author ownership", () => {
  assert.throws(() => lib.assertCommunityAuthor(null, "author"), /로그인/);
  assert.throws(() => lib.assertCommunityAuthor("other", "author"), /작성자/);
  assert.doesNotThrow(() => lib.assertCommunityAuthor("author", "author"));
});

test("marks only posts younger than 24 hours as new", () => {
  const now = new Date("2026-09-01T12:00:00Z");
  assert.equal(lib.isNewCommunityPost(new Date("2026-08-31T12:00:01Z"), now), true);
  assert.equal(lib.isNewCommunityPost(new Date("2026-08-31T12:00:00Z"), now), false);
});

test("formats relative time before 24 hours and a Seoul date afterwards", () => {
  const now = new Date("2026-09-01T12:00:00Z");
  assert.equal(lib.formatCommunityPostTime(new Date("2026-09-01T11:59:30Z"), now), "방금 전");
  assert.equal(lib.formatCommunityPostTime(new Date("2026-09-01T11:30:00Z"), now), "30분 전");
  assert.equal(lib.formatCommunityPostTime(new Date("2026-09-01T09:00:00Z"), now), "3시간 전");
  assert.equal(lib.formatCommunityPostTime(new Date("2026-08-30T15:00:00Z"), now), "2026.08.31");
});

test("centralizes soft-delete exclusion", () => {
  assert.deepEqual(lib.COMMUNITY_VISIBLE_WHERE, { deletedAt: null });
});

test("builds stable latest and popular order", () => {
  assert.deepEqual(lib.communityOrderBy("latest"), [{ createdAt: "desc" }, { id: "desc" }]);
  assert.deepEqual(lib.communityOrderBy("popular"), [{ likeCount: "desc" }, { createdAt: "desc" }, { id: "desc" }]);
});
