import { auth } from "@/lib/auth";
import {
  CommunityReportError,
  assertReportableTarget,
  isUniqueConstraintError,
  normalizeGuideReportInput,
} from "@/lib/community-reports";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });

  try {
    const input = normalizeGuideReportInput(await request.json());
    const { id: commentId } = await params;
    const comment = await prisma.guideComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, deletedAt: true, post: { select: { deletedAt: true } } },
    });
    assertReportableTarget(session.user.id, comment && !comment.post.deletedAt ? comment : null);
    const report = await prisma.guideReport.create({
      data: { reporterId: session.user.id, commentId, reason: input.reason, description: input.description },
      select: { id: true },
    });
    return Response.json(report, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) return Response.json({ code: "ALREADY_REPORTED", message: "이미 신고한 콘텐츠입니다." }, { status: 409 });
    if (error instanceof CommunityReportError || error instanceof SyntaxError) {
      const status = error.message.includes("자신") ? 403 : error.message.includes("찾을 수") ? 404 : 400;
      return Response.json({ code: "INVALID_REPORT", message: error.message }, { status });
    }
    console.error("Community comment report creation failed.");
    return Response.json({ code: "REPORT_FAILED", message: "신고를 접수할 수 없습니다." }, { status: 500 });
  }
}
