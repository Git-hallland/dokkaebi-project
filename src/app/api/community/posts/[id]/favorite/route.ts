import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { CommunityInteractionError, assertLivePost } from "@/lib/community-interactions";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
async function user(request: Request) { return (await auth.api.getSession({ headers: request.headers }))?.user.id ?? null; }

async function mutate(request: Request, id: string, active: boolean) {
  const userId = await user(request); if (!userId) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  try {
    await prisma.$transaction(async (tx) => {
      const [post] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "GuidePost" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
      assertLivePost(post ? { deletedAt: null } : null);
      if (active) await tx.guidePostFavorite.createMany({ data: { userId, postId: id }, skipDuplicates: true });
      else await tx.guidePostFavorite.deleteMany({ where: { userId, postId: id } });
    });
    revalidatePath("/favorites"); return Response.json({ active });
  } catch (error) {
    if (error instanceof CommunityInteractionError) return Response.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
    console.error("Community favorite failed."); return Response.json({ code: "FAVORITE_FAILED", message: "즐겨찾기를 변경할 수 없습니다." }, { status: 500 });
  }
}
export async function POST(request: Request, { params }: Context) { return mutate(request, (await params).id, true); }
export async function DELETE(request: Request, { params }: Context) { return mutate(request, (await params).id, false); }
