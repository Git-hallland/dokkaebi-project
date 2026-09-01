import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers }); if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const notification = await prisma.guideNotification.findFirst({ where: { id, recipientId: session.user.id }, select: { id: true, readAt: true } });
  if (!notification) return Response.json({ code: "NOT_FOUND", message: "알림을 찾을 수 없습니다." }, { status: 404 });
  if (!notification.readAt) await prisma.guideNotification.updateMany({ where: { id, recipientId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  return Response.json({ id });
}
