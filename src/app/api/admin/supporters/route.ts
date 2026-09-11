import { revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUPPORTER_CACHE_TAG } from "@/lib/supporter-data";
import { isUniqueSupporterError, normalizeSupporterCreateInput, SupporterInputError } from "@/lib/supporters";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });
  try {
    const input = normalizeSupporterCreateInput(await request.json());
    const supporter = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true } });
      if (!user) throw new SupporterInputError("회원을 찾을 수 없습니다.");
      const aggregate = await tx.supporter.aggregate({ _max: { displayOrder: true } });
      return tx.supporter.create({ data: { userId: input.userId, displayOrder: (aggregate._max.displayOrder ?? -1) + 1 }, select: { id: true } });
    });
    revalidateTag(SUPPORTER_CACHE_TAG, { expire: 0 });
    return Response.json(supporter, { status: 201 });
  } catch (error) {
    if (isUniqueSupporterError(error)) return Response.json({ code: "ALREADY_SUPPORTER", message: "이미 등록된 후원자입니다." }, { status: 409 });
    if (error instanceof SupporterInputError || error instanceof SyntaxError) return Response.json({ code: "INVALID_SUPPORTER", message: error.message }, { status: 400 });
    console.error("Supporter creation failed.");
    return Response.json({ code: "CREATE_FAILED", message: "후원자를 추가할 수 없습니다." }, { status: 500 });
  }
}
