export const SUPPORTER_SEARCH_LIMIT = 10;
export const ADMIN_MEMBER_PAGE_SIZE = 25;

export class SupporterInputError extends Error {}

export function normalizeMemberSearch(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new SupporterInputError("검색어 형식이 올바르지 않습니다.");
  const query = value.trim();
  if (query.length > 80 || /[\u0000-\u001f\u007f]/u.test(query)) {
    throw new SupporterInputError("검색어는 제어문자 없이 80자 이하로 입력해 주세요.");
  }
  return query;
}

export function normalizeSupporterCreateInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SupporterInputError("요청 형식이 올바르지 않습니다.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "userId") || typeof input.userId !== "string" || !input.userId.trim()) {
    throw new SupporterInputError("추가할 회원을 선택해 주세요.");
  }
  return { userId: input.userId.trim() };
}

export function normalizeSupporterUpdateInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SupporterInputError("요청 형식이 올바르지 않습니다.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["displayOrder", "isVisible"].includes(key))) throw new SupporterInputError("요청 형식이 올바르지 않습니다.");
  const result: { displayOrder?: number; isVisible?: boolean } = {};
  if (input.displayOrder !== undefined) {
    if (!Number.isInteger(input.displayOrder) || Number(input.displayOrder) < 0 || Number(input.displayOrder) > 9_999) {
      throw new SupporterInputError("표시 순서는 0~9999의 정수로 입력해 주세요.");
    }
    result.displayOrder = Number(input.displayOrder);
  }
  if (input.isVisible !== undefined) {
    if (typeof input.isVisible !== "boolean") throw new SupporterInputError("공개 상태가 올바르지 않습니다.");
    result.isVisible = input.isVisible;
  }
  if (Object.keys(result).length === 0) throw new SupporterInputError("변경할 값을 입력해 주세요.");
  return result;
}

export function isUniqueSupporterError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export function providerNames(accounts: readonly { providerId: string }[]) {
  const labels: Record<string, string> = { google: "Google", kakao: "Kakao" };
  return [...new Set(accounts.map((account) => account.providerId))].map((provider) => labels[provider] ?? provider);
}
