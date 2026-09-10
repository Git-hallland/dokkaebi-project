import assert from "node:assert/strict";
import test from "node:test";

import { formatYouTubeViewCount, getPopularYouTubeVideos, parseYouTubeVideoItems, YOUTUBE_REVALIDATE_SECONDS } from "./youtube-videos.ts";

const item = (id, views, title = "도깨비의세계 영상") => ({
  id,
  snippet: { channelTitle: "공식 채널", description: "도깨비의 세계 MMORPG 소개", publishedAt: "2026-09-01T00:00:00Z", thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } }, title },
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
  assert.deepEqual(parseYouTubeVideoItems(null), []);
  assert.deepEqual(parseYouTubeVideoItems([unrelated, untrusted, {}]), []);
});

test("formats Korean view counts", () => {
  assert.equal(formatYouTubeViewCount(999), "999회");
  assert.equal(formatYouTubeViewCount(1_234), "1.2천회");
  assert.equal(formatYouTubeViewCount(12_345), "1.2만회");
  assert.equal(formatYouTubeViewCount(1_234_567), "123만회");
});

test("uses a 12 hour cache policy and fails without breaking the caller", async () => {
  assert.equal(YOUTUBE_REVALIDATE_SECONDS, 43_200);
  const previousKey = process.env.YOUTUBE_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.YOUTUBE_API_KEY = "test-key";
  globalThis.fetch = async () => { throw new Error("network down"); };
  try {
    assert.deepEqual(await getPopularYouTubeVideos(), []);
  } finally {
    if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
});
