import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isFrontendOnly } from "@/lib/runtime-mode";
import type { CmsBoardType } from "@/lib/admin-content";
import { sortEventContents } from "@/lib/cms-event-status";
import { EDITORIAL_CONTENT_CACHE_TAG } from "@/lib/public-content-cache";

const publishedContentListSelect = {
  id: true,
  type: true,
  title: true,
  slug: true,
  summary: true,
  coverImageUrl: true,
  iconImageUrl: true,
  entityCategory: true,
  detailStatus: true,
  entitySortOrder: true,
  eventStatus: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

function serializePublishedContentListItem<T extends {
  createdAt: Date;
  publishedAt: Date | null;
  updatedAt: Date;
}>(content: T) {
  return {
    ...content,
    createdAt: content.createdAt.toISOString(),
    publishedAt: content.publishedAt?.toISOString() ?? null,
    updatedAt: content.updatedAt.toISOString(),
  };
}

const readPublishedBoardContents = unstable_cache(async (type: CmsBoardType) => {
  const contents = await prisma.content.findMany({
    where: { status: "PUBLISHED", type, slug: { not: null } },
    orderBy: type === "skills" || type === "items"
      ? [{ entitySortOrder: { sort: "asc", nulls: "last" } }, { title: "asc" }]
      : [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    select: publishedContentListSelect,
  });
  const sortedContents = type === "events" ? sortEventContents(contents) : contents;
  return sortedContents.map(serializePublishedContentListItem);
}, ["published-board-contents-v3"], {
  revalidate: false,
  tags: [EDITORIAL_CONTENT_CACHE_TAG],
});

const readPublishedBoardContent = unstable_cache(
  async (type: CmsBoardType, slug: string) => {
    const content = await prisma.content.findFirst({
      where: { slug, status: "PUBLISHED", type },
      select: publishedContentSelect,
    });
    if (!content) return null;
    return {
      ...content,
      checkedAt: content.checkedAt?.toISOString() ?? null,
      publishedAt: content.publishedAt?.toISOString() ?? null,
      updatedAt: content.updatedAt.toISOString(),
      sources: content.sources.map(({ source }) => ({
        source: { ...source, checkedAt: source.checkedAt.toISOString() },
      })),
    };
  },
  ["published-board-content-v3"],
  { revalidate: false, tags: [EDITORIAL_CONTENT_CACHE_TAG] },
);

const readRecentPublishedEntities = unstable_cache(
  async () => {
    const contents = await prisma.content.findMany({
      where: {
        status: "PUBLISHED",
        type: { in: ["skills", "items", "monsters", "regions"] },
        slug: { not: null },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: publishedContentListSelect,
    });
    return contents.map(serializePublishedContentListItem);
  },
  ["recent-published-entities-v2"],
  { revalidate: false, tags: [EDITORIAL_CONTENT_CACHE_TAG] },
);

export function getPublishedBoardContents(type: CmsBoardType) {
  return isFrontendOnly() ? Promise.resolve([]) : readPublishedBoardContents(type);
}

export async function getPublishedBoardContent(type: CmsBoardType, slug: string) {
  if (isFrontendOnly()) return null;
  return readPublishedBoardContent(type, slug);
}

export function getRecentPublishedEntities() {
  return isFrontendOnly() ? Promise.resolve([]) : readRecentPublishedEntities();
}
