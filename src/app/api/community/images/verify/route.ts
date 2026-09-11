import { auth } from "@/lib/auth";
import { verifyPostImageUpload } from "@/lib/cloudinary-post";
import { getBlockingSanction, sanctionResponse } from "@/lib/user-sanctions";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }
  const sanction = await getBlockingSanction(session.user.id, "POST"); if (sanction) return sanctionResponse(sanction);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "upload")) throw new Error("요청 형식이 올바르지 않습니다.");
    return Response.json(verifyPostImageUpload((body as { upload?: unknown }).upload));
  } catch (error) {
    return Response.json({ code: "INVALID_POST_IMAGE", message: error instanceof Error ? error.message : "이미지를 검증할 수 없습니다." }, { status: 400 });
  }
}
