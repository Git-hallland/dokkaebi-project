import type { PrismaClient } from "@/generated/prisma/client";
import type { ContentStatus } from "@/generated/prisma/enums";
import type { EventStatus } from "@/generated/prisma/enums";
import { AdminContentInputError, CMS_BOARD_TYPES, type CmsContentInput } from "@/lib/admin-content";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type EditorIdentity = Readonly<{ id: string; name: string }>;

async function replaceContentSources(
  transaction: TransactionClient,
  contentId: string,
  input: CmsContentInput,
) {
  await transaction.contentSource.deleteMany({ where: { contentId } });

  for (const source of input.sources) {
    const shared = { checkedAt: source.checkedAt, publisher: source.publisher, sourceType: source.sourceType, status: "active", title: source.title };
    let savedSource: { id: string };
    if (source.url) {
      savedSource = await transaction.source.upsert({ where: { url: source.url }, update: shared, create: { ...shared, sourceTier: 1, url: source.url }, select: { id: true } });
    } else {
      const existing = await transaction.source.findFirst({ where: { publisher: source.publisher, sourceType: source.sourceType, title: source.title, url: null }, select: { id: true } });
      savedSource = existing
        ? await transaction.source.update({ where: { id: existing.id }, data: shared, select: { id: true } })
        : await transaction.source.create({ data: { ...shared, sourceTier: 1, url: null }, select: { id: true } });
    }
    await transaction.contentSource.create({
      data: { contentId, sourceId: savedSource.id },
    });
  }
}

async function replaceSkillLevels(
  transaction: TransactionClient,
  contentId: string,
  input: CmsContentInput,
) {
  if (input.type !== "skills") {
    await transaction.skillLevel.deleteMany({ where: { contentId } });
    return;
  }
  const savedIds = input.skillLevels.flatMap((level) => level.id ? [level.id] : []);
  if (new Set(savedIds).size !== savedIds.length) throw new AdminContentInputError("같은 강화 단계를 중복 저장할 수 없습니다.");
  await transaction.skillLevel.deleteMany({ where: { contentId, ...(savedIds.length ? { id: { notIn: savedIds } } : {}) } });
  for (const [index, id] of savedIds.entries()) {
    const moved = await transaction.skillLevel.updateMany({ where: { contentId, id }, data: { order: -(index + 1) } });
    if (moved.count !== 1) throw new AdminContentInputError("수정할 강화 단계를 찾을 수 없습니다.");
  }
  for (const level of input.skillLevels) {
    const data = { description: level.description, label: level.label, metadata: level.metadata, order: level.order };
    if (level.id) {
      const updated = await transaction.skillLevel.updateMany({ where: { contentId, id: level.id }, data });
      if (updated.count !== 1) throw new AdminContentInputError("수정할 강화 단계를 찾을 수 없습니다.");
    } else {
      await transaction.skillLevel.create({ data: { ...data, contentId } });
    }
  }
}

export async function createCmsContent(
  prisma: PrismaClient,
  input: CmsContentInput,
  editor: EditorIdentity,
) {
  return prisma.$transaction(async (transaction) => {
    const now = new Date();
    const content = await transaction.content.create({
      data: {
        authorId: editor.id,
        body: input.body,
        checkedAt: input.checkedAt,
        coverImageUrl: input.coverImageUrl,
        detailStatus: input.detailStatus,
        entityMetadata: input.entityMetadata,
        entitySortOrder: input.entitySortOrder,
        iconImageUrl: input.iconImageUrl,
        entityCategory: input.entityCategory,
        eventStatus: input.eventStatus as EventStatus | null,
        publishedAt: input.status === "PUBLISHED" ? now : null,
        slug: input.slug,
        status: input.status as ContentStatus,
        summary: input.summary,
        title: input.title,
        type: input.type,
      },
      select: { id: true },
    });
    await replaceContentSources(transaction, content.id, input);
    await replaceSkillLevels(transaction, content.id, { ...input, skillLevels: input.skillLevels.map((level) => ({ ...level, id: null })) });
    await transaction.contentRevision.create({
      data: {
        authorId: editor.id,
        changedBy: editor.name,
        contentId: content.id,
        reason: "관리자 CMS에서 콘텐츠 생성",
        summary: "콘텐츠 최초 저장",
        toStatus: input.status as ContentStatus,
      },
    });
    return content;
  });
}

export async function updateCmsContent(
  prisma: PrismaClient,
  contentId: string,
  input: CmsContentInput,
  editor: EditorIdentity,
) {
  return prisma.$transaction(async (transaction) => {
    const previous = await transaction.content.findFirst({
      where: { id: contentId, type: { in: [...CMS_BOARD_TYPES] } },
      select: { id: true, publishedAt: true, status: true },
    });
    if (!previous) return null;

    await transaction.content.update({
      where: { id: contentId },
      data: {
        body: input.body,
        checkedAt: input.checkedAt,
        coverImageUrl: input.coverImageUrl,
        detailStatus: input.detailStatus,
        entityMetadata: input.entityMetadata,
        entitySortOrder: input.entitySortOrder,
        iconImageUrl: input.iconImageUrl,
        entityCategory: input.entityCategory,
        eventStatus: input.eventStatus as EventStatus | null,
        publishedAt:
          input.status === "PUBLISHED" && !previous.publishedAt
            ? new Date()
            : previous.publishedAt,
        slug: input.slug,
        status: input.status as ContentStatus,
        summary: input.summary,
        title: input.title,
        type: input.type,
      },
    });
    await replaceContentSources(transaction, contentId, input);
    await replaceSkillLevels(transaction, contentId, input);
    await transaction.contentRevision.create({
      data: {
        authorId: editor.id,
        changedBy: editor.name,
        contentId,
        fromStatus: previous.status,
        reason: "관리자 CMS에서 콘텐츠 수정",
        summary: previous.status === input.status ? "콘텐츠 내용 저장" : `상태 변경: ${previous.status} → ${input.status}`,
        toStatus: input.status as ContentStatus,
      },
    });
    return { id: contentId };
  });
}
