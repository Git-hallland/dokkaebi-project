import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { CommunityCommentError, normalizeCommentBody, notificationDedupeKey, shouldNotify } from "@/lib/community-comments";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["body", "parentId"].includes(key))) throw new CommunityCommentError("요청 형식이 올바르지 않습니다.");
    const payload = input as { body?: unknown; parentId?: unknown };
    const body = normalizeCommentBody(payload.body);
    const parentId = payload.parentId === null || payload.parentId === undefined ? null : typeof payload.parentId === "string" ? payload.parentId : (() => { throw new CommunityCommentError("답글 대상이 올바르지 않습니다."); })();
    const { id: postId } = await params;
    const comment = await prisma.$transaction(async (tx) => {
      const [post] = await tx.$queryRaw<Array<{ authorId: string | null; id: string }>>`SELECT "id", "authorId" FROM "GuidePost" WHERE "id" = ${postId} AND "deletedAt" IS NULL FOR UPDATE`;
      if (!post) throw new CommunityCommentError("게시물을 찾을 수 없습니다.");
      let parent: { authorId: string | null; id: string; parentId: string | null; postId: string } | null = null;
      if (parentId) {
        const rows = await tx.$queryRaw<Array<{ authorId: string | null; id: string; parentId: string | null; postId: string }>>`SELECT "id", "authorId", "parentId", "postId" FROM "GuideComment" WHERE "id" = ${parentId} AND "deletedAt" IS NULL FOR UPDATE`;
        parent = rows[0] ?? null;
        if (!parent || parent.postId !== postId) throw new CommunityCommentError("답글을 작성할 댓글을 찾을 수 없습니다.");
        if (parent.parentId) throw new CommunityCommentError("답글에는 다시 답글을 작성할 수 없습니다.");
      }
      const created = await tx.guideComment.create({ data: { postId, authorId: session.user.id, parentId, body }, select: { id: true } });
      const updated = await tx.guidePost.updateMany({ where: { id: postId, deletedAt: null }, data: { commentCount: { increment: 1 } } });
      if (updated.count !== 1) throw new CommunityCommentError("게시물을 찾을 수 없습니다.");
      const recipientId = parent ? parent.authorId : post.authorId;
      if (shouldNotify(recipientId, session.user.id)) {
        await tx.guideNotification.create({ data: { recipientId: recipientId!, actorId: session.user.id, type: parent ? "COMMENT_REPLY" : "POST_COMMENT", postId, commentId: created.id, dedupeKey: notificationDedupeKey(parent ? "COMMENT_REPLY" : "POST_COMMENT", created.id) } });
      }
      return created;
    });
    revalidatePath(`/community/${postId}`); return Response.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof CommunityCommentError || error instanceof SyntaxError) return Response.json({ code: "INVALID_COMMENT", message: error.message }, { status: error.message.includes("찾을 수") ? 404 : 400 });
    console.error("Community comment creation failed."); return Response.json({ code: "COMMENT_FAILED", message: "댓글을 저장할 수 없습니다." }, { status: 500 });
  }
}
