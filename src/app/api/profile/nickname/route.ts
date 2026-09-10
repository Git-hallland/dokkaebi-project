import { auth } from "@/lib/auth";
import { NicknameConflictError, updateNickname } from "@/lib/nickname-data";
import { NicknameValidationError } from "@/lib/profile-input";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const name = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).name
      : undefined;
    const updated = await updateNickname(prisma, name, session.user);

    return Response.json({ name: updated.name });
  } catch (error) {
    if (error instanceof NicknameValidationError || error instanceof NicknameConflictError) {
      return Response.json({ code: error.code, message: error.message }, { status: 400 });
    }

    console.error("Nickname update failed", {
      code: error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN",
    });
    return Response.json(
      { code: "NICKNAME_UNAVAILABLE", message: "현재 닉네임을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
