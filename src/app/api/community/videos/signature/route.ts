import { auth } from "@/lib/auth";
import { createPostVideoUploadSignature } from "@/lib/cloudinary-post";

export async function POST(request: Request) {
  if (!await auth.api.getSession({ headers: request.headers })) {
    return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    return Response.json(createPostVideoUploadSignature());
  } catch {
    return Response.json({ code: "CLOUDINARY_NOT_CONFIGURED", message: "영상 업로드 설정이 완료되지 않았습니다." }, { status: 503 });
  }
}
