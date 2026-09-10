"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import styles from "./community.module.css";

export function CommunityWriteAction({ guideWriteEnabled }: Readonly<{ guideWriteEnabled: boolean }>) {
  const { data: session, isPending } = authClient.useSession();
  const writingAllowed = guideWriteEnabled || session?.user.role === "ADMIN";

  if (!writingAllowed) {
    return (
      <div className={styles.writeArea}>
        <span className={`${styles.write} ${styles.writeDisabled}`} aria-disabled="true">글쓰기</span>
        <small>공략 작성은 정식 오픈 후 이용할 수 있습니다.</small>
      </div>
    );
  }

  return (
    <div className={styles.writeArea}>
      <Link className={styles.write} href={session ? "/community/write" : "/profile"} prefetch={false}>
        {isPending ? "계정 확인 중…" : session ? "글쓰기" : "로그인하고 글쓰기"}
      </Link>
    </div>
  );
}
