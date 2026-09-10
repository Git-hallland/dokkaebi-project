export const SITE_SETTING_ID = "site";

export type SiteSettings = Readonly<{
  guideWriteEnabled: boolean;
  rightAdEnabled: boolean;
  footerAdEnabled: boolean;
  footerStickyAdEnabled: boolean;
}>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  guideWriteEnabled: false,
  rightAdEnabled: false,
  footerAdEnabled: false,
  footerStickyAdEnabled: false,
});

const SITE_SETTING_KEYS = Object.freeze([
  "guideWriteEnabled",
  "rightAdEnabled",
  "footerAdEnabled",
  "footerStickyAdEnabled",
] as const);

export class SiteSettingsInputError extends Error {}

export function normalizeSiteSettingsInput(value: unknown): SiteSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SiteSettingsInputError("사이트 운영 설정 입력값이 올바르지 않습니다.");
  }

  const input = value as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.length !== SITE_SETTING_KEYS.length || keys.some((key) => !SITE_SETTING_KEYS.includes(key as (typeof SITE_SETTING_KEYS)[number]))) {
    throw new SiteSettingsInputError("허용되지 않은 사이트 운영 설정 항목이 포함되어 있습니다.");
  }

  const result = {} as Record<(typeof SITE_SETTING_KEYS)[number], boolean>;
  for (const key of SITE_SETTING_KEYS) {
    if (typeof input[key] !== "boolean") {
      throw new SiteSettingsInputError(`${key} 값은 Boolean이어야 합니다.`);
    }
    result[key] = input[key];
  }

  return result;
}

export function canCreateGuide(role: string | null | undefined, guideWriteEnabled: boolean) {
  return role === "ADMIN" || guideWriteEnabled;
}

type SiteSettingsReader = () => Promise<SiteSettings>;

function getSiteSettingsReadErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "UNKNOWN";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,32}$/u.test(code) ? code : "UNKNOWN";
}

export async function readSiteSettingsOrDefault(
  reader: SiteSettingsReader,
  reportError: (code: string) => void = (code) => {
    console.error(`Site settings unavailable; using safe defaults. code=${code}`);
  },
) {
  try {
    return await reader();
  } catch (error) {
    reportError(getSiteSettingsReadErrorCode(error));
    return DEFAULT_SITE_SETTINGS;
  }
}
