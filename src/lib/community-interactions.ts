import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const VIEWER_COOKIE_NAME = "dokkaebi_viewer";
export const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const PROGRESS_RESTORE_MIN = 0.05;
export const PROGRESS_RESTORE_MAX = 0.95;

export class CommunityInteractionError extends Error {}

export function assertLivePost(post: { deletedAt: Date | null } | null) {
  if (!post || post.deletedAt) throw new CommunityInteractionError("게시물을 찾을 수 없습니다.");
}

export function assertLikeAllowed(userId: string, post: { authorId: string | null; deletedAt: Date | null } | null) {
  assertLivePost(post);
  if (post?.authorId === userId) throw new CommunityInteractionError("자신이 작성한 글에는 좋아요를 누를 수 없습니다.");
}

export function normalizeReadingProgress(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new CommunityInteractionError("읽기 위치는 0부터 1 사이의 숫자여야 합니다.");
  }
  return value;
}

function signature(identifier: string, secret: string) {
  return createHmac("sha256", secret).update(`community-viewer\n${identifier}`).digest("base64url");
}

export function createViewerCookie(secret: string, identifier = randomBytes(24).toString("base64url")) {
  return `${identifier}.${signature(identifier, secret)}`;
}

export function verifyViewerCookie(cookie: string | undefined, secret: string) {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]{32}$/u.test(parts[0])) return null;
  const expected = Buffer.from(signature(parts[0], secret));
  const actual = Buffer.from(parts[1]);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? parts[0] : null;
}

export function hashViewerIdentifier(identifier: string, secret: string) {
  return createHmac("sha256", secret).update(`community-view\n${identifier}`).digest("hex");
}

export function getSeoulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

export function shouldRestoreProgress(progress: number | null | undefined) {
  return typeof progress === "number" && progress >= PROGRESS_RESTORE_MIN && progress <= PROGRESS_RESTORE_MAX;
}

export function didCreateOrRemoveRelation(affectedRows: number) {
  return affectedRows === 1;
}

export function decrementLikeCountSafely(current: number) {
  return Math.max(0, current - 1);
}
