import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { CommunityInputError, assertCommunityAuthor, normalizeCommunityPostInput } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

async function authorizedPost(request: Request, id: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { response: Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const post = await prisma.guidePost.findFirst({ where: { id, deletedAt: null }, select: { authorId: true } });
  if (!post) return { response: Response.json({ code: "NOT_FOUND", message: "게시물을 찾을 수 없습니다." }, { status: 404 }) };
  try {
    assertCommunityAuthor(session?.user.id, post.authorId ?? "");
    return { session };
  } catch (error) {
    return { response: Response.json({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "권한이 없습니다." }, { status: 403 }) };
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizedPost(request, id);
  if (access.response) return access.response;
  try {
    const input = normalizeCommunityPostInput(await request.json(), process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim());
    await prisma.guidePost.update({ where: { id }, data: { category: input.category, title: input.title, body: input.body as Prisma.InputJsonValue } });
    return Response.json({ id });
  } catch (error) {
    if (error instanceof CommunityInputError || error instanceof SyntaxError) return Response.json({ code: "INVALID_POST", message: error.message }, { status: 400 });
    console.error("Community post update failed.");
    return Response.json({ code: "UPDATE_FAILED", message: "게시물을 수정할 수 없습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizedPost(request, id);
  if (access.response) return access.response;
  const result = await prisma.guidePost.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  return result.count === 1 ? Response.json({ id }) : Response.json({ code: "NOT_FOUND", message: "게시물을 찾을 수 없습니다." }, { status: 404 });
}
