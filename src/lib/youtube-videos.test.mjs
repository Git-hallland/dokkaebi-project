import assert from "node:assert/strict";
import test from "node:test";

import {
  formatYouTubeViewCount,
  getPopularYouTubeVideos,
  OFFICIAL_YOUTUBE_CHANNEL_IDS,
  parseYouTubeVideoItems,
  selectDiverseYouTubeVideos,
  YOUTUBE_REVALIDATE_SECONDS,
} from "./youtube-videos.ts";

const item = (id, views, title = "도깨비의세계 영상", channelId = `creator-${id}`) => ({
  id,
  snippet: { channelId, channelTitle: "게임 크리에이터", description: "도깨비의 세계 MMORPG 소개", publishedAt: "2026-09-01T00:00:00Z", thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } }, title },
  statistics: { viewCount: String(views) },
});

test("parses trusted relevant videos and sorts by actual view count", () => {
  const high = item("high", 90_000, "도깨비의세계 &amp; 전투");
  const result = parseYouTubeVideoItems([item("low", 1_000), high]);
  assert.deepEqual(result.map((video) => video.videoId), ["high", "low"]);
  assert.equal(result[0].viewCount, 90_000);
  assert.equal(result[0].publishedAt, "2026-09-01T00:00:00Z");
  assert.equal(result[0].title, "도깨비의세계 & 전투");
});

test("rejects unrelated, malformed, and untrusted video data", () => {
  const unrelated = item("other", 500, "다른 게임 영상");
  unrelated.snippet.description = "전혀 관련 없는 설명";
  const untrusted = item("bad", 900);
  untrusted.snippet.thumbnails.high.url = "https://example.com/bad.jpg";
  const official = item("official", 10_000, "도깨비의세계 공식 영상", [...OFFICIAL_YOUTUBE_CHANNEL_IDS][0]);
  assert.deepEqual(parseYouTubeVideoItems(null), []);
  assert.deepEqual(parseYouTubeVideoItems([unrelated, untrusted, official, {}]), []);
});

test("limits each creator channel to two videos", () => {
  const parsed = parseYouTubeVideoItems([
    item("same-1", 30_000, "도깨비의세계 공략", "same-channel"),
    item("same-2", 20_000, "도깨비의세계 리뷰", "same-channel"),
    item("same-3", 10_000, "도깨비의세계 플레이", "same-channel"),
    item("other", 5_000, "도깨비의세계 소식", "other-channel"),
  ]);
  assert.deepEqual(selectDiverseYouTubeVideos(parsed).map((video) => video.videoId), ["same-1", "same-2", "other"]);
});

test("formats Korean view counts", () => {
  assert.equal(formatYouTubeViewCount(999), "999회");
  assert.equal(formatYouTubeViewCount(1_234), "1.2천회");
  assert.equal(formatYouTubeViewCount(12_345), "1.2만회");
  assert.equal(formatYouTubeViewCount(1_234_567), "123만회");
});

test("queries the recent 14-day window and stops without an expanded search when enough videos exist", async () => {
  const previousKey = process.env.YOUTUBE_API_KEY;
  const previousFetch = globalThis.fetch;
  const calls = [];
  const ids = Array.from({ length: 8 }, (_, index) => `recent-${index}`);
  process.env.YOUTUBE_API_KEY = `AIza${"a".repeat(35)}`;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.pathname.endsWith("/search")) {
      return { ok: true, json: async () => ({ items: ids.map((videoId) => ({ id: { videoId } })) }) };
    }
    return { ok: true, json: async () => ({ items: ids.map((id, index) => item(id, 10_000 - index)) }) };
  };

  try {
    const videos = await getPopularYouTubeVideos();
    assert.equal(videos.length, 8);
    assert.equal(calls.length, 2);
    const publishedAfter = new Date(calls[0].searchParams.get("publishedAfter"));
    const age = Date.now() - publishedAfter.getTime();
    assert.ok(age >= 14 * 24 * 60 * 60 * 1_000);
    assert.ok(age < (14 * 24 + 2) * 60 * 60 * 1_000);
    assert.equal(calls[0].searchParams.get("maxResults"), "25");
  } finally {
    if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
});

test("expands the search window only when recent creator results are insufficient", async () => {
  const previousKey = process.env.YOUTUBE_API_KEY;
  const previousFetch = globalThis.fetch;
  const searchWindows = [];
  let detailCall = 0;
  process.env.YOUTUBE_API_KEY = `AIza${"b".repeat(35)}`;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/search")) {
      searchWindows.push(url.searchParams.get("publishedAfter"));
      const prefix = searchWindows.length === 1 ? "recent" : "expanded";
      const count = searchWindows.length === 1 ? 3 : 10;
      return { ok: true, json: async () => ({ items: Array.from({ length: count }, (_, index) => ({ id: { videoId: `${prefix}-${index}` } })) }) };
    }
    detailCall += 1;
    const ids = url.searchParams.get("id").split(",");
    return { ok: true, json: async () => ({ items: ids.map((id, index) => item(id, 20_000 - detailCall * 100 - index)) }) };
  };

  try {
    const videos = await getPopularYouTubeVideos();
    assert.equal(searchWindows.length, 2);
    assert.equal(detailCall, 2);
    assert.equal(videos.length, 10);
    assert.ok(new Date(searchWindows[1]) < new Date(searchWindows[0]));
  } finally {
    if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
});

test("uses a two hour cache policy and fails without breaking the caller", async () => {
  assert.equal(YOUTUBE_REVALIDATE_SECONDS, 7_200);
  const previousKey = process.env.YOUTUBE_API_KEY;
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  process.env.YOUTUBE_API_KEY = '\"test-key\"';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    throw new Error("network down");
  };
  try {
    assert.deepEqual(await getPopularYouTubeVideos(), []);
    assert.match(requestedUrl, /key=test-key(?:&|$)/u);
  } finally {
    if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
});
