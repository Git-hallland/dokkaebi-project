import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  CommunityReportError,
  hasCommunityCapability,
  normalizeGuideReportResolution,
} from "@/lib/community-reports";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
class ReportNotFoundError extends Error {}
class ReportConflictError extends Error {}

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  if (!hasCommunityCapability(session.user.role, "resolveReports")) {
    return Response.json({ code: "FORBIDDEN", message: "신고를 처리할 권한이 없습니다." }, { status: 403 });
  }

  try {
    const input = normalizeGuideReportResolution(await request.json());
    if (input.action === "HIDE_TARGET" && !hasCommunityCapability(session.user.role, "moderateCommunity")) {
      return Response.json({ code: "FORBIDDEN", message: "콘텐츠를 숨길 권한이 없습니다." }, { status: 403 });
    }
    const { id } = await params;
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ commentId: string | null; postId: string | null; status: string }>>`
        SELECT "postId", "commentId", "status"::text AS "status"
        FROM "GuideReport" WHERE "id" = ${id} FOR UPDATE
      `;
      const report = rows[0];
      if (!report) throw new ReportNotFoundError();
      if (report.status !== "PENDING") throw new ReportConflictError();

      let postId = report.postId;
      if (input.action === "HIDE_TARGET" && report.postId) {
        await tx.guidePost.updateMany({ where: { id: report.postId, deletedAt: null }, data: { deletedAt: new Date() } });
      }
      if (input.action === "HIDE_TARGET" && report.commentId) {
        const comments = await tx.$queryRaw<Array<{ deletedAt: Date | null; postId: string }>>`
          SELECT "postId", "deletedAt" FROM "GuideComment" WHERE "id" = ${report.commentId} FOR UPDATE
        `;
        const comment = comments[0];
        if (comment) {
          postId = comment.postId;
          const removed = await tx.guideComment.updateMany({ where: { id: report.commentId, deletedAt: null }, data: { deletedAt: new Date() } });
          if (removed.count === 1) {
            await tx.guidePost.updateMany({ where: { id: comment.postId, deletedAt: null, commentCount: { gt: 0 } }, data: { commentCount: { decrement: 1 } } });
          }
        }
      }

      await tx.guideReport.update({
        where: { id },
        data: { status: input.status, resolution: input.resolution, resolvedAt: new Date(), resolvedById: session.user.id },
      });
      return { id, postId };
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/reports/${result.id}`);
    if (result.postId) revalidatePath(`/community/${result.postId}`);
    revalidatePath("/community");
    revalidatePath("/");
    revalidatePath("/favorites");
    return Response.json({ id: result.id, status: input.status });
  } catch (error) {
    if (error instanceof ReportNotFoundError) return Response.json({ code: "NOT_FOUND", message: "신고를 찾을 수 없습니다." }, { status: 404 });
    if (error instanceof ReportConflictError) return Response.json({ code: "ALREADY_RESOLVED", message: "이미 처리된 신고입니다." }, { status: 409 });
    if (error instanceof CommunityReportError || error instanceof SyntaxError) return Response.json({ code: "INVALID_RESOLUTION", message: error.message }, { status: 400 });
    console.error("Community report resolution failed.");
    return Response.json({ code: "RESOLUTION_FAILED", message: "신고를 처리할 수 없습니다." }, { status: 500 });
  }
}
