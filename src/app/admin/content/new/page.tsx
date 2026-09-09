import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { AdminContentEditor } from "@/components/AdminContentEditor";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { isCmsAdmin } from "@/lib/admin-content";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "새 위키 콘텐츠 | DokkaebiProject", robots: { index: false, follow: false } };

export default async function NewAdminContentPage() {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="새 콘텐츠 미리보기" description="콘텐츠 작성 기능은 로컬 DB 환경에서 사용할 수 있습니다." /></div>;
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/profile");
  if (!isCmsAdmin(session.user.role)) forbidden();
  return <div className={styles.page}><Link className={styles.back} href="/admin/content">← 콘텐츠 목록</Link><header className={styles.hero}><p className={styles.eyebrow}>NEW EDITORIAL CONTENT</p><h1>새 콘텐츠 작성</h1><p>초안으로 빠르게 저장한 뒤 공식 자료와 대조하여 공개하세요.</p></header><AdminContentEditor /></div>;
}
