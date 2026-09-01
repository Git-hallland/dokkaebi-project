import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { formatCommunityPostTime } from "@/lib/guide-community";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../community/community.module.css";

export const metadata: Metadata = { title: "즐겨찾기 | 도깨비의세계 비공식 위키", robots: { index: false, follow: false } };
export default async function FavoritesPage() {
  if (isFrontendOnly()) return <FrontendPreviewNotice heading="즐겨찾기 미리보기" description="즐겨찾기 데이터는 로컬 개발 환경에서 확인할 수 있습니다." />;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const session = await headers().then((value) => auth.api.getSession({ headers: value }));
  if (!session) return <div className={styles.empty}><h1>로그인이 필요합니다</h1><p>내가 즐겨찾기한 공략은 로그인 후 확인할 수 있습니다.</p><Link className={styles.write} href="/profile">로그인하러 가기</Link></div>;
  const favorites = await prisma.guidePostFavorite.findMany({
    where: { userId: session.user.id, post: { deletedAt: null } }, orderBy: { createdAt: "desc" }, take: 50,
    select: { createdAt: true, post: { select: { id: true, title: true, category: true, likeCount: true, viewCount: true, author: { select: { name: true } } } } },
  });
  return <div className={styles.page}><header className={styles.header}><div><p>MY LIBRARY</p><h1>즐겨찾기</h1><span>나중에 다시 읽을 공략과 팁입니다.</span></div></header>{favorites.length ? <ol className={styles.list}>{favorites.map(({ post, createdAt }) => <li key={post.id}><Link href={`/community/${post.id}`}><div className={styles.title}><span>{post.category === "GUIDE" ? "공략" : "팁"}</span><strong>{post.title}</strong></div><div className={styles.meta}><span>{post.author?.name ?? "탈퇴한 사용자"}</span><time dateTime={createdAt.toISOString()}>저장 {formatCommunityPostTime(createdAt)}</time><span>조회 {post.viewCount}</span><span>좋아요 {post.likeCount}</span></div></Link></li>)}</ol> : <div className={styles.empty}><strong>즐겨찾기한 글이 없습니다.</strong><p>게시물의 북마크 버튼을 눌러 이곳에 모아보세요.</p></div>}</div>;
}
