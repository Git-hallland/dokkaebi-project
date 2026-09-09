import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./cms-content-format.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const image1 = "https://res.cloudinary.com/demo/image/upload/v123/dokkaebi/cms/staging/123e4567-e89b-12d3-a456-426614174000.webp";
const image2 = "https://res.cloudinary.com/demo/image/upload/v124/dokkaebi/cms/staging/223e4567-e89b-12d3-a456-426614174000.jpg";

test("decodes Korean route slugs exactly once and rejects malformed encoding", () => {
  const slug = "도깨비의세계-이벤트";
  assert.equal(lib.decodeCmsRouteSlug(encodeURIComponent(slug)), slug);
  assert.equal(lib.decodeCmsRouteSlug("%E0%A4%A"), null);
});

test("keeps text-image-text order", () => {
  assert.deepEqual(lib.parseCmsBody(`첫 문단\n\n![이벤트 배너](${image1})\n\n둘째 문단`).map((block) => block.type), ["text", "image", "text"]);
});

test("keeps image-text-image order", () => {
  const blocks = lib.parseCmsBody(`![첫 이미지](${image1})\n\n설명\n\n![둘째 이미지](${image2})`);
  assert.deepEqual(blocks.map((block) => block.type), ["image", "text", "image"]);
  assert.equal(blocks[0].src, image1);
  assert.equal(blocks[2].src, image2);
});

test("parses Markdown links and plain URLs as safe links", () => {
  const markdown = lib.parseCmsBody("[공식 사이트](https://example.com)")[0].content;
  assert.deepEqual(markdown, [{ href: "https://example.com/", text: "공식 사이트", type: "link" }]);
  const automatic = lib.parseCmsBody("공식 주소: https://example.com/path")[0].content;
  assert.equal(automatic[1].type, "link");
  assert.equal(automatic[1].href, "https://example.com/path");
});

test("leaves dangerous links and unapproved images as plain text", () => {
  const dangerous = lib.parseCmsBody("[javascript](javascript:alert(1))")[0];
  assert.equal(dangerous.content.every((item) => item.type === "text"), true);
  const externalImage = lib.parseCmsBody("![test](https://evil.example/image.jpg)")[0];
  assert.equal(externalImage.type, "text");
  assert.deepEqual(externalImage.content, [{ text: "![test](https://evil.example/image.jpg)", type: "text" }]);
});

test("inserts image blocks and inline links at the selected cursor range", () => {
  const imageMarker = lib.createCmsImageMarkdown(image1, "이벤트 이미지");
  const original = "첫 문단\n\n선택 문구\n\n둘째 문단";
  const start = original.indexOf("선택 문구");
  const imageInsert = lib.insertCmsBodyMarkup(original, start, start + "선택 문구".length, imageMarker, true);
  assert.equal(imageInsert.body, `첫 문단\n\n${imageMarker}\n\n둘째 문단`);
  assert.equal(imageInsert.cursor, `첫 문단\n\n${imageMarker}`.length);
  const linkMarker = lib.createCmsLinkMarkdown("https://example.com/", "공식 홈페이지");
  const linkInsert = lib.insertCmsBodyMarkup("공식 홈페이지 안내", 0, 7, linkMarker);
  assert.equal(linkInsert.body, `${linkMarker} 안내`);
  assert.equal(linkInsert.cursor, linkMarker.length);
});

test("rejects unsupported and oversized image files before upload", async () => {
  await assert.rejects(() => lib.validateCmsImageFile({ size: 100, type: "image/gif" }), /PNG/);
  await assert.rejects(() => lib.validateCmsImageFile({ size: lib.CMS_IMAGE_MAX_BYTES + 1, type: "image/png" }), /5MB/);
});
