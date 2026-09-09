import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (await readFile(new URL("./admin-content-data.ts", import.meta.url), "utf8"))
  .replace(
    'import { AdminContentInputError, CMS_BOARD_TYPES, type CmsContentInput } from "@/lib/admin-content";',
    'class AdminContentInputError extends Error {}; const CMS_BOARD_TYPES = ["skills", "items", "monsters", "regions", "dungeons", "crafting", "events", "patches"];',
  );
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const input = {
  body: "공식 내용",
  checkedAt: new Date("2026-09-08T00:00:00Z"),
  coverImageUrl: "https://res.cloudinary.com/demo/image/upload/v123/dokkaebi/cms/staging/123e4567-e89b-12d3-a456-426614174000.webp",
  iconImageUrl: null,
  entityCategory: "강타",
  eventStatus: null,
  slug: "공식-내용",
  sources: [{ checkedAt: new Date("2026-09-08T00:00:00Z"), publisher: "카카오게임즈", sourceType: "notice", title: "공식 공지", url: "https://example.com/notice" }],
  status: "REVIEW",
  summary: "공식 내용 요약",
  skillLevels: [{ description: "설명", id: null, label: "Lv.1", metadata: { 피해량: "120%" }, order: 1 }],
  title: "공식 내용",
  type: "skills",
};

function createMock(previous = null) {
  const calls = { contentCreate: [], contentUpdate: [], joins: [], revisions: [], skillCreates: [], skillDeletes: [], skillUpdates: [], sourceUpserts: [] };
  const transaction = {
    content: {
      create: async (args) => { calls.contentCreate.push(args); return { id: "content-1" }; },
      findFirst: async (args) => {
        calls.findArgs = args;
        return previous;
      },
      update: async (args) => { calls.contentUpdate.push(args); return { id: "content-1" }; },
    },
    contentRevision: { create: async (args) => { calls.revisions.push(args); return { id: "revision-1" }; } },
    skillLevel: {
      create: async (args) => { calls.skillCreates.push(args); return { id: `new-${calls.skillCreates.length}` }; },
      deleteMany: async (args) => { calls.skillDeletes.push(args); return { count: 0 }; },
      updateMany: async (args) => { calls.skillUpdates.push(args); return { count: 1 }; },
    },
    contentSource: {
      create: async (args) => { calls.joins.push(args); return args.data; },
      deleteMany: async () => ({ count: 0 }),
    },
    source: { upsert: async (args) => { calls.sourceUpserts.push(args); return { id: "source-1" }; } },
  };
  return { calls, prisma: { $transaction: async (callback) => callback(transaction) } };
}

test("creates content, source links, and a revision with the server editor identity", async () => {
  const { calls, prisma } = createMock();
  await lib.createCmsContent(prisma, input, { id: "admin-1", name: "관리자" });
  assert.equal(calls.contentCreate[0].data.authorId, "admin-1");
  assert.equal(calls.contentCreate[0].data.coverImageUrl, input.coverImageUrl);
  assert.equal(calls.contentCreate[0].data.eventStatus, null);
  assert.equal(calls.contentCreate[0].data.entityCategory, "강타");
  assert.equal(calls.skillCreates[0].data.label, "Lv.1");
  assert.equal(calls.sourceUpserts.length, 1);
  assert.deepEqual(calls.joins[0].data, { contentId: "content-1", sourceId: "source-1" });
  assert.equal(calls.revisions[0].data.authorId, "admin-1");
  assert.equal(calls.revisions[0].data.toStatus, "REVIEW");
});

test("updates existing skill level IDs and creates only new levels in the transaction", async () => {
  const previous = { id: "content-1", publishedAt: new Date(), status: "PUBLISHED" };
  const { calls, prisma } = createMock(previous);
  await lib.updateCmsContent(prisma, "content-1", { ...input, skillLevels: [{ description: "수정", id: "level-2", label: "Lv.2", metadata: { "대상 수": "3명" }, order: 1 }, { description: null, id: null, label: "Lv.4", metadata: {}, order: 2 }] }, { id: "admin-1", name: "관리자" });
  assert.deepEqual(calls.skillDeletes[0].where, { contentId: "content-1", id: { notIn: ["level-2"] } });
  assert.equal(calls.skillUpdates.at(-1).where.id, "level-2");
  assert.equal(calls.skillUpdates.at(-1).data.metadata["대상 수"], "3명");
  assert.equal(calls.skillCreates[0].data.label, "Lv.4");
});

test("creates and changes an event status", async () => {
  const created = createMock();
  await lib.createCmsContent(created.prisma, { ...input, eventStatus: "ONGOING", type: "events" }, { id: "admin-1", name: "관리자" });
  assert.equal(created.calls.contentCreate[0].data.eventStatus, "ONGOING");
  const updated = createMock({ id: "content-1", publishedAt: new Date(), status: "PUBLISHED" });
  await lib.updateCmsContent(updated.prisma, "content-1", { ...input, eventStatus: "ENDED", status: "PUBLISHED", type: "events" }, { id: "admin-1", name: "관리자" });
  assert.equal(updated.calls.contentUpdate[0].data.eventStatus, "ENDED");
});

test("updates status and records the transition without replacing the original author", async () => {
  const previous = { id: "content-1", publishedAt: null, status: "REVIEW" };
  const { calls, prisma } = createMock(previous);
  await lib.updateCmsContent(prisma, "content-1", { ...input, status: "PUBLISHED" }, { id: "admin-2", name: "검수자" });
  assert.equal(calls.contentUpdate[0].data.status, "PUBLISHED");
  assert.equal(calls.contentUpdate[0].data.coverImageUrl, input.coverImageUrl);
  assert.ok(calls.contentUpdate[0].data.publishedAt instanceof Date);
  assert.equal(calls.contentUpdate[0].data.authorId, undefined);
  assert.equal(calls.revisions[0].data.fromStatus, "REVIEW");
  assert.equal(calls.revisions[0].data.toStatus, "PUBLISHED");
});

test("removes a cover image by saving null", async () => {
  const previous = { id: "content-1", publishedAt: new Date(), status: "PUBLISHED" };
  const { calls, prisma } = createMock(previous);
  await lib.updateCmsContent(prisma, "content-1", { ...input, coverImageUrl: null }, { id: "admin-1", name: "관리자" });
  assert.equal(calls.contentUpdate[0].data.coverImageUrl, null);
});

test("returns null when an update target does not exist", async () => {
  const { calls, prisma } = createMock(null);
  assert.equal(await lib.updateCmsContent(prisma, "missing", input, { id: "admin-1", name: "관리자" }), null);
  assert.equal(calls.contentUpdate.length, 0);
  assert.deepEqual(calls.findArgs.where.type.in, ["skills", "items", "monsters", "regions", "dungeons", "crafting", "events", "patches"]);
});
