import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CommunityPostEditor } from "@/components/CommunityPostEditor";
import { auth } from "@/lib/auth";
import type { CommunityDocument } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import styles from "../../community.module.css";

export default async function CommunityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, session] = await Promise.all([prisma.guidePost.findFirst({ where: { id, deletedAt: null }, select: { id: true, authorId: true, title: true, category: true, body: true } }), headers().then((value) => auth.api.getSession({ headers: value }))]);
  if (!post) notFound();
  if (!session) return <div className={styles.empty}><h1>로그인이 필요합니다</h1><Link className={styles.write} href="/profile">로그인하러 가기</Link></div>;
  if (session.user.id !== post.authorId) return <div className={styles.empty}><h1>수정 권한이 없습니다</h1><p>작성자만 이 게시물을 수정할 수 있습니다.</p><Link href={`/community/${id}`}>게시물로 돌아가기</Link></div>;
  const key = createHash("sha256").update(session.user.id).digest("hex").slice(0, 16);
  return <div className={styles.page}><header><p>COMMUNITY</p><h1>게시물 수정</h1></header><CommunityPostEditor postId={post.id} initialTitle={post.title} initialCategory={post.category} initialBody={post.body as unknown as CommunityDocument} storageKey={`dokkaebi-community-edit-${key}-${post.id}`} /></div>;
}
