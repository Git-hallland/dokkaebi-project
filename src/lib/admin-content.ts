import { CMS_BOARD_TYPES, type CmsBoardType } from "@/lib/cms-boards";
import { isAllowedCmsImageUrl } from "@/lib/cms-content-format";
import { CMS_EVENT_STATUSES, type CmsEventStatus } from "@/lib/cms-event-status";
import { CMS_DETAIL_STATUSES, CMS_SKILL_LEVEL_LIMITS, type CmsDetailStatus, type CmsSkillLevelInput } from "@/lib/cms-entity";

export { CMS_BOARD_TYPES } from "@/lib/cms-boards";
export type { CmsBoardType } from "@/lib/cms-boards";

export const CMS_CONTENT_STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export const CMS_SOURCE_TYPES = ["official_page", "notice", "press_release", "video", "official_screenshot"] as const;

export type CmsContentStatus = (typeof CMS_CONTENT_STATUSES)[number];
export type CmsSourceType = (typeof CMS_SOURCE_TYPES)[number];

export type CmsSourceInput = Readonly<{
  checkedAt: Date;
  publisher: string;
  sourceType: CmsSourceType;
  title: string;
  url: string | null;
}>;

export type CmsContentInput = Readonly<{
  body: string | null;
  checkedAt: Date | null;
  coverImageUrl: string | null;
  iconImageUrl: string | null;
  entityCategory: string | null;
  detailStatus: CmsDetailStatus | null;
  entityMetadata: Readonly<Record<string, string>>;
  entitySortOrder: number | null;
  eventStatus: CmsEventStatus | null;
  slug: string | null;
  sources: readonly CmsSourceInput[];
  status: CmsContentStatus;
  summary: string | null;
  skillLevels: readonly CmsSkillLevelInput[];
  title: string;
  type: CmsBoardType;
}>;

export class AdminContentInputError extends Error {}

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const CMS_BODY_IMAGE = /!\[[^\]\r\n]*\]\((https:\/\/[^\s)]+)\)/gu;
const HTML_TAG = /<\/?[a-z][^>]*>/iu;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, field: string, maxLength: number, required = false) {
  if (value === null || value === undefined) {
    if (required) throw new AdminContentInputError(`${field}을(를) 입력해 주세요.`);
    return null;
  }
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) {
    throw new AdminContentInputError(`${field} 형식이 올바르지 않습니다.`);
  }
  const normalized = value.trim();
  if (required && !normalized) throw new AdminContentInputError(`${field}을(를) 입력해 주세요.`);
  if (normalized.length > maxLength) throw new AdminContentInputError(`${field}이(가) 너무 깁니다.`);
  return normalized || null;
}

export function normalizeCmsImageUrl(value: unknown, field = "이미지") {
  const raw = text(value, field, 2_000);
  if (!raw) return null;
  if (!isAllowedCmsImageUrl(raw)) {
    throw new AdminContentInputError(`${field}는 확인된 CMS Cloudinary 이미지만 사용할 수 있습니다.`);
  }
  return raw.startsWith("/") ? raw : new URL(raw).toString();
}

function validateBodyImages(body: string | null) {
  if (!body) return;
  for (const match of body.matchAll(CMS_BODY_IMAGE)) normalizeCmsImageUrl(match[1], "본문 이미지");
}

function noHtmlText(value: unknown, field: string, maxLength: number, required = false) {
  const normalized = text(value, field, maxLength, required);
  if (normalized && HTML_TAG.test(normalized)) {
    throw new AdminContentInputError(`${field}에는 HTML을 사용할 수 없습니다.`);
  }
  return normalized;
}

