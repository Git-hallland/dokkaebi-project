import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { CommunityCommentError, assertCommentAuthor, normalizeCommentBody } from "@/lib/community-comments";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
async function sessionId(request: Request) { return (await auth.api.getSession({ headers: request.headers }))?.user.id ?? null; }

export async function PATCH(request: Request, { params }: Context) {
  const userId = await sessionId(request); if (!userId) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  try {
    const input: unknown = await request.json(); if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => key !== "body")) throw new CommunityCommentError("요청 형식이 올바르지 않습니다.");
    const body = normalizeCommentBody((input as { body?: unknown }).body); const { id } = await params;
    const postId = await prisma.$transaction(async (tx) => {
      const found = await tx.guideComment.findUnique({ where: { id }, select: { postId: true } }); if (!found) throw new CommunityCommentError("댓글을 찾을 수 없습니다.");
      const [post] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "GuidePost" WHERE "id" = ${found.postId} AND "deletedAt" IS NULL FOR UPDATE`; if (!post) throw new CommunityCommentError("게시물을 찾을 수 없습니다.");
      const [comment] = await tx.$queryRaw<Array<{ authorId: string | null; deletedAt: Date | null }>>`SELECT "authorId", "deletedAt" FROM "GuideComment" WHERE "id" = ${id} FOR UPDATE`; assertCommentAuthor(userId, comment ?? null);
      await tx.guideComment.update({ where: { id }, data: { body } }); return found.postId;
    });
    revalidatePath(`/community/${postId}`); return Response.json({ id });
  } catch (error) { if (error instanceof CommunityCommentError || error instanceof SyntaxError) return Response.json({ code: "COMMENT_FORBIDDEN", message: error.message }, { status: error.message.includes("작성자") ? 403 : error.message.includes("찾을 수") ? 404 : 400 }); console.error("Community comment update failed."); return Response.json({ code: "COMMENT_FAILED", message: "댓글을 수정할 수 없습니다." }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Context) {
  const userId = await sessionId(request); if (!userId) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const postId = await prisma.$transaction(async (tx) => {
      const found = await tx.guideComment.findUnique({ where: { id }, select: { postId: true } }); if (!found) throw new CommunityCommentError("댓글을 찾을 수 없습니다.");
      const [post] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "GuidePost" WHERE "id" = ${found.postId} AND "deletedAt" IS NULL FOR UPDATE`; if (!post) throw new CommunityCommentError("게시물을 찾을 수 없습니다.");
      const [comment] = await tx.$queryRaw<Array<{ authorId: string | null; deletedAt: Date | null }>>`SELECT "authorId", "deletedAt" FROM "GuideComment" WHERE "id" = ${id} FOR UPDATE`; assertCommentAuthor(userId, comment ?? null);
      const removed = await tx.guideComment.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
      if (removed.count === 1) await tx.guidePost.updateMany({ where: { id: found.postId, deletedAt: null, commentCount: { gt: 0 } }, data: { commentCount: { decrement: 1 } } });
      return found.postId;
    });
    revalidatePath(`/community/${postId}`); return Response.json({ id });
  } catch (error) { if (error instanceof CommunityCommentError) return Response.json({ code: "COMMENT_FORBIDDEN", message: error.message }, { status: error.message.includes("작성자") ? 403 : 404 }); console.error("Community comment deletion failed."); return Response.json({ code: "COMMENT_FAILED", message: "댓글을 삭제할 수 없습니다." }, { status: 500 }); }
}
