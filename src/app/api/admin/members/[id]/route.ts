import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { providerNames } from "@/lib/supporters";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });

  const member = await prisma.user.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      accounts: { select: { providerId: true } },
      sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      sanctions: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          type: true,
          reason: true,
          startsAt: true,
          endsAt: true,
          revokedAt: true,
          createdBy: { select: { name: true } },
          revokedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!member) return Response.json({ code: "NOT_FOUND", message: "회원을 찾을 수 없습니다." }, { status: 404 });

  return Response.json({
    id: member.id,
    name: member.name,
    email: member.email,
    image: member.image,
    role: member.role,
    providers: providerNames(member.accounts),
    createdAt: member.createdAt.toISOString(),
    lastLoginAt: member.sessions[0]?.updatedAt.toISOString() ?? null,
    sanctions: member.sanctions.map((sanction) => ({
      id: sanction.id,
      type: sanction.type,
      reason: sanction.reason,
      startsAt: sanction.startsAt.toISOString(),
      endsAt: sanction.endsAt?.toISOString() ?? null,
      revokedAt: sanction.revokedAt?.toISOString() ?? null,
      createdBy: sanction.createdBy.name,
      revokedBy: sanction.revokedBy?.name ?? null,
    })),
  });
}
