import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { AdminContentInputError, isCmsAdmin, normalizeCmsContentInput } from "@/lib/admin-content";
import { createCmsContent } from "@/lib/admin-content-data";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateEditorialContent } from "@/lib/public-content-cache";

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  if (!isCmsAdmin(session.user.role)) return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });

  try {
    const input = normalizeCmsContentInput(await request.json());
    const content = await createCmsContent(prisma, input, {
      id: session.user.id,
      name: session.user.name,
    });
    revalidateEditorialContent();
    return NextResponse.json({ id: content.id }, { status: 201 });
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
