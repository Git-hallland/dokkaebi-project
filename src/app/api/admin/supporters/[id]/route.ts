import { revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUPPORTER_CACHE_TAG } from "@/lib/supporter-data";
import { normalizeSupporterUpdateInput, SupporterInputError } from "@/lib/supporters";

type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request) { const session = await auth.api.getSession({ headers: request.headers }); return session?.user.role === "ADMIN"; }

export async function PATCH(request: Request, { params }: Context) {
  if (!(await authorize(request))) return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });
  try {
    const [input, { id }] = await Promise.all([request.json().then(normalizeSupporterUpdateInput), params]);
    const updated = await prisma.supporter.updateMany({ where: { id }, data: input });
    if (updated.count !== 1) return Response.json({ code: "NOT_FOUND", message: "후원자를 찾을 수 없습니다." }, { status: 404 });
    revalidateTag(SUPPORTER_CACHE_TAG, { expire: 0 });
    return Response.json({ id });
  } catch (error) {
    if (error instanceof SupporterInputError || error instanceof SyntaxError) return Response.json({ code: "INVALID_SUPPORTER", message: error.message }, { status: 400 });
    console.error("Supporter update failed.");
    return Response.json({ code: "UPDATE_FAILED", message: "후원자 정보를 변경할 수 없습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (!(await authorize(request))) return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });
  const { id } = await params;
  try {
    const removed = await prisma.supporter.deleteMany({ where: { id } });
    if (removed.count !== 1) return Response.json({ code: "NOT_FOUND", message: "후원자를 찾을 수 없습니다." }, { status: 404 });
    revalidateTag(SUPPORTER_CACHE_TAG, { expire: 0 });
    return Response.json({ id });
  } catch {
    console.error("Supporter removal failed.");
    return Response.json({ code: "DELETE_FAILED", message: "후원자를 제거할 수 없습니다." }, { status: 500 });
  }
}
