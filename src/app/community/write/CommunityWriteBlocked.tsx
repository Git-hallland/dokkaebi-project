"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SanctionNoticeDialog, type SanctionNotice } from "@/components/SanctionNoticeDialog";

import styles from "../community.module.css";

export function CommunityWriteBlocked({ initialNotice }: Readonly<{ initialNotice: SanctionNotice }>) {
  const router = useRouter();
  const [notice, setNotice] = useState<SanctionNotice | null>(initialNotice);

  return (
    <div className={styles.empty}>
      <SanctionNoticeDialog
        notice={notice}
        onClose={() => {
          setNotice(null);
          router.replace("/community");
        }}
      />
      <h1>{initialNotice.message}</h1>
      <p>공략게시판으로 돌아가 다른 글을 확인해 주세요.</p>
    </div>
  );
}
