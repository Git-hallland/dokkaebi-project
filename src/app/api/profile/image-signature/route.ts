import { auth } from "@/lib/auth";
import { createProfileImageUploadSignature } from "@/lib/cloudinary-profile";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(createProfileImageUploadSignature(session.user.id));
  } catch {
    return Response.json(
      { code: "CLOUDINARY_NOT_CONFIGURED", message: "이미지 업로드가 아직 설정되지 않았습니다." },
      { status: 503 },
    );
  }
}
