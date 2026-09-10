import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isFrontendOnly } from "@/lib/runtime-mode";
import { DEFAULT_SITE_SETTINGS, SITE_SETTING_ID, type SiteSettings } from "@/lib/site-settings";

export const SITE_SETTINGS_CACHE_TAG = "site-settings";

const readSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const settings = await prisma.siteSetting.findUnique({
      where: { id: SITE_SETTING_ID },
      select: {
        guideWriteEnabled: true,
        rightAdEnabled: true,
        footerAdEnabled: true,
        footerStickyAdEnabled: true,
      },
    });
    return settings ?? DEFAULT_SITE_SETTINGS;
  },
  ["site-settings-v2"],
  { revalidate: 300, tags: [SITE_SETTINGS_CACHE_TAG] },
);

export function getSiteSettings() {
  return isFrontendOnly() ? Promise.resolve(DEFAULT_SITE_SETTINGS) : readSiteSettings();
}

export function revalidateSiteSettings() {
  revalidateTag(SITE_SETTINGS_CACHE_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}
