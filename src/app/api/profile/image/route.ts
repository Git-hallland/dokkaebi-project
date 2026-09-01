import { auth } from "@/lib/auth";
import {
  PROFILE_IMAGE_PROOF_HEADER,
  createProfileImageUpdateProof,
  deleteManagedProfileImage,
  verifyProfileImageUpload,
} from "@/lib/cloudinary-profile";
import { normalizeProfileName } from "@/lib/profile-input";
import { prisma } from "@/lib/prisma";

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("요청 본문이 올바르지 않습니다.");
    }

    const payload = body as Record<string, unknown>;

    if (!hasOnlyKeys(payload, ["name", "upload"])) {
      throw new Error("허용되지 않은 프로필 필드가 포함되어 있습니다.");
    }

    const name = normalizeProfileName(payload.name);
    const verifiedImage = verifyProfileImageUpload(payload.upload, session.user.id);
    const currentUser = await prisma.user.findUnique({
      select: { image: true },
      where: { id: session.user.id },
    });
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set(
      PROFILE_IMAGE_PROOF_HEADER,
      createProfileImageUpdateProof(session.user.id, verifiedImage.secureUrl),
    );

    const result = await auth.api.updateUser({
      body: { image: verifiedImage.secureUrl, name },
      headers: forwardedHeaders,
      returnHeaders: true,
    });

    if (currentUser?.image !== verifiedImage.secureUrl) {
      try {
        await deleteManagedProfileImage(currentUser?.image, session.user.id);
      } catch {
        console.warn("Previous managed profile image cleanup failed.");
      }
    }

    return Response.json(result.response, { headers: result.headers });
  } catch (error) {
    return Response.json(
      {
        code: "INVALID_PROFILE_IMAGE",
        message: error instanceof Error ? error.message : "프로필 이미지를 저장할 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
