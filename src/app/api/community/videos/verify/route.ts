import { auth } from "@/lib/auth";
import { verifyPostVideoUpload } from "@/lib/cloudinary-post";
import { getBlockingSanction, sanctionResponse } from "@/lib/user-sanctions";
import { CommunityVideoError } from "@/lib/community-video";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }
  const sanction = await getBlockingSanction(session.user.id, "POST"); if (sanction) return sanctionResponse(sanction);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "upload")) throw new Error("요청 형식이 올바르지 않습니다.");
    return Response.json(verifyPostVideoUpload((body as { upload?: unknown }).upload));
  } catch (error) {
    return Response.json({
      code: "INVALID_POST_VIDEO",
      message: error instanceof CommunityVideoError ? error.message : "영상 업로드 검증에 실패했습니다.",
    }, { status: 400 });
  }
}
