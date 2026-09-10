import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("homepage prioritizes instant popular tabs and recent editorial content", async () => {
  const [home, tabs, editorial] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/HomePopularTabs.tsx"),
    source("./editorial-content.ts"),
  ]);

  assert.doesNotMatch(home, /CategoryCard|main-categories/u);
  assert.doesNotMatch(home, /force-dynamic/u);
  assert.match(home, /<HomePopularTabs[\s\S]*recent-title/u);
  assert.match(tabs, /useState<TabKey>\("guides"\)/u);
  assert.match(tabs, /role="tablist"/u);
  assert.match(tabs, /<Link href=\{`\/community/u);
  assert.match(editorial, /type: \{ in: \["skills", "items", "monsters", "regions"\] \}/u);
  assert.match(editorial, /orderBy: \[\{ updatedAt: "desc" \}, \{ createdAt: "desc" \}/u);
  assert.match(editorial, /take: 8/u);
});

test("public lists use tagged caches and CMS mutations invalidate them", async () => {
  const [editorial, communityData, publicCache, createContent, updateContent] = await Promise.all([
    source("./editorial-content.ts"),
    source("./community-data.ts"),
    source("./public-content-cache.ts"),
    source("../app/api/admin/content/route.ts"),
    source("../app/api/admin/content/[id]/route.ts"),
  ]);

  assert.match(editorial, /unstable_cache/u);
  assert.match(editorial, /EDITORIAL_CONTENT_CACHE_TAG/u);
  assert.match(communityData, /revalidate: 30/u);
  assert.match(communityData, /COMMUNITY_CONTENT_CACHE_TAG/u);
  assert.match(publicCache, /revalidateTag\(EDITORIAL_CONTENT_CACHE_TAG, \{ expire: 0 \}\)/u);
  assert.match(createContent, /revalidateEditorialContent\(\)/u);
  assert.match(updateContent, /revalidateEditorialContent\(\)/u);
});

test("information routes no longer force dynamic rendering", async () => {
  for (const board of ["skills", "items", "monsters", "regions", "dungeons", "crafting", "events", "patches"]) {
    const [list, detail] = await Promise.all([
      source(`../app/${board}/page.tsx`),
      source(`../app/${board}/[slug]/page.tsx`),
    ]);
    assert.doesNotMatch(list, /force-dynamic/u);
    assert.doesNotMatch(detail, /force-dynamic/u);
  }
});

test("community list does not block public content on a server session lookup", async () => {
  const community = await source("../app/community/page.tsx");
  assert.match(community, /getCommunityPosts/u);
  assert.doesNotMatch(community, /headers\(|auth\.api\.getSession/u);
  assert.match(community, /CommunityWriteAction/u);
});
