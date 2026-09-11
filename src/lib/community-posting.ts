import type { CommunityDocument } from "@/lib/guide-community";

export const GUIDE_POST_COOLDOWN_MS = 30_000;
export const GUIDE_POST_DUPLICATE_WINDOW_MS = 10 * 60_000;
export const GUIDE_POST_RATE_LIMIT_MESSAGE = "공략글은 연속으로 작성할 수 없습니다. 잠시 후 다시 시도해주세요.";

export class CommunityRateLimitError extends Error {
  constructor() {
    super(GUIDE_POST_RATE_LIMIT_MESSAGE);
  }
}

export function assertGuidePostRateLimit(
  now: Date,
  latestCreatedAt: Date | null,
  input: { title: string; body: CommunityDocument },
  recentPosts: readonly { title: string; body: unknown }[],
) {
  if (latestCreatedAt && now.getTime() - latestCreatedAt.getTime() < GUIDE_POST_COOLDOWN_MS) {
    throw new CommunityRateLimitError();
  }
  const body = JSON.stringify(input.body);
  if (recentPosts.some((post) => post.title === input.title && JSON.stringify(post.body) === body)) {
    throw new CommunityRateLimitError();
  }
}
