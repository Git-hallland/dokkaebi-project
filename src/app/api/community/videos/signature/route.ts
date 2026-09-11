import { auth } from "@/lib/auth";
import { createPostVideoUploadSignature } from "@/lib/cloudinary-post";
import { getBlockingSanction, sanctionResponse } from "@/lib/user-sanctions";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }
  const sanction = await getBlockingSanction(session.user.id, "POST"); if (sanction) return sanctionResponse(sanction);
  try {
    return Response.json(createPostVideoUploadSignature());
  } catch {
    return Response.json({ code: "CLOUDINARY_NOT_CONFIGURED", message: "영상 업로드 설정이 완료되지 않았습니다." }, { status: 503 });
  }
}
