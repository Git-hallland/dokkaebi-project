export const COMMUNITY_PAGE_SIZE = 20;
export const COMMUNITY_CATEGORIES = ["GUIDE", "TIP"] as const;
export const COMMUNITY_COLORS = [
  "#c3c1d5", "#ff8f9c", "#ffb86b", "#f3da72", "#75d69c", "#78aef5", "#b99af4",
] as const;
export const COMMUNITY_FONT_SIZES = ["14px", "16px", "20px", "24px"] as const;
export const COMMUNITY_VISIBLE_WHERE = { deletedAt: null } as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];
export type CommunitySort = "latest" | "popular";
export type CommunityMark = Readonly<{
  type: "bold" | "italic" | "link" | "textStyle";
  attrs?: Readonly<Record<string, string>>;
}>;
export type CommunityNode = Readonly<{
  type: string;
  attrs?: Readonly<Record<string, unknown>>;
  content?: readonly CommunityNode[];
  marks?: readonly CommunityMark[];
  text?: string;
}>;
export type CommunityDocument = CommunityNode & Readonly<{ type: "doc" }>;
export type CommunityPostInput = Readonly<{
  body: CommunityDocument;
  category: CommunityCategory;
  title: string;
}>;
export type PopularGuidePostSummary = Readonly<{
  author: { name: string } | null;
  category: CommunityCategory;
  id: string;
  likeCount: number;
  title: string;
}>;

const MAX_NODES = 2_000;
const MAX_DEPTH = 12;
const MAX_TEXT_LENGTH = 50_000;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const ALLOWED_NODES = new Set([
  "doc", "paragraph", "text", "heading", "blockquote", "bulletList", "orderedList",
  "listItem", "hardBreak", "horizontalRule", "image", "video",
]);
const ALLOWED_MARKS = new Set(["bold", "italic", "link", "textStyle"]);

export const EMPTY_COMMUNITY_DOCUMENT: CommunityDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export class CommunityInputError extends Error {}
export class CommunityAuthorizationError extends Error {}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new CommunityInputError("허용되지 않은 본문 속성이 있습니다.");
  }
}

export function normalizeCommunityTitle(value: unknown) {
  if (typeof value !== "string") throw new CommunityInputError("제목을 입력해 주세요.");
  const title = value.trim();
  if (title.length < 2 || title.length > 80 || CONTROL_CHARACTERS.test(title)) {
    throw new CommunityInputError("제목은 제어문자 없이 2~80자로 입력해 주세요.");
  }
  return title;
}

export function normalizeCommunityCategory(value: unknown): CommunityCategory {
  if (value === "GUIDE" || value === "TIP") return value;
  throw new CommunityInputError("올바른 게시판을 선택해 주세요.");
}

