import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { CommunityInputError, normalizeCommunityPostInput } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings-data";
import { canCreateGuide } from "@/lib/site-settings";
import { revalidateCommunityContent } from "@/lib/public-content-cache";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  const siteSettings = await getSiteSettings();
  if (!canCreateGuide(session.user.role, siteSettings.guideWriteEnabled)) {
    return Response.json({ code: "GUIDE_WRITING_DISABLED", message: "공략 작성은 정식 오픈 후 이용할 수 있습니다." }, { status: 403 });
  }
  try {
    const input = normalizeCommunityPostInput(await request.json(), process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim());
    const post = await prisma.guidePost.create({
      data: { authorId: session.user.id, category: input.category, title: input.title, body: input.body as Prisma.InputJsonValue },
      select: { id: true },
    });
    revalidateCommunityContent();
    return Response.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof CommunityInputError || error instanceof SyntaxError) {
      return Response.json({ code: "INVALID_POST", message: error.message }, { status: 400 });
    }
    console.error("Community post creation failed.");
    return Response.json({ code: "CREATE_FAILED", message: "게시물을 저장할 수 없습니다." }, { status: 500 });
  }
}
