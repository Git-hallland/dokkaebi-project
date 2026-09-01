export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_PROFILE_IMAGE = "/brand/default-profile.png";

const PROFILE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type ProfileImageMetadata = Readonly<{
  size: number;
  type: string;
}>;

export function resolveProfileImageSource(
  image: string | null | undefined,
  failedImage: string | null,
) {
  const normalizedImage = image?.trim() || null;
  return normalizedImage && normalizedImage !== failedImage ? normalizedImage : DEFAULT_PROFILE_IMAGE;
}

export function validateProfileImageMetadata({ size, type }: ProfileImageMetadata) {
  if (!PROFILE_IMAGE_TYPES.has(type)) {
    throw new Error("PNG, JPEG, WEBP 이미지 파일만 선택할 수 있습니다.");
  }

  if (size <= 0 || size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error("프로필 이미지는 5MB 이하만 업로드할 수 있습니다.");
  }
}

export function detectProfileImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function validateProfileImageFile(file: File) {
  validateProfileImageMetadata(file);

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedType = detectProfileImageType(header);

  if (detectedType !== file.type) {
    throw new Error("파일 내용과 이미지 형식이 일치하지 않습니다.");
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);

    if (bitmap.width < 1 || bitmap.height < 1) {
      throw new Error("이미지 크기를 확인할 수 없습니다.");
    }
  } catch {
    throw new Error("손상되었거나 읽을 수 없는 이미지입니다.");
  } finally {
    bitmap?.close();
  }
}
