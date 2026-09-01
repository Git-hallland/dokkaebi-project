"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./CommunityPostActions.module.css";

export function CommunityPostActions({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <div className={styles.actions}>
    <Link href={`/community/${id}/edit`}>수정</Link>
    <button className={styles.delete} type="button" disabled={busy} onClick={async () => {
      if (!window.confirm("이 게시물을 삭제할까요? 삭제 후 목록과 상세에서 숨겨집니다.")) return;
      setBusy(true);
      const response = await fetch(`/api/community/posts/${id}`, { method: "DELETE" });
      if (response.ok) { router.push("/community"); router.refresh(); return; }
      setBusy(false);
      window.alert("게시물을 삭제하지 못했습니다.");
    }}>{busy ? "삭제 중…" : "삭제"}</button>
  </div>;
}
