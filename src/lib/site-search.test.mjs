import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { normalizeSearchQuery, searchSite } from "./site-search.ts";

function database({ contents = [], posts = [], failure = null } = {}) {
  return {
    content: { findMany: async () => { if (failure) throw failure; return contents; } },
    guidePost: { findMany: async () => { if (failure) throw failure; return posts; } },
  };
}

test("normalizes Korean, English, numeric, and one-character queries", () => {
  assert.equal(normalizeSearchQuery("  화염  구 "), "화염 구");
  assert.equal(normalizeSearchQuery("Skill123"), "Skill123");
  assert.equal(normalizeSearchQuery("불"), "불");
  assert.equal(normalizeSearchQuery(""), "");
  assert.throws(() => normalizeSearchQuery("가".repeat(81)));
});

test("merges editorial and community matches with exact titles first", async () => {
  const now = new Date("2026-09-10T00:00:00Z");
  const results = await searchSite(database({
    contents: [{ id: "c1", slug: "fire", summary: "설명", title: "화염구", type: "skills", updatedAt: now }],
    posts: [{ id: "p1", title: "화염구 사용법", updatedAt: now }],
  }), "화염구");
  assert.deepEqual(results.map((result) => result.href), ["/skills/fire", "/community/p1"]);
  assert.equal(results[0].typeLabel, "도술");
});

test("returns no results for empty input and propagates DB failures", async () => {
  assert.deepEqual(await searchSite(database(), ""), []);
  await assert.rejects(() => searchSite(database({ failure: new Error("db down") }), "화염"));
});

test("search endpoints are uncached and the results page is noindex", async () => {
  const [api, suggestions, page] = await Promise.all([
    readFile(new URL("../app/api/search/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/search/suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/search/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(api, /Cache-Control": "no-store/u);
  assert.match(suggestions, /Cache-Control": "no-store/u);
  assert.match(suggestions, /length >= 2/u);
  assert.match(page, /index: false/u);
});
