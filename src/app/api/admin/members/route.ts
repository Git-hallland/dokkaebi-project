import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeMemberSearch, providerNames, SUPPORTER_SEARCH_LIMIT, SupporterInputError } from "@/lib/supporters";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." }, { status: 403 });
  try {
    const query = normalizeMemberSearch(new URL(request.url).searchParams.get("q"));
    if (query.length < 2) return Response.json({ members: [] });
    const members = await prisma.user.findMany({
      where: { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: SUPPORTER_SEARCH_LIMIT,
      select: { id: true, name: true, email: true, image: true, accounts: { select: { providerId: true } }, supporter: { select: { id: true } } },
    });
    return Response.json({ members: members.map((member) => ({ id: member.id, name: member.name, email: member.email, image: member.image, providers: providerNames(member.accounts), supporterId: member.supporter?.id ?? null })) });
  } catch (error) {
    if (error instanceof SupporterInputError) return Response.json({ code: "INVALID_QUERY", message: error.message }, { status: 400 });
    console.error("Admin member search failed.");
    return Response.json({ code: "SEARCH_FAILED", message: "현재 회원을 검색할 수 없습니다." }, { status: 500 });
  }
}
