import type { KakaoProfile } from "better-auth/social-providers";

type KakaoEmailProfile = Pick<KakaoProfile, "id" | "kakao_account">;

export function getKakaoUserEmail(profile: KakaoEmailProfile) {
  const providedEmail = profile.kakao_account.email?.trim();

  return (
    providedEmail || `${String(profile.id)}@kakao.placeholder.invalid`
  );
}
