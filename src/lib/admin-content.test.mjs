import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (await readFile(new URL("./admin-content.ts", import.meta.url), "utf8"))
  .replace('import { CMS_BOARD_TYPES, type CmsBoardType } from "@/lib/cms-boards";', 'const CMS_BOARD_TYPES = ["skills", "items", "monsters", "regions", "dungeons", "crafting", "events", "patches"];')
  .replace('import { isAllowedCmsImageUrl } from "@/lib/cms-content-format";', 'const isAllowedCmsImageUrl = (value) => /^https:\\/\\/res\\.cloudinary\\.com\\/[^/]+\\/image\\/upload\\/v\\d+\\/dokkaebi\\/cms\\/staging\\/[0-9a-f-]+\\.(?:png|jpe?g|webp)$/.test(value) || /^\\/assets\\/skills\\/[a-z0-9-]+\\.(?:png|webp)$/.test(value);')
  .replace('import { CMS_EVENT_STATUSES, type CmsEventStatus } from "@/lib/cms-event-status";', 'const CMS_EVENT_STATUSES = ["ONGOING", "ENDED"];')
  .replace('import { CMS_DETAIL_STATUSES, CMS_SKILL_LEVEL_LIMITS, type CmsDetailStatus, type CmsSkillLevelInput } from "@/lib/cms-entity";', 'const CMS_DETAIL_STATUSES = ["PUBLISHED", "UNRELEASED"]; const CMS_SKILL_LEVEL_LIMITS = { description: 5000, label: 80, levels: 20, metadataBytes: 10000, metadataItems: 20, metadataKey: 40, metadataValue: 200 };')
  .replace('export { CMS_BOARD_TYPES } from "@/lib/cms-boards";', "")
  .replace('export type { CmsBoardType } from "@/lib/cms-boards";', "");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const valid = {
  body: "쇼케이스에서 공개된 내용입니다.",
  coverImageUrl: null,
  iconImageUrl: null,
  entityCategory: null,
  slug: "쇼케이스-요약",
  sources: [{ checkedAt: "2026-09-08", publisher: "카카오게임즈", sourceType: "notice", title: "공식 공지", url: "https://example.com/notice#top" }],
  status: "PUBLISHED",
  summary: "공식 쇼케이스 요약",
  skillLevels: [],
  title: "쇼케이스 요약",
  type: "events",
};

test("normalizes a publishable editorial content payload", () => {
  const result = lib.normalizeCmsContentInput(valid);
  assert.equal(result.slug, "쇼케이스-요약");
  assert.equal(result.sources[0].url, "https://example.com/notice");
  assert.equal(result.checkedAt.toISOString(), "2026-09-08T00:00:00.000Z");
});

test("normalizes entity fields and flexible skill levels", () => {
  const image = "https://res.cloudinary.com/demo/image/upload/v123/dokkaebi/cms/staging/123e4567-e89b-12d3-a456-426614174000.webp";
  const result = lib.normalizeCmsContentInput({ ...valid, entityCategory: "강타", iconImageUrl: image, skillLevels: [
    { description: "기본 공격 설명", label: "Lv.1", metadata: [{ key: "피해량", value: "120%" }], order: 1 },
    { description: "돌파 설명", label: "1단계 돌파", metadata: { "방어력 감소": "15%" }, order: 2 },
  ], type: "skills" });
  assert.equal(result.entityCategory, "강타");
  assert.equal(result.iconImageUrl, image);
  assert.deepEqual(result.skillLevels.map((level) => level.label), ["Lv.1", "1단계 돌파"]);
  assert.equal(result.skillLevels[1].metadata["방어력 감소"], "15%");
});

test("accepts local cropped skill icons and unreleased skill records", () => {
  const result = lib.normalizeCmsContentInput({
    ...valid,
    body: "",
    detailStatus: "UNRELEASED",
    entityCategory: "미분류",
    entityMetadata: {},
    entitySortOrder: 3,
    iconImageUrl: "/assets/skills/ilseom-sheet.png",
    sources: [{ checkedAt: "2026-09-01", publisher: "카카오게임즈·슈퍼캣", sourceType: "official_screenshot", title: "공개된 공식 화면 캡처", url: "" }],
    summary: "정보 미공개",
    type: "skills",
  });
  assert.equal(result.iconImageUrl, "/assets/skills/ilseom-sheet.png");
  assert.equal(result.detailStatus, "UNRELEASED");
  assert.equal(result.sources[0].url, null);
});

