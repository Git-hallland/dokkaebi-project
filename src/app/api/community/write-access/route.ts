import { auth } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings-data";
import { canCreateGuide } from "@/lib/site-settings";
import { getBlockingSanction, sanctionResponse } from "@/lib/user-sanctions";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });

  const siteSettings = await getSiteSettings();
  if (!canCreateGuide(session.user.role, siteSettings.guideWriteEnabled)) {
    return Response.json({ code: "GUIDE_WRITING_DISABLED", message: "공략 작성은 정식 오픈 후 이용할 수 있습니다." }, { status: 403 });
  }

  const sanction = await getBlockingSanction(session.user.id, "POST");
  if (sanction) return sanctionResponse(sanction);

  return Response.json({ allowed: true });
}
