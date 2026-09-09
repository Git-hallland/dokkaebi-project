import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { AdminContentInputError, isCmsAdmin, normalizeCmsContentInput } from "@/lib/admin-content";
import { updateCmsContent } from "@/lib/admin-content-data";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  if (!isCmsAdmin(session.user.role)) return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });

  try {
    const [{ id }, body] = await Promise.all([params, request.json()]);
    const input = normalizeCmsContentInput(body);
    const content = await updateCmsContent(prisma, id, input, {
      id: session.user.id,
      name: session.user.name,
    });
    if (!content) return NextResponse.json({ message: "콘텐츠를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ id: content.id });
  } catch (error) {
    if (error instanceof AdminContentInputError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "이미 사용 중인 slug입니다." }, { status: 409 });
    }
    return NextResponse.json({ message: "콘텐츠를 저장하지 못했습니다." }, { status: 500 });
  }
}
