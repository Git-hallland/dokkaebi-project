import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  CommunityRateLimitError,
  GUIDE_POST_COOLDOWN_MS,
  assertGuidePostRateLimit,
} from "./community-posting.ts";

const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "공략 내용" }] }] };

test("blocks another guide post during the 30 second cooldown", () => {
  const now = new Date("2026-09-11T00:00:30Z");
  assert.throws(() => assertGuidePostRateLimit(now, new Date(now.getTime() - GUIDE_POST_COOLDOWN_MS + 1), { title: "보스 공략", body }, []), CommunityRateLimitError);
  assert.doesNotThrow(() => assertGuidePostRateLimit(now, new Date(now.getTime() - GUIDE_POST_COOLDOWN_MS), { title: "보스 공략", body }, []));
});

test("blocks an identical normalized title and body in the recent window", () => {
  assert.throws(() => assertGuidePostRateLimit(new Date(), null, { title: "보스 공략", body }, [{ title: "보스 공략", body: structuredClone(body) }]), CommunityRateLimitError);
  assert.doesNotThrow(() => assertGuidePostRateLimit(new Date(), null, { title: "다른 공략", body }, [{ title: "보스 공략", body }]));
});

test("the write API enforces limits in a locked transaction and exempts only admins", async () => {
  const source = await readFile(new URL("../app/api/community/posts/route.ts", import.meta.url), "utf8");
  assert.match(source, /session\.user\.role !== "ADMIN"/u);
  assert.match(source, /FOR UPDATE/u);
  assert.match(source, /status: 429/u);
});
