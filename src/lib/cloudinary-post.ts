import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image";
import { requirePostVideoPreset, validatePostVideoUploadMetadata } from "@/lib/community-video";

const POST_IMAGE_FOLDER = "dokkaebi/posts/staging";
const POST_VIDEO_FOLDER = "dokkaebi/posts/videos/staging";
const ALLOWED_FORMATS = new Set(["png", "jpg", "jpeg", "webp"]);
const ALLOWED_FORMATS_PARAMETER = "png,jpg,jpeg,webp";
const ALLOWED_VIDEO_FORMATS_PARAMETER = "mp4,webm,mov";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function baseConfig() {
  return {
    cloudName: requireEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY"),
    apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
  };
}

function imageConfig() {
  return { ...baseConfig(), uploadPreset: requireEnv("CLOUDINARY_UPLOAD_PRESET") };
}

function videoConfig() {
  return { ...baseConfig(), uploadPreset: requirePostVideoPreset(process.env.CLOUDINARY_VIDEO_UPLOAD_PRESET) };
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createPostImageUploadSignature() {
  const { apiKey, apiSecret, cloudName, uploadPreset } = imageConfig();
  const timestamp = Math.floor(Date.now() / 1_000);
  const publicId = randomUUID();
  const parameters = {
    allowed_formats: ALLOWED_FORMATS_PARAMETER,
    folder: POST_IMAGE_FOLDER,
    overwrite: false,
    public_id: publicId,
    timestamp,
    upload_preset: uploadPreset,
  };
  return {
    allowedFormats: ALLOWED_FORMATS_PARAMETER,
    apiKey,
    cloudName,
    folder: POST_IMAGE_FOLDER,
    overwrite: "false",
    publicId,
    signature: cloudinary.utils.api_sign_request(parameters, apiSecret),
    timestamp,
    uploadPreset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

export function verifyPostImageUpload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("업로드 결과가 올바르지 않습니다.");
  const upload = value as Record<string, unknown>;
  const { apiSecret, cloudName } = imageConfig();
  if (
    typeof upload.bytes !== "number" || typeof upload.format !== "string" ||
    typeof upload.height !== "number" || typeof upload.publicId !== "string" ||
    typeof upload.resourceType !== "string" || typeof upload.secureUrl !== "string" ||
    typeof upload.signature !== "string" || typeof upload.version !== "number" ||
    typeof upload.width !== "number"
  ) throw new Error("업로드 결과 필드가 올바르지 않습니다.");
  const bytes = upload.bytes as number;
  const format = upload.format as string;
  const height = upload.height as number;
  const publicId = upload.publicId as string;
  const resourceType = upload.resourceType as string;
  const secureUrl = upload.secureUrl as string;
  const signature = upload.signature as string;
  const version = upload.version as number;
  const width = upload.width as number;
  const expectedSignature = cloudinary.utils.api_sign_request({ public_id: publicId, version }, apiSecret);
  if (!safeEqual(signature, expectedSignature)) throw new Error("Cloudinary 응답 서명을 확인할 수 없습니다.");
  if (resourceType !== "image" || !ALLOWED_FORMATS.has(format.toLowerCase()) || bytes < 1 || bytes > PROFILE_IMAGE_MAX_BYTES || width < 1 || height < 1 || !publicId.startsWith(`${POST_IMAGE_FOLDER}/`)) {
    throw new Error("허용되지 않은 게시물 이미지입니다.");
  }
  const url = new URL(secureUrl);
  const expectedPath = `/${cloudName}/image/upload/v${version}/${publicId}.${format}`;
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) {
    throw new Error("우리 Cloudinary 계정의 이미지 URL만 사용할 수 있습니다.");
  }
  return { secureUrl: url.toString() };
}

export function createPostVideoUploadSignature() {
  const { apiKey, apiSecret, cloudName, uploadPreset } = videoConfig();
  const timestamp = Math.floor(Date.now() / 1_000);
  const publicId = randomUUID();
  const parameters = {
    allowed_formats: ALLOWED_VIDEO_FORMATS_PARAMETER,
    folder: POST_VIDEO_FOLDER,
    overwrite: false,
    public_id: publicId,
    timestamp,
    upload_preset: uploadPreset,
  };
  return {
    allowedFormats: ALLOWED_VIDEO_FORMATS_PARAMETER,
    apiKey,
    cloudName,
    folder: POST_VIDEO_FOLDER,
    overwrite: "false",
    publicId,
    resourceType: "video",
    signature: cloudinary.utils.api_sign_request(parameters, apiSecret),
    timestamp,
    uploadPreset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
  };
}

export function verifyPostVideoUpload(value: unknown) {
  const { apiSecret, cloudName } = baseConfig();
  const upload = validatePostVideoUploadMetadata(value, cloudName);
  const { publicId, secureUrl, signature, version } = upload;
  const expectedSignature = cloudinary.utils.api_sign_request({ public_id: publicId, version }, apiSecret);
  if (!safeEqual(signature, expectedSignature)) throw new Error("Cloudinary 응답 서명을 확인할 수 없습니다.");
  return { secureUrl };
}
