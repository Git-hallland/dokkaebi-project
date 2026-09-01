export const GUIDE_REPORT_REASONS = ["SPAM", "ABUSE", "MISINFORMATION", "COPYRIGHT", "OTHER"] as const;
export const GUIDE_REPORT_STATUSES = ["PENDING", "RESOLVED", "DISMISSED"] as const;
export const GUIDE_REPORT_DESCRIPTION_MAX_LENGTH = 1_000;
export const GUIDE_REPORT_PAGE_SIZE = 20;

export type GuideReportReasonInput = (typeof GUIDE_REPORT_REASONS)[number];
export type GuideReportStatusInput = (typeof GUIDE_REPORT_STATUSES)[number];
export type CommunityCapability = "viewReports" | "resolveReports" | "moderateCommunity";
export type ModerationAction = "NONE" | "HIDE_TARGET";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export class CommunityReportError extends Error {}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new CommunityReportError("요청 형식이 올바르지 않습니다.");
  }
}

function optionalText(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new CommunityReportError(`${label} 형식이 올바르지 않습니다.`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > GUIDE_REPORT_DESCRIPTION_MAX_LENGTH || CONTROL_CHARACTERS.test(normalized) || /[<>]/u.test(normalized)) {
    throw new CommunityReportError(`${label}은 HTML·제어문자 없이 ${GUIDE_REPORT_DESCRIPTION_MAX_LENGTH.toLocaleString("ko-KR")}자 이하로 입력해 주세요.`);
  }
  return normalized;
}

export function hasCommunityCapability(role: string | null | undefined, capability: CommunityCapability) {
  if (role === "ADMIN") return true;
  return role === "REVIEWER" && capability !== "moderateCommunity";
}

export function normalizeGuideReportInput(value: unknown) {
  const input = object(value);
  if (!input) throw new CommunityReportError("요청 형식이 올바르지 않습니다.");
  exactKeys(input, ["reason", "description"]);
  if (typeof input.reason !== "string" || !GUIDE_REPORT_REASONS.includes(input.reason as GuideReportReasonInput)) {
    throw new CommunityReportError("올바른 신고 사유를 선택해 주세요.");
  }
  return {
    reason: input.reason as GuideReportReasonInput,
    description: optionalText(input.description, "추가 설명"),
  };
}

export function assertReportableTarget(userId: string, target: { authorId: string | null; deletedAt: Date | null } | null) {
  if (!target || target.deletedAt) throw new CommunityReportError("신고할 대상을 찾을 수 없습니다.");
  if (target.authorId === userId) throw new CommunityReportError("자신이 작성한 콘텐츠는 신고할 수 없습니다.");
}

export function normalizeGuideReportResolution(value: unknown) {
  const input = object(value);
  if (!input) throw new CommunityReportError("요청 형식이 올바르지 않습니다.");
  exactKeys(input, ["status", "resolution", "action"]);
  if (input.status !== "RESOLVED" && input.status !== "DISMISSED") {
    throw new CommunityReportError("올바른 처리 상태를 선택해 주세요.");
  }
  if (input.action !== undefined && input.action !== "NONE" && input.action !== "HIDE_TARGET") {
    throw new CommunityReportError("올바른 대상 처리 방법을 선택해 주세요.");
  }
  return {
    status: input.status as "RESOLVED" | "DISMISSED",
    action: (input.action ?? "NONE") as ModerationAction,
    resolution: optionalText(input.resolution, "처리 메모"),
  };
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export function communityDocumentPreview(value: unknown, maxLength = 180) {
  const chunks: string[] = [];
  function visit(node: unknown) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const item = node as { content?: unknown; text?: unknown };
    if (typeof item.text === "string") chunks.push(item.text);
    if (Array.isArray(item.content)) item.content.forEach(visit);
  }
  visit(value);
  const text = chunks.join(" ").replace(/\s+/gu, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
