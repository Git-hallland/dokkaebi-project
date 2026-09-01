import { auth } from "@/lib/auth";
import { CommunityInteractionError, assertLivePost, normalizeReadingProgress } from "@/lib/community-interactions";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "progress")) throw new CommunityInteractionError("요청 형식이 올바르지 않습니다.");
    const progress = normalizeReadingProgress((body as { progress?: unknown }).progress);
    const { id } = await params;
    await prisma.$transaction(async (tx) => {
      const [post] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "GuidePost" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
      assertLivePost(post ? { deletedAt: null } : null);
      await tx.guideReadingProgress.upsert({ where: { userId_postId: { userId: session.user.id, postId: id } }, create: { userId: session.user.id, postId: id, progress }, update: { progress } });
    });
    return Response.json({ progress });
  } catch (error) {
    if (error instanceof CommunityInteractionError || error instanceof SyntaxError) {
      const status = error.message.includes("찾을 수") ? 404 : 400;
      return Response.json({ code: status === 404 ? "NOT_FOUND" : "INVALID_PROGRESS", message: error.message }, { status });
    }
    console.error("Community reading progress failed."); return Response.json({ code: "PROGRESS_FAILED", message: "읽기 위치를 저장할 수 없습니다." }, { status: 500 });
  }
}
