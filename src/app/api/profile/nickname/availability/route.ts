import { auth } from "@/lib/auth";
import { isNicknameAvailable } from "@/lib/nickname-data";
import { NicknameValidationError } from "@/lib/profile-input";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const value = new URL(request.url).searchParams.get("name");
    const result = await isNicknameAvailable(prisma, value, session.user);

    return Response.json({
      available: result.available,
      message: result.available ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다.",
    });
  } catch (error) {
    if (error instanceof NicknameValidationError) {
      return Response.json({ available: false, code: error.code, message: error.message }, { status: 400 });
    }

    console.error("Nickname availability check failed", {
      code: error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN",
    });
    return Response.json(
      { available: false, code: "NICKNAME_UNAVAILABLE", message: "현재 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
