import { unstable_cache } from "next/cache";

import {
  COMMUNITY_PAGE_SIZE,
  COMMUNITY_VISIBLE_WHERE,
  communityOrderBy,
  type CommunitySort,
} from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import { COMMUNITY_CONTENT_CACHE_TAG } from "@/lib/public-content-cache";
import { isFrontendOnly } from "@/lib/runtime-mode";

const readCommunityPosts = unstable_cache(
  async (sort: CommunitySort, cursor?: string) => prisma.guidePost.findMany({
    where: COMMUNITY_VISIBLE_WHERE,
    orderBy: communityOrderBy(sort),
    take: COMMUNITY_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      category: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      author: { select: { name: true } },
    },
  }),
  ["community-list-v1"],
  { revalidate: 30, tags: [COMMUNITY_CONTENT_CACHE_TAG] },
);

const readPopularGuidePosts = unstable_cache(
  async () => prisma.guidePost.findMany({
    where: COMMUNITY_VISIBLE_WHERE,
    orderBy: [
      { likeCount: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 3,
    select: {
      id: true,
      title: true,
      category: true,
      likeCount: true,
      author: { select: { name: true } },
    },
  }),
  ["home-popular-guides-v1"],
  { revalidate: 30, tags: [COMMUNITY_CONTENT_CACHE_TAG] },
);

export function getCommunityPosts(sort: CommunitySort, cursor?: string) {
  return isFrontendOnly() ? Promise.resolve([]) : readCommunityPosts(sort, cursor);
}

export function getPopularGuidePosts() {
  return isFrontendOnly() ? Promise.resolve([]) : readPopularGuidePosts();
}
