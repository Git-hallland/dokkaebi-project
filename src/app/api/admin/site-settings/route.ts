import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isCmsAdmin } from "@/lib/admin-content";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, revalidateSiteSettings } from "@/lib/site-settings-data";
import { normalizeSiteSettingsInput, SITE_SETTING_ID, SiteSettingsInputError } from "@/lib/site-settings";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 }) };
  if (!isCmsAdmin(session.user.role)) return { error: NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const authorization = await requireAdmin();
  if ("error" in authorization) return authorization.error;
  return NextResponse.json(await getSiteSettings());
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();
  if ("error" in authorization) return authorization.error;

  try {
    const input = normalizeSiteSettingsInput(await request.json());
    const settings = await prisma.siteSetting.upsert({
      where: { id: SITE_SETTING_ID },
      create: { id: SITE_SETTING_ID, ...input },
      update: input,
      select: {
        guideWriteEnabled: true,
        rightAdEnabled: true,
        footerAdEnabled: true,
        footerStickyAdEnabled: true,
      },
    });
    revalidateSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof SiteSettingsInputError || error instanceof SyntaxError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "사이트 운영 설정을 저장하지 못했습니다." }, { status: 500 });
  }
}
