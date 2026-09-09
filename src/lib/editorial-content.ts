import { prisma } from "@/lib/prisma";
import { isFrontendOnly } from "@/lib/runtime-mode";
import type { CmsBoardType } from "@/lib/admin-content";
import { sortEventContents } from "@/lib/cms-event-status";

const publishedContentSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  body: true,
  checkedAt: true,
  coverImageUrl: true,
  iconImageUrl: true,
  entityCategory: true,
  detailStatus: true,
  entityMetadata: true,
  entitySortOrder: true,
  eventStatus: true,
  publishedAt: true,
  updatedAt: true,
  skillLevels: {
    orderBy: { order: "asc" as const },
    select: { description: true, id: true, label: true, metadata: true, order: true },
  },
  sources: {
    orderBy: { source: { checkedAt: "desc" as const } },
    select: {
      source: {
        select: { checkedAt: true, id: true, publisher: true, title: true, url: true },
      },
    },
  },
} as const;

export async function getPublishedBoardContents(type: CmsBoardType) {
  if (isFrontendOnly()) return [];
  const contents = await prisma.content.findMany({
    where: { status: "PUBLISHED", type, slug: { not: null } },
    orderBy: type === "skills" || type === "items"
      ? [{ entitySortOrder: { sort: "asc", nulls: "last" } }, { title: "asc" }]
      : [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    select: publishedContentSelect,
  });
  return type === "events" ? sortEventContents(contents) : contents;
}

export async function getPublishedBoardContent(type: CmsBoardType, slug: string) {
  if (isFrontendOnly()) return null;
  return prisma.content.findFirst({
    where: { slug, status: "PUBLISHED", type },
    select: publishedContentSelect,
  });
}