function normalizeSkillLevels(value: unknown, type: CmsBoardType): readonly CmsSkillLevelInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AdminContentInputError("도술 강화 단계 입력값이 올바르지 않습니다.");
  if (type !== "skills" && value.length) throw new AdminContentInputError("도술 게시판이 아닌 콘텐츠에는 강화 단계를 저장할 수 없습니다.");
  if (value.length > CMS_SKILL_LEVEL_LIMITS.levels) throw new AdminContentInputError(`강화 단계는 최대 ${CMS_SKILL_LEVEL_LIMITS.levels}개까지 등록할 수 있습니다.`);

  const orders = new Set<number>();
  return value.map((candidate) => {
    const level = record(candidate);
    if (!level) throw new AdminContentInputError("도술 강화 단계 입력값이 올바르지 않습니다.");
    if (!Number.isInteger(level.order) || (level.order as number) <= 0) throw new AdminContentInputError("강화 단계 순서는 1 이상의 정수여야 합니다.");
    const order = level.order as number;
    if (orders.has(order)) throw new AdminContentInputError("같은 강화 단계 순서를 중복 사용할 수 없습니다.");
    orders.add(order);
    const label = noHtmlText(level.label, "단계 이름", CMS_SKILL_LEVEL_LIMITS.label, true) as string;
    const id = text(level.id, "강화 단계 ID", 64);
    if (id && !/^[a-zA-Z0-9_-]+$/u.test(id)) throw new AdminContentInputError("강화 단계 ID가 올바르지 않습니다.");
    const description = noHtmlText(level.description, "단계 설명", CMS_SKILL_LEVEL_LIMITS.description);
    const entries: [unknown, unknown][] = Array.isArray(level.metadata)
      ? level.metadata.map((candidate) => {
        const item = record(candidate);
        if (!item) throw new AdminContentInputError("강화 단계 수치 정보가 올바르지 않습니다.");
        return [item.key, item.value];
      })
      : (() => {
        const rawMetadata = record(level.metadata);
        if (!rawMetadata) throw new AdminContentInputError("강화 단계 수치 정보가 올바르지 않습니다.");
        return Object.entries(rawMetadata);
      })();
    if (entries.length > CMS_SKILL_LEVEL_LIMITS.metadataItems) throw new AdminContentInputError(`단계별 수치 정보는 최대 ${CMS_SKILL_LEVEL_LIMITS.metadataItems}개까지 등록할 수 있습니다.`);
    const metadata: Record<string, string> = {};
    for (const [rawKey, rawValue] of entries) {
      const key = noHtmlText(rawKey, "수치 항목 이름", CMS_SKILL_LEVEL_LIMITS.metadataKey, true) as string;
      const valueText = noHtmlText(rawValue, "수치 항목 값", CMS_SKILL_LEVEL_LIMITS.metadataValue, true) as string;
      if (Object.hasOwn(metadata, key)) throw new AdminContentInputError("같은 수치 항목 이름을 중복 사용할 수 없습니다.");
      metadata[key] = valueText;
    }
    if (new TextEncoder().encode(JSON.stringify(metadata)).byteLength > CMS_SKILL_LEVEL_LIMITS.metadataBytes) throw new AdminContentInputError("강화 단계 수치 정보가 너무 큽니다.");
    return { description, id, label, metadata, order };
  }).sort((left, right) => left.order - right.order);
}

function normalizeEntityMetadata(value: unknown, enabled: boolean) {
  if (!enabled) return {};
  if (value === undefined || value === null) return {};
  const raw = record(value);
  if (!raw) throw new AdminContentInputError("기본 정보 입력값이 올바르지 않습니다.");
  const entries = Object.entries(raw);
  if (entries.length > CMS_SKILL_LEVEL_LIMITS.metadataItems) throw new AdminContentInputError("기본 정보는 최대 20개까지 등록할 수 있습니다.");
  const result: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = noHtmlText(rawKey, "기본 정보 이름", CMS_SKILL_LEVEL_LIMITS.metadataKey, true) as string;
    const valueText = noHtmlText(rawValue, "기본 정보 값", CMS_SKILL_LEVEL_LIMITS.metadataValue, true) as string;
    result[key] = valueText;
  }
  return result;
}

function checkedDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new AdminContentInputError("출처 확인일을 입력해 주세요.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new AdminContentInputError("출처 확인일이 올바르지 않습니다.");
  }
  return date;
}

export function createCmsSlug(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 100)
    .replace(/-+$/u, "");
}

