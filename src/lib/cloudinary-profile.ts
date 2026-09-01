import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image";

export const PROFILE_IMAGE_PROOF_HEADER = "x-dokkaebi-profile-image-proof";

const PROFILE_ROOT_FOLDER = "dokkaebi/profile";
const ALLOWED_FORMATS = new Set(["png", "jpg", "jpeg", "webp"]);
const ALLOWED_FORMATS_PARAMETER = "png,jpg,jpeg,webp";

type CloudinaryConfig = Readonly<{
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  uploadPreset: string;
}>;

type CloudinaryUploadResult = Readonly<{
  bytes: number;
  format: string;
  height: number;
  publicId: string;
  resourceType: string;
  secureUrl: string;
  signature: string;
  version: number;
  width: number;
}>;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getCloudinaryConfig(): CloudinaryConfig {
  return {
    cloudName: requireEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY"),
    apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
    uploadPreset: requireEnv("CLOUDINARY_UPLOAD_PRESET"),
  };
}

function userFolder(userId: string) {
  const safePrefix = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `${PROFILE_ROOT_FOLDER}/${safePrefix}`;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createProfileImageUploadSignature(userId: string) {
  const { apiKey, apiSecret, cloudName, uploadPreset } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = userFolder(userId);
  const publicId = randomUUID();
  const parameters = {
    allowed_formats: ALLOWED_FORMATS_PARAMETER,
    folder,
    overwrite: false,
    public_id: publicId,
    timestamp,
    upload_preset: uploadPreset,
  };

  return {
    allowedFormats: ALLOWED_FORMATS_PARAMETER,
    apiKey,
    cloudName,
    folder,
    overwrite: "false",
    publicId,
    signature: cloudinary.utils.api_sign_request(parameters, apiSecret),
    timestamp,
    uploadPreset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

function readUploadResult(value: unknown): CloudinaryUploadResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Cloudinary 업로드 결과가 올바르지 않습니다.");
  }

  const upload = value as Record<string, unknown>;
  const result = {
    bytes: upload.bytes,
    format: upload.format,
    height: upload.height,
    publicId: upload.publicId,
    resourceType: upload.resourceType,
    secureUrl: upload.secureUrl,
    signature: upload.signature,
    version: upload.version,
    width: upload.width,
  };

  if (
    typeof result.bytes !== "number" ||
    typeof result.format !== "string" ||
    typeof result.height !== "number" ||
    typeof result.publicId !== "string" ||
    typeof result.resourceType !== "string" ||
    typeof result.secureUrl !== "string" ||
    typeof result.signature !== "string" ||
    typeof result.version !== "number" ||
    typeof result.width !== "number"
  ) {
    throw new Error("Cloudinary 업로드 결과 필드가 올바르지 않습니다.");
  }

  return result as CloudinaryUploadResult;
}

export function verifyProfileImageUpload(value: unknown, userId: string) {
  const result = readUploadResult(value);
  const { apiSecret, cloudName } = getCloudinaryConfig();
  const expectedFolder = `${userFolder(userId)}/`;
  const expectedSignature = cloudinary.utils.api_sign_request(
    { public_id: result.publicId, version: result.version },
    apiSecret,
  );

  if (!safeEqual(result.signature, expectedSignature)) {
    throw new Error("Cloudinary 응답 서명을 확인할 수 없습니다.");
  }

  if (
    result.resourceType !== "image" ||
    !ALLOWED_FORMATS.has(result.format.toLowerCase()) ||
    result.bytes < 1 ||
    result.bytes > PROFILE_IMAGE_MAX_BYTES ||
    result.width < 1 ||
    result.height < 1 ||
    !result.publicId.startsWith(expectedFolder)
  ) {
    throw new Error("허용되지 않은 프로필 이미지입니다.");
  }

  const expectedPath = `/${cloudName}/image/upload/v${result.version}/${result.publicId}.${result.format}`;
  const secureUrl = new URL(result.secureUrl);

  if (
    secureUrl.protocol !== "https:" ||
    secureUrl.hostname !== "res.cloudinary.com" ||
    secureUrl.pathname !== expectedPath ||
    secureUrl.search ||
    secureUrl.hash ||
    secureUrl.username ||
    secureUrl.password
  ) {
    throw new Error("우리 Cloudinary 계정의 이미지 URL만 사용할 수 있습니다.");
  }

  return {
    publicId: result.publicId,
    secureUrl: secureUrl.toString(),
  };
}

export function createProfileImageUpdateProof(userId: string, image: string) {
  const { apiSecret } = getCloudinaryConfig();
  return createHmac("sha256", apiSecret).update(`${userId}\n${image}`).digest("hex");
}

export function verifyProfileImageUpdateProof(userId: string, image: string, proof: string | null) {
  if (!proof) {
    return false;
  }

  return safeEqual(proof, createProfileImageUpdateProof(userId, image));
}

export function parseManagedProfilePublicId(image: string | null | undefined, userId: string) {
  if (!image) {
    return null;
  }

  const { cloudName } = getCloudinaryConfig();
  const url = new URL(image);
  const prefix = `/${cloudName}/image/upload/`;

  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(prefix)) {
    return null;
  }

  const versionAndAsset = url.pathname.slice(prefix.length);
  const match = /^v\d+\/(.+)\.[a-z0-9]+$/iu.exec(versionAndAsset);
  const publicId = match?.[1] ?? null;

  return publicId?.startsWith(`${userFolder(userId)}/`) ? publicId : null;
}

export async function deleteManagedProfileImage(image: string | null | undefined, userId: string) {
  const publicId = parseManagedProfilePublicId(image, userId);

  if (!publicId) {
    return;
  }

  const { apiKey, apiSecret, cloudName } = getCloudinaryConfig();
  cloudinary.config({ api_key: apiKey, api_secret: apiSecret, cloud_name: cloudName, secure: true });
  await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "image" });
}
