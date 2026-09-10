import type { PrismaClient } from "@/generated/prisma/client";

const SEARCHABLE_CONTENT_TYPES = [
  "skills",
  "items",
  "monsters",
  "regions",
  "dungeons",
  "crafting",
  "events",
  "patches",
] as const;

const typeLabels: Record<string, string> = {
  community: "공략",
  crafting: "제작 / 생활",
  dungeons: "던전 / 콘텐츠",
  events: "이벤트 / 쿠폰",
  items: "아이템 / 장비",
  monsters: "몬스터 / 보스",
  patches: "패치노트",
  regions: "지역 / NPC",
  skills: "도술",
};

export const SEARCH_QUERY_MAX_LENGTH = 80;

export type SiteSearchResult = Readonly<{
  description: string | null;
  href: string;
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  updatedAt: string;
}>;

type SearchPrisma = Pick<PrismaClient, "content" | "guidePost">;

export class SearchQueryError extends Error {
  readonly code = "INVALID_SEARCH_QUERY";
}

export function normalizeSearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  const query = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (Array.from(query).length > SEARCH_QUERY_MAX_LENGTH) {
    throw new SearchQueryError(`검색어는 ${SEARCH_QUERY_MAX_LENGTH}자 이하로 입력해 주세요.`);
  }
  return query;
}

function scoreResult(result: SiteSearchResult, query: string) {
  const title = result.title.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const needle = query.toLocaleLowerCase("ko-KR");
  if (title === needle) return 0;
  if (title.startsWith(needle)) return 1;
  if (title.includes(needle)) return 2;
  return 3;
}

export async function searchSite(
  database: SearchPrisma,
  value: unknown,
  options: Readonly<{ limit?: number }> = {},
): Promise<SiteSearchResult[]> {
  const query = normalizeSearchQuery(value);
  if (!query) return [];

  const limit = Math.min(Math.max(options.limit ?? 40, 1), 50);
  const perSource = Math.min(limit, 30);
  const [contents, posts] = await Promise.all([
    database.content.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, slug: true, summary: true, title: true, type: true, updatedAt: true },
      take: perSource,
      where: {
        status: "PUBLISHED",
        type: { in: [...SEARCHABLE_CONTENT_TYPES] },
        slug: { not: null },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
        ],
      },
    }),
    database.guidePost.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, title: true, updatedAt: true },
      take: perSource,
      where: {
        deletedAt: null,
        title: { contains: query, mode: "insensitive" },
      },
    }),
  ]);

  const results: SiteSearchResult[] = [
    ...contents.map((content) => ({
      description: content.summary,
      href: `/${content.type}/${encodeURIComponent(content.slug ?? "")}`,
      id: content.id,
      title: content.title,
      type: content.type,
      typeLabel: typeLabels[content.type] ?? content.type,
      updatedAt: content.updatedAt.toISOString(),
    })),
    ...posts.map((post) => ({
      description: null,
      href: `/community/${post.id}`,
      id: post.id,
      title: post.title,
      type: "community",
      typeLabel: typeLabels.community,
      updatedAt: post.updatedAt.toISOString(),
    })),
  ];

  return results
    .sort((a, b) => scoreResult(a, query) - scoreResult(b, query) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
