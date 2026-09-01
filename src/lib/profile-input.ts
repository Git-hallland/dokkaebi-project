export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 8;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

export function normalizeProfileName(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("닉네임은 문자열이어야 합니다.");
  }

  const normalized = value.trim();
  const length = Array.from(normalized).length;

  if (length < PROFILE_NAME_MIN_LENGTH || length > PROFILE_NAME_MAX_LENGTH) {
    throw new Error(`닉네임은 ${PROFILE_NAME_MIN_LENGTH}~${PROFILE_NAME_MAX_LENGTH}글자로 입력해 주세요.`);
  }

  if (CONTROL_CHARACTERS.test(normalized) || /[<>]/u.test(normalized)) {
    throw new Error("닉네임에 사용할 수 없는 문자가 포함되어 있습니다.");
  }

  return normalized;
}
