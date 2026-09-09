export const CMS_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export const CMS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_LINE = /^!\[([^\]\r\n]*)\]\(([^\s)]+)\)$/u;
const LINK_TOKEN = /\[([^\]\r\n]+)\]\(([^\s)]+)\)|(https?:\/\/[^\s<>()]+)/gu;
const CMS_IMAGE_PATH = /^\/[^/]+\/image\/upload\/v\d+\/dokkaebi\/cms\/staging\/[0-9a-f-]+\.(?:png|jpe?g|webp)$/u;
const CMS_LOCAL_IMAGE_PATH = /^\/assets\/skills\/[a-z0-9-]+\.(?:png|webp)$/u;

export type CmsInlineContent =
  | Readonly<{ text: string; type: "text" }>
  | Readonly<{ href: string; text: string; type: "link" }>;

export type CmsBodyBlock =
  | Readonly<{ alt: string; src: string; type: "image" }>
  | Readonly<{ content: readonly CmsInlineContent[]; type: "text" }>;

export function decodeCmsRouteSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return null;
  }
}

export function normalizeCmsLinkUrl(value: string) {
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isAllowedCmsImageUrl(value: string, cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()) {
  if (CMS_LOCAL_IMAGE_PATH.test(value)) return true;
  try {
    const url = new URL(value);
    const cloudMatches = !cloudName || url.pathname.startsWith(`/${cloudName}/image/upload/`);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password && !url.search && !url.hash && cloudMatches && CMS_IMAGE_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

export function createCmsImageMarkdown(url: string, alt = "") {
  return `![${alt.replace(/[\]\r\n]/gu, "")}](${url})`;
}

export function createCmsLinkMarkdown(url: string, label = url) {
  return `[${label.replace(/[\]\r\n]/gu, "")}](${url})`;
}

export function insertCmsBodyMarkup(body: string, selectionStart: number, selectionEnd: number, markup: string, block = false) {
  const start = Math.max(0, Math.min(selectionStart, body.length));
  const end = Math.max(start, Math.min(selectionEnd, body.length));
  const before = body.slice(0, start);
  const after = body.slice(end);
  const prefix = !block || !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = !block || !after || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  return {
    body: `${before}${prefix}${markup}${suffix}${after}`,
    cursor: before.length + prefix.length + markup.length,
  };
}

export function parseCmsInlineContent(text: string): CmsInlineContent[] {
  const result: CmsInlineContent[] = [];
  let cursor = 0;
  for (const match of text.matchAll(LINK_TOKEN)) {
    const index = match.index;
    if (index > cursor) result.push({ text: text.slice(cursor, index), type: "text" });
    const markdownLabel = match[1];
    const rawUrl = match[2] ?? match[3];
    const href = normalizeCmsLinkUrl(rawUrl);
    result.push(href
      ? { href, text: markdownLabel ?? rawUrl, type: "link" }
      : { text: match[0], type: "text" });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) result.push({ text: text.slice(cursor), type: "text" });
  return result.length ? result : [{ text, type: "text" }];
}

export function parseCmsBody(body: string | null | undefined): CmsBodyBlock[] {
  return (body ?? "")
    .split(/\n{2,}/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const image = IMAGE_LINE.exec(part);
      if (image) {
        return isAllowedCmsImageUrl(image[2])
          ? { alt: image[1], src: image[2], type: "image" as const }
          : { content: [{ text: part, type: "text" as const }], type: "text" as const };
      }
      return { content: parseCmsInlineContent(part), type: "text" as const };
    });
}

export async function validateCmsImageFile(file: File) {
  if (!CMS_IMAGE_ACCEPT.split(",").includes(file.type)) {
    throw new Error("PNG, JPEG, WEBP 이미지 파일만 선택할 수 있습니다.");
  }
  if (file.size < 1 || file.size > CMS_IMAGE_MAX_BYTES) {
    throw new Error("이미지는 5MB 이하만 업로드할 수 있습니다.");
  }
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width < 1 || bitmap.height < 1) throw new Error();
  } catch {
    throw new Error("손상되었거나 읽을 수 없는 이미지입니다.");
  } finally {
    bitmap?.close();
  }
}
