import assert from "node:assert/strict";
import test from "node:test";
import {
  CommunityReportError,
  assertReportableTarget,
  communityDocumentPreview,
  hasCommunityCapability,
  normalizeGuideReportInput,
  normalizeGuideReportResolution,
} from "./community-reports.ts";

test("report input accepts only the allowlisted reason and trims detail", () => {
  assert.deepEqual(normalizeGuideReportInput({ reason: "SPAM", description: "  반복 광고  " }), { reason: "SPAM", description: "반복 광고" });
  assert.throws(() => normalizeGuideReportInput({ reason: "PHISHING" }), CommunityReportError);
  assert.throws(() => normalizeGuideReportInput({ reason: "OTHER", description: "x".repeat(1001) }), CommunityReportError);
  assert.throws(() => normalizeGuideReportInput({ reason: "OTHER", description: "<b>설명</b>" }), CommunityReportError);
  assert.throws(() => normalizeGuideReportInput({ reason: "OTHER", description: "설명\u0000" }), CommunityReportError);
});

test("post previews extract text without rendering document markup", () => {
  assert.equal(communityDocumentPreview({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "안전한 미리보기" }] }] }), "안전한 미리보기");
});

test("self and deleted targets cannot be reported", () => {
  assert.throws(() => assertReportableTarget("u1", { authorId: "u1", deletedAt: null }), /자신/);
  assert.throws(() => assertReportableTarget("u1", { authorId: "u2", deletedAt: new Date() }), /찾을 수/);
  assert.doesNotThrow(() => assertReportableTarget("u1", { authorId: "u2", deletedAt: null }));
});

test("capabilities keep moderation restricted to admins", () => {
  assert.equal(hasCommunityCapability("USER", "viewReports"), false);
  assert.equal(hasCommunityCapability("EDITOR", "resolveReports"), false);
  assert.equal(hasCommunityCapability("REVIEWER", "viewReports"), true);
  assert.equal(hasCommunityCapability("REVIEWER", "resolveReports"), true);
  assert.equal(hasCommunityCapability("REVIEWER", "moderateCommunity"), false);
  assert.equal(hasCommunityCapability("ADMIN", "moderateCommunity"), true);
});

test("resolution input does not accept client resolver identity or pending", () => {
  assert.deepEqual(normalizeGuideReportResolution({ status: "RESOLVED", action: "HIDE_TARGET", resolution: "  확인 완료 " }), { status: "RESOLVED", action: "HIDE_TARGET", resolution: "확인 완료" });
  assert.throws(() => normalizeGuideReportResolution({ status: "PENDING" }), CommunityReportError);
  assert.throws(() => normalizeGuideReportResolution({ status: "DISMISSED", resolvedById: "other-user" }), CommunityReportError);
});
