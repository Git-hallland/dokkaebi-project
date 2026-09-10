export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 12;

export type NicknameValidationCode =
  | "INVALID_TYPE"
  | "INVALID_LENGTH"
  | "INVALID_CHARACTERS"
  | "IMPERSONATION"
  | "INAPPROPRIATE";

export class NicknameValidationError extends Error {
  readonly code: NicknameValidationCode;

  constructor(
    code: NicknameValidationCode,
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "NicknameValidationError";
  }
}

const ALLOWED_NICKNAME = /^[가-힣A-Za-z0-9]+$/u;
const STAFF_TERMS = ["운영자", "운영진", "관리자", "admin", "administrator", "manager"] as const;

// Deliberately conservative to avoid blocking innocent names through fuzzy matching.
const BLOCKED_CONTAINS = ["씨발", "개새끼", "좆", "보지", "자지", "일베충", "노알라"] as const;
const BLOCKED_EXACT = ["시발", "병신", "존나", "섹스", "야동", "일베", "일간베스트"] as const;

export type ValidNickname = Readonly<{
  key: string;
  name: string;
}>;

function isStaffImpersonation(key: string) {
  return STAFF_TERMS.some((term) => new RegExp(`^\\d*${term}\\d*$`, "u").test(key));
}

function isInappropriate(key: string) {
  return BLOCKED_EXACT.includes(key as (typeof BLOCKED_EXACT)[number]) ||
    BLOCKED_CONTAINS.some((term) => key.includes(term));
}

export function validateNickname(
  value: unknown,
  options: Readonly<{ allowStaffTerms?: boolean }> = {},
): ValidNickname {
  if (typeof value !== "string") {
    throw new NicknameValidationError("INVALID_TYPE", "닉네임은 문자열이어야 합니다.");
  }

  const name = value.normalize("NFKC");
  const length = Array.from(name).length;

  if (length < PROFILE_NAME_MIN_LENGTH || length > PROFILE_NAME_MAX_LENGTH) {
    throw new NicknameValidationError(
      "INVALID_LENGTH",
      `닉네임은 ${PROFILE_NAME_MIN_LENGTH}~${PROFILE_NAME_MAX_LENGTH}자로 입력해 주세요.`,
    );
  }

  if (!ALLOWED_NICKNAME.test(name)) {
    throw new NicknameValidationError(
      "INVALID_CHARACTERS",
      "한글, 영문, 숫자만 사용할 수 있으며 공백과 특수문자는 사용할 수 없습니다.",
    );
  }

  const key = name.toLocaleLowerCase("en-US");

  if (!options.allowStaffTerms && isStaffImpersonation(key)) {
    throw new NicknameValidationError("IMPERSONATION", "운영 관련 닉네임은 사용할 수 없습니다.");
  }

  if (isInappropriate(key)) {
    throw new NicknameValidationError("INAPPROPRIATE", "부적절한 닉네임은 사용할 수 없습니다.");
  }

  return { key, name };
}

export function normalizeProfileName(value: unknown) {
  return validateNickname(value).name;
}
