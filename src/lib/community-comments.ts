export const COMMENT_MAX_LENGTH = 1_000;
const COMMENT_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export class CommunityCommentError extends Error {}

export function normalizeCommentBody(value: unknown) {
  if (typeof value !== "string") throw new CommunityCommentError("댓글을 입력해 주세요.");
  const body = value.trim();
  if (!body || body.length > COMMENT_MAX_LENGTH || COMMENT_CONTROL_CHARACTERS.test(body)) {
    throw new CommunityCommentError(`댓글은 제어문자 없이 1~${COMMENT_MAX_LENGTH.toLocaleString("ko-KR")}자로 입력해 주세요.`);
  }
  return body;
}

export function assertCommentAuthor(userId: string, comment: { authorId: string | null; deletedAt: Date | null } | null) {
  if (!comment || comment.deletedAt) throw new CommunityCommentError("댓글을 찾을 수 없습니다.");
  if (comment.authorId !== userId) throw new CommunityCommentError("댓글 작성자만 수정하거나 삭제할 수 있습니다.");
}

export function assertReplyParent(postId: string, parent: { postId: string; parentId: string | null; deletedAt: Date | null } | null) {
  if (!parent || parent.deletedAt || parent.postId !== postId) throw new CommunityCommentError("답글을 작성할 댓글을 찾을 수 없습니다.");
  if (parent.parentId) throw new CommunityCommentError("답글에는 다시 답글을 작성할 수 없습니다.");
}

export function assertCommentLikeAllowed(userId: string, comment: { authorId: string | null; deletedAt: Date | null } | null) {
  if (!comment || comment.deletedAt) throw new CommunityCommentError("댓글을 찾을 수 없습니다.");
  if (comment.authorId === userId) throw new CommunityCommentError("자신이 작성한 댓글에는 좋아요를 누를 수 없습니다.");
}

export function notificationDedupeKey(type: "POST_LIKE" | "POST_COMMENT" | "COMMENT_REPLY" | "COMMENT_LIKE", targetId: string, actorId?: string) {
  if (type === "POST_COMMENT" || type === "COMMENT_REPLY") return `${type.toLowerCase()}:${targetId}`;
  if (!actorId) throw new CommunityCommentError("알림 actor가 필요합니다.");
  return `${type.toLowerCase()}:${targetId}:${actorId}`;
}

export function shouldNotify(recipientId: string | null | undefined, actorId: string) {
  return Boolean(recipientId && recipientId !== actorId);
}
