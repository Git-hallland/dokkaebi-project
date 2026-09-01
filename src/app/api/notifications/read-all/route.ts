import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers }); if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  const result = await prisma.guideNotification.updateMany({ where: { recipientId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  return Response.json({ count: result.count });
}
