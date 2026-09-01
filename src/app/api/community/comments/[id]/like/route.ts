import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { CommunityCommentError, assertCommentLikeAllowed, notificationDedupeKey, shouldNotify } from "@/lib/community-comments";
import { didCreateOrRemoveRelation } from "@/lib/community-interactions";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
async function user(request: Request) { return (await auth.api.getSession({ headers: request.headers }))?.user.id ?? null; }
async function mutate(request: Request, id: string, active: boolean) {
  const userId = await user(request); if (!userId) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const found = await tx.guideComment.findUnique({ where: { id }, select: { postId: true } }); if (!found) throw new CommunityCommentError("댓글을 찾을 수 없습니다.");
      const [post] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "GuidePost" WHERE "id" = ${found.postId} AND "deletedAt" IS NULL FOR UPDATE`; if (!post) throw new CommunityCommentError("게시물을 찾을 수 없습니다.");
      const [comment] = await tx.$queryRaw<Array<{ authorId: string | null; deletedAt: Date | null }>>`SELECT "authorId", "deletedAt" FROM "GuideComment" WHERE "id" = ${id} FOR UPDATE`; assertCommentLikeAllowed(userId, comment ?? null);
      const dedupeKey = notificationDedupeKey("COMMENT_LIKE", id, userId);
      if (active) {
        const created = await tx.guideCommentLike.createMany({ data: { userId, commentId: id }, skipDuplicates: true });
        if (didCreateOrRemoveRelation(created.count)) {
          await tx.guideComment.updateMany({ where: { id, deletedAt: null }, data: { likeCount: { increment: 1 } } });
          if (shouldNotify(comment?.authorId, userId)) await tx.guideNotification.createMany({ data: { recipientId: comment!.authorId!, actorId: userId, type: "COMMENT_LIKE", postId: found.postId, commentId: id, dedupeKey }, skipDuplicates: true });
        }
      } else {
        const removed = await tx.guideCommentLike.deleteMany({ where: { userId, commentId: id } });
        if (didCreateOrRemoveRelation(removed.count)) {
          await tx.guideComment.updateMany({ where: { id, deletedAt: null, likeCount: { gt: 0 } }, data: { likeCount: { decrement: 1 } } });
          await tx.guideNotification.deleteMany({ where: { dedupeKey, readAt: null } });
        }
      }
      const current = await tx.guideComment.findUniqueOrThrow({ where: { id }, select: { likeCount: true } }); return { active, likeCount: Math.max(0, current.likeCount), postId: found.postId };
    });
    revalidatePath(`/community/${result.postId}`); return Response.json({ active: result.active, likeCount: result.likeCount });
  } catch (error) { if (error instanceof CommunityCommentError) return Response.json({ code: "COMMENT_LIKE_FORBIDDEN", message: error.message }, { status: error.message.includes("자신") ? 403 : 404 }); console.error("Community comment like failed."); return Response.json({ code: "COMMENT_LIKE_FAILED", message: "댓글 좋아요를 변경할 수 없습니다." }, { status: 500 }); }
}
export async function POST(request: Request, { params }: Context) { return mutate(request, (await params).id, true); }
export async function DELETE(request: Request, { params }: Context) { return mutate(request, (await params).id, false); }