export function normalizeCommunityLink(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048 || CONTROL_CHARACTERS.test(value)) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeCloudinaryImage(value: unknown, cloudName?: string) {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (cloudName && parts[0] !== cloudName) return null;
    if (!/\/image\/upload\/(?:v\d+\/)?dokkaebi\/posts\/staging\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$/u.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeCommunityVideoUrl(value: unknown, cloudName?: string) {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.search || url.hash || url.username || url.password) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (cloudName && parts[0] !== cloudName) return null;
    if (!/\/video\/upload\/(?:v\d+\/)?dokkaebi\/posts\/videos\/staging\/[0-9a-f-]{36}\.(?:mp4|webm|mov)$/u.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeMark(value: unknown): CommunityMark {
  const mark = record(value);
  if (!mark || typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type)) {
    throw new CommunityInputError("허용되지 않은 텍스트 서식입니다.");
  }
  exactKeys(mark, ["type", "attrs"]);
  if (mark.type === "link") {
    const href = normalizeCommunityLink(record(mark.attrs)?.href);
    if (!href) throw new CommunityInputError("안전한 http/https 링크만 사용할 수 있습니다.");
    return { type: "link", attrs: { href } };
  }
  if (mark.type === "textStyle") {
    const attrs = record(mark.attrs) ?? {};
    exactKeys(attrs, ["color", "fontSize"]);
    const normalized: Record<string, string> = {};
    if (typeof attrs.color === "string" && COMMUNITY_COLORS.includes(attrs.color as never)) normalized.color = attrs.color;
    if (typeof attrs.fontSize === "string" && COMMUNITY_FONT_SIZES.includes(attrs.fontSize as never)) normalized.fontSize = attrs.fontSize;
    if (Object.keys(normalized).length === 0) throw new CommunityInputError("허용되지 않은 텍스트 스타일입니다.");
    return { type: "textStyle", attrs: normalized };
  }
  return { type: mark.type as "bold" | "italic" };
}

export function normalizeCommunityDocument(value: unknown, cloudName?: string): CommunityDocument {
  let nodeCount = 0;
  let textLength = 0;
  let meaningful = false;
  function visit(input: unknown, depth: number): CommunityNode {
    if (depth > MAX_DEPTH || ++nodeCount > MAX_NODES) throw new CommunityInputError("본문이 너무 복잡합니다.");
    const node = record(input);
    if (!node || typeof node.type !== "string" || !ALLOWED_NODES.has(node.type)) {
      throw new CommunityInputError("허용되지 않은 본문 형식입니다.");
    }
    exactKeys(node, ["type", "attrs", "content", "marks", "text"]);
    if (node.type === "text") {
      if (typeof node.text !== "string" || CONTROL_CHARACTERS.test(node.text)) throw new CommunityInputError("본문 텍스트가 올바르지 않습니다.");
      textLength += node.text.length;
      if (textLength > MAX_TEXT_LENGTH) throw new CommunityInputError("본문은 50,000자 이하여야 합니다.");
      if (node.text.trim()) meaningful = true;
      const marks = Array.isArray(node.marks) ? node.marks.map(normalizeMark) : undefined;
      return { type: "text", text: node.text, ...(marks?.length ? { marks } : {}) };
    }
    const attrs = record(node.attrs) ?? {};
    let normalizedAttrs: Record<string, unknown> | undefined;
    if (node.type === "heading") {
      exactKeys(attrs, ["level"]);
      if (attrs.level !== 2 && attrs.level !== 3) throw new CommunityInputError("제목 단계는 2 또는 3만 사용할 수 있습니다.");
      normalizedAttrs = { level: attrs.level };
    } else if (node.type === "image") {
      exactKeys(attrs, ["src", "alt", "title", "width", "height"]);
      const src = normalizeCloudinaryImage(attrs.src, cloudName);
      if (!src) throw new CommunityInputError("검증된 게시물 이미지만 사용할 수 있습니다.");
      if (attrs.width !== null && attrs.width !== undefined) throw new CommunityInputError("게시물 이미지 너비는 변경할 수 없습니다.");
      if (attrs.height !== null && attrs.height !== undefined) throw new CommunityInputError("게시물 이미지 높이는 변경할 수 없습니다.");
      if (attrs.alt !== null && attrs.alt !== undefined && typeof attrs.alt !== "string") throw new CommunityInputError("이미지 대체 텍스트가 올바르지 않습니다.");
      if (attrs.title !== null && attrs.title !== undefined && typeof attrs.title !== "string") throw new CommunityInputError("이미지 제목이 올바르지 않습니다.");
      normalizedAttrs = { src, alt: typeof attrs.alt === "string" ? attrs.alt.slice(0, 200) : "", title: null };
      meaningful = true;
    } else if (node.type === "video") {
      exactKeys(attrs, ["src"]);
      const src = normalizeCommunityVideoUrl(attrs.src, cloudName);
      if (!src) throw new CommunityInputError("검증된 게시글 동영상만 사용할 수 있습니다.");
      normalizedAttrs = { src };
      meaningful = true;
    } else {
      exactKeys(attrs, []);
    }
    const content = Array.isArray(node.content) ? node.content.map((child) => visit(child, depth + 1)) : undefined;
    return { type: node.type, ...(normalizedAttrs ? { attrs: normalizedAttrs } : {}), ...(content?.length ? { content } : {}) };
  }
  const result = visit(value, 0);
  if (result.type !== "doc" || !meaningful) throw new CommunityInputError("본문 내용을 입력해 주세요.");
  return result as CommunityDocument;
}

export function normalizeCommunityPostInput(value: unknown, cloudName?: string): CommunityPostInput {
  const input = record(value);
  if (!input) throw new CommunityInputError("요청 형식이 올바르지 않습니다.");
  exactKeys(input, ["category", "title", "body"]);
  return {
    category: normalizeCommunityCategory(input.category),
    title: normalizeCommunityTitle(input.title),
    body: normalizeCommunityDocument(input.body, cloudName),
  };
}

export function normalizeCommunitySort(value: unknown): CommunitySort {
  return value === "popular" ? "popular" : "latest";
}

export function communityOrderBy(sort: CommunitySort) {
  return sort === "popular"
    ? [{ likeCount: "desc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }]
    : [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

export function isNewCommunityPost(createdAt: Date, now = new Date()) {
  const age = now.getTime() - createdAt.getTime();
  return age >= 0 && age < 24 * 60 * 60 * 1_000;
}

export function formatCommunityPostTime(createdAt: Date, now = new Date()) {
  const age = Math.max(0, now.getTime() - createdAt.getTime());
  if (age < 60_000) return "방금 전";
  if (age < 60 * 60_000) return `${Math.floor(age / 60_000)}분 전`;
  if (age < 24 * 60 * 60_000) return `${Math.floor(age / (60 * 60_000))}시간 전`;
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(createdAt);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}.${value("month")}.${value("day")}`;
}

export function assertCommunityAuthor(sessionUserId: string | null | undefined, authorId: string) {
  if (!sessionUserId) throw new CommunityAuthorizationError("로그인이 필요합니다.");
  if (sessionUserId !== authorId) throw new CommunityAuthorizationError("작성자만 수정하거나 삭제할 수 있습니다.");
}
