import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./community-video.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const file = (name, type, bytes, size = bytes.length) => ({ name, type, size, slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer }) });

test("accepts allowlisted video MIME, extension, size and magic bytes", async () => {
  await assert.doesNotReject(lib.validatePostVideoFile(file("clip.mp4", "video/mp4", [0,0,0,24,102,116,121,112,105,115,111,109])));
  await assert.doesNotReject(lib.validatePostVideoFile(file("clip.mov", "video/quicktime", [0,0,0,24,102,116,121,112,113,116,32,32])));
  await assert.doesNotReject(lib.validatePostVideoFile(file("clip.webm", "video/webm", [0x1a,0x45,0xdf,0xa3])));
});

test("rejects mismatched, oversized and spoofed videos", async () => {
  await assert.rejects(lib.validatePostVideoFile(file("clip.exe", "video/mp4", [0,0,0,24,102,116,121,112])));
  await assert.rejects(lib.validatePostVideoFile(file("clip.mp4", "video/webm", [0,0,0,24,102,116,121,112])));
  await assert.rejects(lib.validatePostVideoFile(file("clip.mp4", "video/mp4", [0,1,2,3,4,5,6,7])));
  await assert.rejects(lib.validatePostVideoFile(file("clip.webm", "video/webm", [0x1a,0x45,0xdf,0xa3], lib.POST_VIDEO_MAX_BYTES + 1)));
});

test("reports a missing signed video preset without exposing configuration", () => {
  assert.throws(() => lib.requirePostVideoPreset(undefined), /영상 업로드 설정이 완료되지 않았습니다/);
  assert.throws(() => lib.requirePostVideoPreset("   "), /영상 업로드 설정이 완료되지 않았습니다/);
  assert.equal(lib.requirePostVideoPreset(" configured-preset "), "configured-preset");
});

const cloudName = "demo";
const publicId = "dokkaebi/posts/videos/staging/123e4567-e89b-12d3-a456-426614174000";
const validUpload = {
  bytes: 1024,
  format: "mp4",
  height: 720,
  publicId,
  resourceType: "video",
  secureUrl: `https://res.cloudinary.com/${cloudName}/video/upload/v123/${publicId}.mp4`,
  signature: "safe-test-signature",
  version: 123,
  width: 1280,
};

test("rejects malformed video upload responses", () => {
  assert.throws(() => lib.validatePostVideoUploadMetadata(null, cloudName), /검증에 실패/);
  assert.throws(() => lib.validatePostVideoUploadMetadata({ ...validUpload, signature: null }, cloudName), /검증에 실패/);
  assert.throws(() => lib.validatePostVideoUploadMetadata({ ...validUpload, secureUrl: "not-a-url" }, cloudName), /검증에 실패/);
});

test("rejects wrong resource type, invalid format and oversized metadata", () => {
  assert.throws(() => lib.validatePostVideoUploadMetadata({ ...validUpload, resourceType: "image" }, cloudName), /지원하지 않는 영상 형식/);
  assert.throws(() => lib.validatePostVideoUploadMetadata({ ...validUpload, format: "avi", secureUrl: validUpload.secureUrl.replace(/\.mp4$/u, ".avi") }, cloudName), /지원하지 않는 영상 형식/);
  assert.throws(() => lib.validatePostVideoUploadMetadata({ ...validUpload, bytes: lib.POST_VIDEO_MAX_BYTES + 1 }, cloudName), /50MB/);
});

test("accepts a verified-shape Cloudinary video response", () => {
  assert.deepEqual(lib.validatePostVideoUploadMetadata(validUpload, cloudName), validUpload);
});

test("maps Cloudinary failures to safe actionable upload messages", () => {
  assert.equal(lib.videoUploadResponseError(400, { error: { message: "Upload preset not found" } }), "영상 업로드 설정이 완료되지 않았습니다.");
  assert.equal(lib.videoUploadResponseError(413, { error: { message: "Too large" } }), "영상은 50MB 이하만 업로드할 수 있습니다.");
  assert.equal(lib.videoUploadResponseError(400, { error: { message: "Invalid format" } }), "지원하지 않는 영상 형식입니다.");
  assert.equal(lib.videoUploadResponseError(500, { error: { message: "internal reference 123" } }), "영상 업로드 검증에 실패했습니다.");
});