test("validates entity details and requires URLs for non-screenshot sources", () => {
  const entity = { ...valid, detailStatus: "PUBLISHED", entityMetadata: { "스킬 유형": "기동", 사거리: "7.5" }, entitySortOrder: 1, type: "skills" };
  assert.equal(lib.normalizeCmsContentInput(entity).entityMetadata["스킬 유형"], "기동");
  assert.throws(() => lib.normalizeCmsContentInput({ ...entity, detailStatus: "HIDDEN" }), /상세 공개 상태/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...entity, entitySortOrder: 0 }), /정렬 순서/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, sources: [{ ...valid.sources[0], url: "" }] }), /링크가 없는 출처/);
});

test("rejects invalid skill level structures", () => {
  const base = { ...valid, type: "skills" };
  assert.throws(() => lib.normalizeCmsContentInput({ ...base, skillLevels: [{ description: "", label: "Lv.1", metadata: {}, order: 0 }] }), /1 이상의 정수/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...base, skillLevels: [{ description: "", label: "Lv.1", metadata: {}, order: 1 }, { description: "", label: "Lv.2", metadata: {}, order: 1 }] }), /중복/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...base, skillLevels: [{ description: "<b>위조</b>", label: "Lv.1", metadata: {}, order: 1 }] }), /HTML/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, skillLevels: [{ description: "", label: "Lv.1", metadata: {}, order: 1 }], type: "items" }), /도술 게시판/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...base, skillLevels: [{ description: "", label: "Lv.1", metadata: [{ key: "피해량", value: "120%" }, { key: "피해량", value: "130%" }], order: 1 }] }), /중복/);
});

test("accepts verified CMS image URLs and rejects other image hosts", () => {
  const image = "https://res.cloudinary.com/demo/image/upload/v123/dokkaebi/cms/staging/123e4567-e89b-12d3-a456-426614174000.webp";
  assert.equal(lib.normalizeCmsContentInput({ ...valid, coverImageUrl: image }).coverImageUrl, image);
  assert.equal(lib.normalizeCmsContentInput({ ...valid, body: `본문\n\n![설명](${image})` }).body.includes(image), true);
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, coverImageUrl: "https://example.com/image.webp" }), /Cloudinary/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, body: "![위조](https://example.com/image.webp)" }), /Cloudinary/);
});

test("allows incomplete drafts but enforces published requirements", () => {
  assert.equal(lib.normalizeCmsContentInput({ ...valid, body: "", slug: "", sources: [], status: "DRAFT", summary: "" }).status, "DRAFT");
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, sources: [] }), /공개하려면/);
});

test("rejects unsafe sources and unsupported boards", () => {
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, type: "community" }), /게시판/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, sources: [{ ...valid.sources[0], url: "http://example.com" }] }), /HTTPS/);
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, sources: [valid.sources[0], valid.sources[0]] }), /중복/);
});

test("keeps content publishing restricted to administrators", () => {
  assert.equal(lib.isCmsAdmin("ADMIN"), true);
  assert.equal(lib.isCmsAdmin("REVIEWER"), false);
  assert.equal(lib.isCmsAdmin("USER"), false);
  assert.equal(lib.isCmsAdmin(null), false);
});

test("defaults events to ONGOING and accepts both event statuses", () => {
  assert.equal(lib.normalizeCmsContentInput(valid).eventStatus, "ONGOING");
  assert.equal(lib.normalizeCmsContentInput({ ...valid, eventStatus: "ENDED" }).eventStatus, "ENDED");
  assert.equal(lib.normalizeCmsContentInput({ ...valid, eventStatus: "ONGOING" }).eventStatus, "ONGOING");
  assert.throws(() => lib.normalizeCmsContentInput({ ...valid, eventStatus: "PAUSED" }), /이벤트 상태/);
});

test("clears event status for non-event boards", () => {
  assert.equal(lib.normalizeCmsContentInput({ ...valid, eventStatus: "ENDED", type: "skills" }).eventStatus, null);
  assert.equal(lib.normalizeCmsContentInput({ ...valid, eventStatus: "INVALID", type: "items" }).eventStatus, null);
});
