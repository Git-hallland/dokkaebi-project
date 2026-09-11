import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string; sanctionId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });
  const { id: userId, sanctionId } = await params;
  if (userId === session.user.id) return Response.json({ code: "SELF_SANCTION_FORBIDDEN", message: "자기 자신의 제재는 변경할 수 없습니다." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [target] = await tx.$queryRaw<Array<{ id: string; role: string }>>`SELECT "id", "role"::text FROM "user" WHERE "id" = ${userId} FOR UPDATE`;
      if (!target) return { count: 0 };
      if (target.role === "ADMIN") return { count: -1 };
      return tx.userSanction.updateMany({ where: { id: sanctionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokedById: session.user.id } });
    });
    if (result.count === -1) return Response.json({ code: "ADMIN_SANCTION_FORBIDDEN", message: "관리자 계정의 제재는 변경할 수 없습니다." }, { status: 400 });
    if (result.count !== 1) return Response.json({ code: "NOT_FOUND", message: "활성 제재를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ revoked: true });
  } catch {
    console.error("Admin sanction revocation failed.");
    return Response.json({ code: "SANCTION_REVOKE_FAILED", message: "제재를 취소할 수 없습니다." }, { status: 500 });
  }
}
