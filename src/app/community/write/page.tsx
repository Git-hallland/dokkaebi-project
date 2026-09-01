import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { CommunityPostEditor } from "@/components/CommunityPostEditor";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../community.module.css";

export const metadata: Metadata = { title: "새 글 작성", robots: { index: false, follow: false } };

export default async function CommunityWritePage() {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="글쓰기 미리보기" description="게시글 작성과 파일 업로드 기능은 로컬 개발 환경에서 확인할 수 있습니다." /></div>;
  const { auth } = await import("@/lib/auth");
  const session = await headers().then((value) => auth.api.getSession({ headers: value }));
  if (!session) return <div className={styles.empty}><h1>로그인이 필요합니다</h1><p>공략과 팁은 로그인한 사용자만 작성할 수 있습니다.</p><Link className={styles.write} href="/profile">로그인하러 가기</Link></div>;
  const key = createHash("sha256").update(session.user.id).digest("hex").slice(0, 16);
  return <div className={styles.page}><header><p>COMMUNITY</p><h1>새 글 작성</h1></header><CommunityPostEditor storageKey={`dokkaebi-community-draft-${key}`} /></div>;
}
