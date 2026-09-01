import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CommunityPostEditor } from "@/components/CommunityPostEditor";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import type { CommunityDocument } from "@/lib/guide-community";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../../community.module.css";

export const metadata: Metadata = { title: "게시물 수정", robots: { index: false, follow: false } };

export default async function CommunityEditPage({ params }: { params: Promise<{ id: string }> }) {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="게시물 수정 미리보기" description="게시물 수정 기능은 로컬 개발 환경에서 확인할 수 있습니다." /></div>;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const { id } = await params;
  const [post, session] = await Promise.all([prisma.guidePost.findFirst({ where: { id, deletedAt: null }, select: { id: true, authorId: true, title: true, category: true, body: true } }), headers().then((value) => auth.api.getSession({ headers: value }))]);
  if (!post) notFound();
  if (!session) return <div className={styles.empty}><h1>로그인이 필요합니다</h1><Link className={styles.write} href="/profile">로그인하러 가기</Link></div>;
  if (session.user.id !== post.authorId) return <div className={styles.empty}><h1>수정 권한이 없습니다</h1><p>작성자만 이 게시물을 수정할 수 있습니다.</p><Link href={`/community/${id}`}>게시물로 돌아가기</Link></div>;
  const key = createHash("sha256").update(session.user.id).digest("hex").slice(0, 16);
  return <div className={styles.page}><header><p>COMMUNITY</p><h1>게시물 수정</h1></header><CommunityPostEditor postId={post.id} initialTitle={post.title} initialCategory={post.category} initialBody={post.body as unknown as CommunityDocument} storageKey={`dokkaebi-community-edit-${key}-${post.id}`} /></div>;
}
