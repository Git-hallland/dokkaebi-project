import { NextRequest, NextResponse } from "next/server";
import { CommunityInteractionError, VIEWER_COOKIE_MAX_AGE, VIEWER_COOKIE_NAME, createViewerCookie, didCreateOrRemoveRelation, getSeoulDate, hashViewerIdentifier, verifyViewerCookie } from "@/lib/community-interactions";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
function secret() { const value = process.env.BETTER_AUTH_SECRET?.trim(); if (!value) throw new Error("BETTER_AUTH_SECRET is not configured."); return value; }

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const signingSecret = secret();
    const currentCookie = request.cookies.get(VIEWER_COOKIE_NAME)?.value;
    let identifier = verifyViewerCookie(currentCookie, signingSecret);
    let nextCookie: string | null = null;
    if (!identifier) { nextCookie = createViewerCookie(signingSecret); identifier = verifyViewerCookie(nextCookie, signingSecret); }
    if (!identifier) throw new Error("조회 식별자를 생성할 수 없습니다.");
    const viewerKeyHash = hashViewerIdentifier(identifier, signingSecret);
    const result = await prisma.$transaction(async (tx) => {
      const [post] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "GuidePost" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
      if (!post) throw new CommunityInteractionError("게시물을 찾을 수 없습니다.");
      const created = await tx.guidePostView.createMany({ data: { postId: id, viewerKeyHash, viewedOn: getSeoulDate() }, skipDuplicates: true });
      if (didCreateOrRemoveRelation(created.count)) {
        const updated = await tx.guidePost.updateMany({ where: { id, deletedAt: null }, data: { viewCount: { increment: 1 } } });
        if (updated.count !== 1) throw new CommunityInteractionError("게시물을 찾을 수 없습니다.");
      }
      const current = await tx.guidePost.findUniqueOrThrow({ where: { id }, select: { viewCount: true } });
      return { incremented: didCreateOrRemoveRelation(created.count), viewCount: current.viewCount };
    });
    const response = NextResponse.json(result);
    if (nextCookie) response.cookies.set(VIEWER_COOKIE_NAME, nextCookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: VIEWER_COOKIE_MAX_AGE, path: "/" });
    return response;
  } catch (error) {
    if (error instanceof CommunityInteractionError) return NextResponse.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
    console.error("Community view recording failed."); return NextResponse.json({ code: "VIEW_FAILED", message: "조회수를 기록할 수 없습니다." }, { status: 500 });
  }
}
