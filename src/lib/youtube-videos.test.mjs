import assert from "node:assert/strict";
import test from "node:test";

import { parseYouTubeSearchItems } from "./youtube-videos.ts";

test("accepts the required YouTube fields and trusted thumbnail host", () => {
  assert.deepEqual(
    parseYouTubeSearchItems([
      {
        id: { videoId: "video-1" },
        snippet: {
          channelTitle: "공식 채널",
          thumbnails: { high: { url: "https://i.ytimg.com/vi/video-1/hqdefault.jpg" } },
          title: "도깨비의세계 영상",
        },
      },
    ]),
    [
      {
        channelTitle: "공식 채널",
        thumbnailUrl: "https://i.ytimg.com/vi/video-1/hqdefault.jpg",
        title: "도깨비의세계 영상",
        videoId: "video-1",
      },
    ],
  );
});

test("rejects malformed results and untrusted thumbnail hosts", () => {
  assert.deepEqual(parseYouTubeSearchItems(null), []);
  assert.deepEqual(
    parseYouTubeSearchItems([
      {
        id: { videoId: "video-2" },
        snippet: {
          channelTitle: "외부 채널",
          thumbnails: { high: { url: "https://example.com/untrusted.jpg" } },
          title: "외부 영상",
        },
      },
      { id: {}, snippet: {} },
    ]),
    [],
  );
});
