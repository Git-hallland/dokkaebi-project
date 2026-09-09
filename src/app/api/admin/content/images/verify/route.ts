import { isCmsAdmin } from "@/lib/admin-content";
import { auth } from "@/lib/auth";
import { verifyCmsImageUpload } from "@/lib/cloudinary-post";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
  if (!isCmsAdmin(session.user.role)) return Response.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "upload")) {
      throw new Error("요청 형식이 올바르지 않습니다.");
    }
    return Response.json(verifyCmsImageUpload((body as { upload?: unknown }).upload));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "이미지를 검증할 수 없습니다." }, { status: 400 });
  }
}
