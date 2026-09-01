import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { COMMUNITY_PAGE_SIZE, COMMUNITY_VISIBLE_WHERE, communityOrderBy, formatCommunityPostTime, isNewCommunityPost, normalizeCommunitySort } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import styles from "./community.module.css";

export const metadata: Metadata = { title: "공략게시판 | 도깨비의세계 비공식 위키", description: "이용자가 작성한 도깨비의세계 공략과 팁입니다." };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CommunityPage({ searchParams }: Props) {
  const [params, session] = await Promise.all([searchParams, headers().then((value) => auth.api.getSession({ headers: value }))]);
  const sort = normalizeCommunitySort(params.sort);
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const posts = await prisma.guidePost.findMany({
    where: COMMUNITY_VISIBLE_WHERE, orderBy: communityOrderBy(sort), take: COMMUNITY_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, title: true, category: true, createdAt: true, viewCount: true, likeCount: true, author: { select: { name: true } } },
  });
  const next = posts.length > COMMUNITY_PAGE_SIZE ? posts[COMMUNITY_PAGE_SIZE - 1]?.id : null;
  const visible = posts.slice(0, COMMUNITY_PAGE_SIZE);
  const now = new Date();
  return <div className={styles.page}>
    <header className={styles.header}><div><p>COMMUNITY</p><h1>공략게시판</h1><span>이용자가 직접 작성한 공략과 짧은 팁을 공유합니다.</span></div>{session ? <Link className={styles.write} href="/community/write">글쓰기</Link> : <Link className={styles.write} href="/profile">로그인하고 글쓰기</Link>}</header>
    <nav className={styles.filters} aria-label="게시물 정렬"><Link className={sort === "latest" ? styles.current : undefined} href="/community?sort=latest">최신순</Link><Link className={sort === "popular" ? styles.current : undefined} href="/community?sort=popular">인기순</Link></nav>
    {visible.length ? <ol className={styles.list}>{visible.map((post) => <li key={post.id}><Link href={`/community/${post.id}`}><div className={styles.title}><span>{post.category === "GUIDE" ? "공략" : "팁"}</span><strong>{post.title}</strong>{isNewCommunityPost(post.createdAt, now) ? <b>NEW</b> : null}</div><div className={styles.meta}><span>{post.author?.name ?? "탈퇴한 사용자"}</span><time dateTime={post.createdAt.toISOString()}>{formatCommunityPostTime(post.createdAt)}</time><span>조회 {post.viewCount}</span><span>좋아요 {post.likeCount}</span></div></Link></li>)}</ol> : <div className={styles.empty}><strong>아직 등록된 글이 없습니다.</strong><p>첫 공략이나 팁을 공유해 주세요.</p></div>}
    {next ? <Link className={styles.next} href={`/community?sort=${sort}&cursor=${encodeURIComponent(next)}`}>다음 글 보기</Link> : null}
  </div>;
}
