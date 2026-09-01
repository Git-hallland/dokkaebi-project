"use client";

import Image from "next/image";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import styles from "./SocialSignInButtons.module.css";

type SocialProvider = "kakao" | "google";

export function SocialSignInButtons() {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signIn(provider: SocialProvider) {
    setPendingProvider(provider);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/profile",
        errorCallbackURL: "/profile?authError=oauth",
      });

      if (result.error) {
        setErrorMessage("로그인을 시작하지 못했습니다. OAuth 설정을 확인한 뒤 다시 시도해 주세요.");
        setPendingProvider(null);
      }
    } catch {
      setErrorMessage("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPendingProvider(null);
    }
  }

  const isPending = pendingProvider !== null;

  return (
    <div className={styles.group}>
      <button
        className={`${styles.button} ${styles.kakao}`}
        type="button"
        onClick={() => void signIn("kakao")}
        disabled={isPending}
        aria-busy={pendingProvider === "kakao"}
        aria-label={pendingProvider === "kakao" ? "카카오 로그인 페이지로 이동 중" : undefined}
      >
        <Image
          className={styles.kakaoAsset}
          src="/auth/kakao-login.jpg"
          alt="카카오계정으로 로그인"
          width={453}
          height={90}
          loading="eager"
        />
      </button>
      <button
        className={`${styles.button} ${styles.google}`}
        type="button"
        onClick={() => void signIn("google")}
        disabled={isPending}
        aria-busy={pendingProvider === "google"}
      >
        <span className={styles.googleContent}>
          <Image
            className={styles.googleLogo}
            src="/auth/google-g-logo.png"
            alt=""
            width={20}
            height={20}
          />
          <span>{pendingProvider === "google" ? "Google로 이동 중…" : "Google로 계속하기"}</span>
        </span>
      </button>
      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
