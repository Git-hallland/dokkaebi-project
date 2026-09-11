import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { CommunityInputError, normalizeCommunityPostInput } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings-data";
import { canCreateGuide } from "@/lib/site-settings";
import { revalidateCommunityContent } from "@/lib/public-content-cache";
import { CommunityRateLimitError, GUIDE_POST_DUPLICATE_WINDOW_MS, assertGuidePostRateLimit } from "@/lib/community-posting";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  const siteSettings = await getSiteSettings();
  if (!canCreateGuide(session.user.role, siteSettings.guideWriteEnabled)) {
    return Response.json({ code: "GUIDE_WRITING_DISABLED", message: "공략 작성은 정식 오픈 후 이용할 수 있습니다." }, { status: 403 });
  }
  try {
    const input = normalizeCommunityPostInput(await request.json(), process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim());
    const post = await prisma.$transaction(async (tx) => {
      if (session.user.role !== "ADMIN") {
        await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${session.user.id} FOR UPDATE`;
        const now = new Date();
        const [latest, recentPosts] = await Promise.all([
          tx.guidePost.findFirst({ where: { authorId: session.user.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
          tx.guidePost.findMany({ where: { authorId: session.user.id, createdAt: { gte: new Date(now.getTime() - GUIDE_POST_DUPLICATE_WINDOW_MS) } }, orderBy: { createdAt: "desc" }, take: 5, select: { body: true, title: true } }),
        ]);
        assertGuidePostRateLimit(now, latest?.createdAt ?? null, input, recentPosts);
      }
      return tx.guidePost.create({
        data: { authorId: session.user.id, category: input.category, title: input.title, body: input.body as Prisma.InputJsonValue },
        select: { id: true },
      });
    });
    revalidateCommunityContent();
    return Response.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof CommunityRateLimitError) {
      return Response.json({ code: "RATE_LIMITED", message: error.message }, { status: 429 });
    }
    if (error instanceof CommunityInputError || error instanceof SyntaxError) {
      return Response.json({ code: "INVALID_POST", message: error.message }, { status: 400 });
    }
    console.error("Community post creation failed.");
    return Response.json({ code: "CREATE_FAILED", message: "게시물을 저장할 수 없습니다." }, { status: 500 });
  }
}
