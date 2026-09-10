import { prisma } from "@/lib/prisma";
import { SearchQueryError, searchSite } from "@/lib/site-search";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q");
    const results = await searchSite(prisma, query);
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SearchQueryError) {
      return Response.json({ code: error.code, message: error.message }, { status: 400 });
    }
    console.error("Site search failed", {
      code: error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN",
    });
    return Response.json(
      { code: "SEARCH_UNAVAILABLE", message: "현재 검색할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }
}
