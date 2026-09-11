"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { readSanctionNotice, SanctionNoticeDialog, type SanctionNotice } from "@/components/SanctionNoticeDialog";
import { authClient } from "@/lib/auth-client";

import styles from "./community.module.css";

export function CommunityWriteAction({ guideWriteEnabled }: Readonly<{ guideWriteEnabled: boolean }>) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<SanctionNotice | null>(null);
  const [error, setError] = useState("");
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
      <SanctionNoticeDialog notice={notice} onClose={() => setNotice(null)} />
      {session ? (
        <button
          className={styles.write}
          type="button"
          disabled={isPending || checking}
          onClick={async () => {
            setChecking(true);
            setError("");
            try {
              const response = await fetch("/api/community/write-access", { cache: "no-store" });
              if (response.ok) {
                router.push("/community/write");
                return;
              }
              const sanction = await readSanctionNotice(response);
              if (sanction) setNotice(sanction);
              else setError("현재 글쓰기 가능 여부를 확인할 수 없습니다.");
            } catch {
              setError("현재 글쓰기 가능 여부를 확인할 수 없습니다.");
            } finally {
              setChecking(false);
            }
          }}
        >
          {checking ? "확인 중…" : "글쓰기"}
        </button>
      ) : (
        <Link className={styles.write} href="/profile" prefetch={false}>
          {isPending ? "계정 확인 중…" : "로그인하고 글쓰기"}
        </Link>
      )}
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}
