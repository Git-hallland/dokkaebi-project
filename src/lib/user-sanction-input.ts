export const USER_SANCTION_TYPES = ["POST_SUSPENSION", "COMMENT_SUSPENSION", "BAN"] as const;
export type UserSanctionKind = (typeof USER_SANCTION_TYPES)[number];

export class UserSanctionInputError extends Error {}

export function normalizeUserSanctionInput(input: unknown, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new UserSanctionInputError("요청 형식이 올바르지 않습니다.");
  if (Object.keys(input).some((key) => !["type", "endsAt", "reason"].includes(key))) throw new UserSanctionInputError("허용되지 않은 입력이 포함되어 있습니다.");
  const body = input as { type?: unknown; endsAt?: unknown; reason?: unknown };
  if (typeof body.type !== "string" || !USER_SANCTION_TYPES.includes(body.type as UserSanctionKind)) throw new UserSanctionInputError("제재 종류가 올바르지 않습니다.");
  const type = body.type as UserSanctionKind;
  const reason = body.reason === undefined || body.reason === null ? null : typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason && reason.length > 300) throw new UserSanctionInputError("제재 사유는 300자 이하여야 합니다.");
  if (reason && /[\u0000-\u001f\u007f]/u.test(reason)) throw new UserSanctionInputError("제재 사유에 제어문자를 사용할 수 없습니다.");

  if (type === "BAN") return { type, endsAt: null, reason: reason || null };
  if (typeof body.endsAt !== "string") throw new UserSanctionInputError("정지 종료 시간을 선택해 주세요.");
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now.getTime()) throw new UserSanctionInputError("정지 종료 시간은 현재보다 이후여야 합니다.");
  if (endsAt.getTime() > now.getTime() + 366 * 24 * 60 * 60 * 1000) throw new UserSanctionInputError("정지 기간은 최대 1년까지 설정할 수 있습니다.");
  return { type, endsAt, reason: reason || null };
}

export function isSanctionActive(sanction: Readonly<{ endsAt: Date | string | null; revokedAt: Date | string | null; startsAt: Date | string }>, now = new Date()) {
  return !sanction.revokedAt && new Date(sanction.startsAt) <= now && (!sanction.endsAt || new Date(sanction.endsAt) > now);
}
