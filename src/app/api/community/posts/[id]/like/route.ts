import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { notificationDedupeKey, shouldNotify } from "@/lib/community-comments";
import { CommunityInteractionError, assertLikeAllowed, didCreateOrRemoveRelation } from "@/lib/community-interactions";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
async function sessionUser(request: Request) { return (await auth.api.getSession({ headers: request.headers }))?.user.id ?? null; }
function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : "좋아요를 변경할 수 없습니다."; return Response.json({ code: message.includes("찾을 수") ? "NOT_FOUND" : "LIKE_FORBIDDEN", message }, { status: message.includes("찾을 수") ? 404 : 403 }); }

export async function POST(request: Request, { params }: Context) {
  const userId = await sessionUser(request); if (!userId) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [post] = await tx.$queryRaw<Array<{ authorId: string | null }>>`SELECT "authorId" FROM "GuidePost" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
      assertLikeAllowed(userId, post ? { ...post, deletedAt: null } : null);
      const created = await tx.guidePostLike.createMany({ data: { userId, postId: id }, skipDuplicates: true });
      if (didCreateOrRemoveRelation(created.count)) {
        const updated = await tx.guidePost.updateMany({ where: { id, deletedAt: null }, data: { likeCount: { increment: 1 } } });
        if (updated.count !== 1) throw new CommunityInteractionError("게시물을 찾을 수 없습니다.");
        if (shouldNotify(post?.authorId, userId)) await tx.guideNotification.createMany({ data: { recipientId: post!.authorId!, actorId: userId, type: "POST_LIKE", postId: id, dedupeKey: notificationDedupeKey("POST_LIKE", id, userId) }, skipDuplicates: true });
      }
      const current = await tx.guidePost.findUniqueOrThrow({ where: { id }, select: { likeCount: true } });
      return { active: true, likeCount: current.likeCount };
    });
    revalidatePath("/"); revalidatePath("/community"); return Response.json(result);
  } catch (error) { if (error instanceof CommunityInteractionError) return errorResponse(error); console.error("Community like failed."); return Response.json({ code: "LIKE_FAILED", message: "좋아요를 변경할 수 없습니다." }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Context) {
  const userId = await sessionUser(request); if (!userId) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [post] = await tx.$queryRaw<Array<{ authorId: string | null }>>`SELECT "authorId" FROM "GuidePost" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
      assertLikeAllowed(userId, post ? { ...post, deletedAt: null } : null);
      const removed = await tx.guidePostLike.deleteMany({ where: { userId, postId: id } });
      if (didCreateOrRemoveRelation(removed.count)) {
        await tx.guidePost.updateMany({ where: { id, deletedAt: null, likeCount: { gt: 0 } }, data: { likeCount: { decrement: 1 } } });
        await tx.guideNotification.deleteMany({ where: { dedupeKey: notificationDedupeKey("POST_LIKE", id, userId), readAt: null } });
      }
      const current = await tx.guidePost.findUniqueOrThrow({ where: { id }, select: { likeCount: true } });
      return { active: false, likeCount: Math.max(0, current.likeCount) };
    });
    revalidatePath("/"); revalidatePath("/community"); return Response.json(result);
  } catch (error) { if (error instanceof CommunityInteractionError) return errorResponse(error); console.error("Community unlike failed."); return Response.json({ code: "LIKE_FAILED", message: "좋아요를 변경할 수 없습니다." }, { status: 500 }); }
}
