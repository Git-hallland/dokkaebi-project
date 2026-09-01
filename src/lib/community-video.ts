export const POST_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const POST_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

const VIDEO_TYPES = new Map([
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mov", "video/quicktime"],
]);

export class CommunityVideoError extends Error {}

type PostVideoUploadMetadata = Readonly<{
  bytes: number;
  format: "mp4" | "webm" | "mov";
  height: number;
  publicId: string;
  resourceType: "video";
  secureUrl: string;
  signature: string;
  version: number;
  width: number;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function extension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/u)?.[1] ?? "";
}

export async function validatePostVideoFile(file: Pick<File, "name" | "size" | "slice" | "type">) {
  const ext = extension(file.name);
  if (!VIDEO_TYPES.has(ext) || VIDEO_TYPES.get(ext) !== file.type) {
    throw new CommunityVideoError("지원하지 않는 영상 형식입니다.");
  }
  if (file.size < 1 || file.size > POST_VIDEO_MAX_BYTES) {
    throw new CommunityVideoError("영상은 50MB 이하만 업로드할 수 있습니다.");
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isWebm = header.length >= 4 && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  const isIsoVideo = header.length >= 8 && String.fromCharCode(...header.slice(4, 8)) === "ftyp";
  if ((ext === "webm" && !isWebm) || (ext !== "webm" && !isIsoVideo)) {
    throw new CommunityVideoError("지원하지 않는 영상 형식입니다.");
  }
}

export function requirePostVideoPreset(value: string | undefined) {
  const preset = value?.trim();
  if (!preset) throw new CommunityVideoError("영상 업로드 설정이 완료되지 않았습니다.");
  return preset;
}

export function validatePostVideoUploadMetadata(value: unknown, cloudName: string): PostVideoUploadMetadata {
  const upload = record(value);
  if (!upload) throw new CommunityVideoError("영상 업로드 검증에 실패했습니다.");
  if (
    typeof upload.bytes !== "number" || typeof upload.format !== "string" ||
    typeof upload.height !== "number" || typeof upload.publicId !== "string" ||
    typeof upload.resourceType !== "string" || typeof upload.secureUrl !== "string" ||
    typeof upload.signature !== "string" || typeof upload.version !== "number" ||
    typeof upload.width !== "number"
  ) throw new CommunityVideoError("영상 업로드 검증에 실패했습니다.");
  const format = upload.format.toLowerCase();
  if (!VIDEO_TYPES.has(format) || upload.resourceType !== "video") throw new CommunityVideoError("지원하지 않는 영상 형식입니다.");
  if (upload.bytes < 1 || upload.bytes > POST_VIDEO_MAX_BYTES) throw new CommunityVideoError("영상은 50MB 이하만 업로드할 수 있습니다.");
  if (!Number.isInteger(upload.version) || upload.version < 1 || upload.width < 1 || upload.height < 1 || !/^dokkaebi\/posts\/videos\/staging\/[0-9a-f-]{36}$/u.test(upload.publicId)) {
    throw new CommunityVideoError("영상 업로드 검증에 실패했습니다.");
  }
  let url: URL;
  try {
    url = new URL(upload.secureUrl);
  } catch {
    throw new CommunityVideoError("영상 업로드 검증에 실패했습니다.");
  }
  const expectedPath = `/${cloudName}/video/upload/v${upload.version}/${upload.publicId}.${format}`;
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) {
    throw new CommunityVideoError("영상 업로드 검증에 실패했습니다.");
  }
  return { ...upload, format, resourceType: "video", secureUrl: url.toString() } as PostVideoUploadMetadata;
}

export function videoUploadResponseError(status: number, value: unknown) {
  const message = record(record(value)?.error)?.message;
  const detail = typeof message === "string" ? message.toLowerCase() : "";
  if (detail.includes("upload preset") || detail.includes("api key")) return "영상 업로드 설정이 완료되지 않았습니다.";
  if (status === 413 || detail.includes("file size") || detail.includes("too large")) return "영상은 50MB 이하만 업로드할 수 있습니다.";
  if (detail.includes("format") || detail.includes("extension") || detail.includes("resource type")) return "지원하지 않는 영상 형식입니다.";
  return "영상 업로드 검증에 실패했습니다.";
}
