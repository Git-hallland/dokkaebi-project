import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ count: 0 }, { status: 401 });
  const count = await prisma.guideNotification.count({ where: { recipientId: session.user.id, readAt: null } });
  return Response.json({ count });
}
