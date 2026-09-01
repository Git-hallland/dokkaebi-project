import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_IMAGE_MAX_BYTES,
  DEFAULT_PROFILE_IMAGE,
  detectProfileImageType,
  resolveProfileImageSource,
  validateProfileImageMetadata,
} from "./profile-image.ts";

test("uses the local default avatar for missing and failed images", () => {
  assert.equal(resolveProfileImageSource(null, null), DEFAULT_PROFILE_IMAGE);
  assert.equal(resolveProfileImageSource(undefined, null), DEFAULT_PROFILE_IMAGE);
  assert.equal(resolveProfileImageSource("", null), DEFAULT_PROFILE_IMAGE);
  assert.equal(
    resolveProfileImageSource("https://example.com/broken.png", "https://example.com/broken.png"),
    DEFAULT_PROFILE_IMAGE,
  );
  assert.equal(
    resolveProfileImageSource("https://example.com/avatar.png", null),
    "https://example.com/avatar.png",
  );
});

test("accepts PNG, JPEG, and WEBP metadata within 5MB", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) {
    assert.doesNotThrow(() => validateProfileImageMetadata({ size: 1024, type }));
  }
});

test("rejects invalid MIME types and oversized files", () => {
  assert.throws(() => validateProfileImageMetadata({ size: 1024, type: "image/svg+xml" }));
  assert.throws(() =>
    validateProfileImageMetadata({ size: PROFILE_IMAGE_MAX_BYTES + 1, type: "image/png" }),
  );
});

test("detects supported image signatures and rejects other bytes", () => {
  assert.equal(
    detectProfileImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png",
  );
  assert.equal(detectProfileImageType(Uint8Array.from([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(
    detectProfileImageType(
      Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    ),
    "image/webp",
  );
  assert.equal(detectProfileImageType(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])), null);
});
