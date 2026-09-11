import type { Prisma, UserSanctionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SanctionAction = "ACCOUNT" | "POST" | "COMMENT";

const activeWhere = (userId: string, now: Date): Prisma.UserSanctionWhereInput => ({
  userId,
  revokedAt: null,
  startsAt: { lte: now },
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
});

export async function getActiveUserSanctions(userId: string, now = new Date()) {
  return prisma.userSanction.findMany({
    where: activeWhere(userId, now),
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, reason: true, startsAt: true, endsAt: true },
  });
}

export async function getBlockingSanction(userId: string, action: SanctionAction, now = new Date()) {
  const types: UserSanctionType[] = action === "POST" ? ["BAN", "POST_SUSPENSION"] : action === "COMMENT" ? ["BAN", "COMMENT_SUSPENSION"] : ["BAN"];
  return prisma.userSanction.findFirst({
    where: { ...activeWhere(userId, now), type: { in: types } },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    select: { id: true, type: true, reason: true, startsAt: true, endsAt: true },
  });
}

export function sanctionResponse(sanction: Readonly<{ type: UserSanctionType; reason: string | null; startsAt: Date; endsAt: Date | null }>) {
  const message = sanction.type === "POST_SUSPENSION" ? "게시글을 작성할 수 없습니다." : sanction.type === "COMMENT_SUSPENSION" ? "댓글을 작성할 수 없습니다." : "이 계정은 이용이 제한되었습니다.";
  return Response.json({
    code: sanction.type,
    message,
    sanction: { ...sanction, startsAt: sanction.startsAt.toISOString(), endsAt: sanction.endsAt?.toISOString() ?? null },
  }, { status: 403 });
}
