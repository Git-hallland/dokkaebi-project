import { auth } from "@/lib/auth";
import { createProfileImageUploadSignature } from "@/lib/cloudinary-profile";
import { getBlockingSanction, sanctionResponse } from "@/lib/user-sanctions";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }
  const sanction = await getBlockingSanction(session.user.id, "ACCOUNT");
  if (sanction) return sanctionResponse(sanction);

  try {
    return Response.json(createProfileImageUploadSignature(session.user.id));
  } catch {
    return Response.json(
      { code: "CLOUDINARY_NOT_CONFIGURED", message: "이미지 업로드가 아직 설정되지 않았습니다." },
      { status: 503 },
    );
  }
}