export function normalizeCmsContentInput(value: unknown): CmsContentInput {
  const input = record(value);
  if (!input) throw new AdminContentInputError("콘텐츠 입력값이 올바르지 않습니다.");

  const type = input.type;
  const status = input.status;
  if (typeof type !== "string" || !CMS_BOARD_TYPES.includes(type as CmsBoardType)) {
    throw new AdminContentInputError("게시판 종류가 올바르지 않습니다.");
  }
  if (typeof status !== "string" || !CMS_CONTENT_STATUSES.includes(status as CmsContentStatus)) {
    throw new AdminContentInputError("콘텐츠 상태가 올바르지 않습니다.");
  }

  const title = text(input.title, "제목", 120, true) as string;
  const slugText = text(input.slug, "slug", 100);
  const slug = slugText ? createCmsSlug(slugText) : null;
  if (slugText && slug !== slugText.normalize("NFKC").toLocaleLowerCase("ko-KR")) {
    throw new AdminContentInputError("slug는 글자와 숫자를 하이픈으로 연결해 입력해 주세요.");
  }

  const body = text(input.body, "본문", 100_000);
  validateBodyImages(body);
  const coverImageUrl = normalizeCmsImageUrl(input.coverImageUrl, "대표 이미지");
  const entityType = type === "skills" || type === "items";
  const iconImageUrl = entityType ? normalizeCmsImageUrl(input.iconImageUrl, "아이콘 이미지") : null;
  const entityCategory = entityType ? noHtmlText(input.entityCategory, "분류", 80) : null;
  let detailStatus: CmsDetailStatus | null = null;
  if (entityType) {
    const candidate = input.detailStatus ?? "PUBLISHED";
    if (typeof candidate !== "string" || !CMS_DETAIL_STATUSES.includes(candidate as CmsDetailStatus)) throw new AdminContentInputError("상세 공개 상태가 올바르지 않습니다.");
    detailStatus = candidate as CmsDetailStatus;
  }
  const entityMetadata = normalizeEntityMetadata(input.entityMetadata, entityType);
  const entitySortOrder = entityType && input.entitySortOrder !== null && input.entitySortOrder !== undefined
    ? Number(input.entitySortOrder)
    : null;
  if (entitySortOrder !== null && (!Number.isInteger(entitySortOrder) || entitySortOrder < 1 || entitySortOrder > 100_000)) throw new AdminContentInputError("도감 정렬 순서는 1 이상 100000 이하의 정수여야 합니다.");
  const skillLevels = normalizeSkillLevels(input.skillLevels, type as CmsBoardType);
  let eventStatus: CmsEventStatus | null = null;
  if (type === "events") {
    const candidate = input.eventStatus ?? "ONGOING";
    if (typeof candidate !== "string" || !CMS_EVENT_STATUSES.includes(candidate as CmsEventStatus)) {
      throw new AdminContentInputError("이벤트 상태가 올바르지 않습니다.");
    }
    eventStatus = candidate as CmsEventStatus;
  }
  const summary = text(input.summary, "요약", 300);
  if (!Array.isArray(input.sources)) throw new AdminContentInputError("출처 입력값이 올바르지 않습니다.");
  if (input.sources.length > 20) throw new AdminContentInputError("출처는 최대 20개까지 등록할 수 있습니다.");

  const seenUrls = new Set<string>();
  const sources = input.sources.map((candidate) => {
    const source = record(candidate);
    if (!source) throw new AdminContentInputError("출처 입력값이 올바르지 않습니다.");
    const sourceTitle = text(source.title, "출처 제목", 300, true) as string;
    const publisher = text(source.publisher, "발행 주체", 160, true) as string;
    if (typeof source.sourceType !== "string" || !CMS_SOURCE_TYPES.includes(source.sourceType as CmsSourceType)) {
      throw new AdminContentInputError("출처 유형이 올바르지 않습니다.");
    }
    const sourceUrl = text(source.url, "출처 URL", 2_000);
    let normalizedUrl: string | null = null;
    if (sourceUrl) {
      let url: URL;
      try { url = new URL(sourceUrl); } catch { throw new AdminContentInputError("출처 URL이 올바르지 않습니다."); }
      if (url.protocol !== "https:" || url.username || url.password) throw new AdminContentInputError("출처 URL은 안전한 HTTPS 주소만 사용할 수 있습니다.");
      url.hash = "";
      normalizedUrl = url.toString();
      if (seenUrls.has(normalizedUrl)) throw new AdminContentInputError("같은 출처 URL을 중복 등록할 수 없습니다.");
      seenUrls.add(normalizedUrl);
    } else if (source.sourceType !== "official_screenshot") {
      throw new AdminContentInputError("링크가 없는 출처는 공식 화면 캡처 유형으로 등록해 주세요.");
    }
    return {
      checkedAt: checkedDate(source.checkedAt),
      publisher,
      sourceType: source.sourceType as CmsSourceType,
      title: sourceTitle,
      url: normalizedUrl,
    };
  });

  if (status === "PUBLISHED") {
    const bodyRequired = !(entityType && detailStatus === "UNRELEASED");
    if (!slug || (bodyRequired && !body) || !summary || sources.length === 0) {
      throw new AdminContentInputError("공개하려면 slug, 요약, 본문, 출처가 모두 필요합니다.");
    }
  }

  const checkedAt = sources.length
    ? new Date(Math.max(...sources.map((source) => source.checkedAt.valueOf())))
    : null;

  return {
    body,
    checkedAt,
    coverImageUrl,
    detailStatus,
    entityMetadata,
    entitySortOrder,
    iconImageUrl,
    entityCategory,
    eventStatus,
    slug,
    sources,
    status: status as CmsContentStatus,
    summary,
    skillLevels,
    title,
    type: type as CmsBoardType,
  };
}

export function isCmsAdmin(role: string | null | undefined) {
  return role === "ADMIN";
}
