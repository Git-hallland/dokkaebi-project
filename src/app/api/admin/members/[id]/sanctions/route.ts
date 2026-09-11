import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUserSanctionInput, UserSanctionInputError } from "@/lib/user-sanction-input";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });
  try {
    const targetId = (await params).id;
    if (targetId === session.user.id) return Response.json({ code: "SELF_SANCTION_FORBIDDEN", message: "자기 자신은 제재할 수 없습니다." }, { status: 400 });
    const input = normalizeUserSanctionInput(await request.json());
    const sanction = await prisma.$transaction(async (tx) => {
      const [target] = await tx.$queryRaw<Array<{ id: string; role: string }>>`SELECT "id", "role"::text FROM "user" WHERE "id" = ${targetId} FOR UPDATE`;
      if (!target) throw new UserSanctionInputError("회원을 찾을 수 없습니다.");
      if (target.role === "ADMIN") throw new UserSanctionInputError("관리자 계정은 제재할 수 없습니다.");
      const now = new Date();
      await tx.userSanction.updateMany({
        where: { userId: targetId, type: input.type, revokedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        data: { revokedAt: now, revokedById: session.user.id },
      });
      return tx.userSanction.create({
        data: { userId: targetId, type: input.type, reason: input.reason, endsAt: input.endsAt, createdById: session.user.id },
        select: { id: true },
      });
    });
    return Response.json(sanction, { status: 201 });
  } catch (error) {
    if (error instanceof UserSanctionInputError || error instanceof SyntaxError) return Response.json({ code: "INVALID_SANCTION", message: error.message }, { status: error.message.includes("찾을 수") ? 404 : 400 });
    console.error("Admin sanction creation failed.");
    return Response.json({ code: "SANCTION_CREATE_FAILED", message: "제재를 적용할 수 없습니다." }, { status: 500 });
  }
}
