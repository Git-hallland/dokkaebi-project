"use client";

import { useState } from "react";

import { DEFAULT_PROFILE_IMAGE, resolveProfileImageSource } from "@/lib/profile-image";

import styles from "./UserAvatar.module.css";

type UserAvatarProps = Readonly<{
  image?: string | null;
  name: string;
  size?: "small" | "large";
}>;

export function UserAvatar({ image, name, size = "large" }: UserAvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [defaultImageFailed, setDefaultImageFailed] = useState(false);
  const source = resolveProfileImageSource(image, failedImage);
  const sizeClass = size === "small" ? styles.small : styles.large;

  if (!defaultImageFailed || source !== DEFAULT_PROFILE_IMAGE) {
    return (
      // Profile URLs are user/provider supplied and cannot use a fixed Next.js host allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`${styles.avatar} ${sizeClass}`}
        src={source}
        alt={`${name} 프로필 이미지`}
        width={size === "small" ? 32 : 88}
        height={size === "small" ? 32 : 88}
        referrerPolicy="no-referrer"
        onError={() => {
          if (source === DEFAULT_PROFILE_IMAGE) {
            setDefaultImageFailed(true);
            return;
          }

          setFailedImage(source);
        }}
      />
    );
  }

  return (
    <span className={`${styles.fallback} ${sizeClass}`} aria-hidden="true">
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
