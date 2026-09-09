import { isCmsAdmin } from "@/lib/admin-content";
import { auth } from "@/lib/auth";
import { createCmsImageUploadSignature } from "@/lib/cloudinary-post";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
  if (!isCmsAdmin(session.user.role)) return Response.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  try {
    return Response.json(createCmsImageUploadSignature());
  } catch {
    return Response.json({ message: "이미지 업로드 설정이 완료되지 않았습니다." }, { status: 503 });
  }
}
