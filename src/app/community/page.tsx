import type { Metadata } from "next";
import Link from "next/link";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { getCommunityPosts } from "@/lib/community-data";
import { COMMUNITY_PAGE_SIZE, formatCommunityPostTime, isNewCommunityPost, normalizeCommunitySort } from "@/lib/guide-community";
import { isFrontendOnly } from "@/lib/runtime-mode";
import { getSiteSettings } from "@/lib/site-settings-data";
import { CommunityWriteAction } from "./CommunityWriteAction";
import styles from "./community.module.css";

export function generateMetadata(): Metadata {
  return { title: "공략게시판 | 도깨비의세계 비공식 위키", description: "이용자가 작성한 도깨비의세계 공략과 팁입니다.", ...(isFrontendOnly() ? { robots: { index: false, follow: false } } : {}) };
}
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CommunityPage({ searchParams }: Props) {
  if (isFrontendOnly()) return <div className={styles.page}><header className={styles.header}><div><p>COMMUNITY</p><h1>공략게시판</h1><span>이용자가 직접 작성한 공략과 짧은 팁을 공유합니다.</span></div></header><FrontendPreviewNotice heading="게시판 미리보기" description="현재 프론트엔드 미리보기 환경입니다. 게시판 데이터와 글쓰기 기능은 로컬 개발 환경에서 확인할 수 있습니다." /></div>;
  const params = await searchParams;
  const sort = normalizeCommunitySort(params.sort);
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const [posts, siteSettings] = await Promise.all([
    getCommunityPosts(sort, cursor),
    getSiteSettings(),
  ]);
  const next = posts.length > COMMUNITY_PAGE_SIZE ? posts[COMMUNITY_PAGE_SIZE - 1]?.id : null;
  const visible = posts.slice(0, COMMUNITY_PAGE_SIZE);
  const now = new Date();
  return <div className={styles.page}>
    <header className={styles.header}><div><p>COMMUNITY</p><h1>공략게시판</h1><span>이용자가 직접 작성한 공략과 짧은 팁을 공유합니다.</span></div><CommunityWriteAction guideWriteEnabled={siteSettings.guideWriteEnabled} /></header>
    <nav className={styles.filters} aria-label="게시물 정렬"><Link className={sort === "latest" ? styles.current : undefined} href="/community?sort=latest">최신순</Link><Link className={sort === "popular" ? styles.current : undefined} href="/community?sort=popular">인기순</Link></nav>
    {visible.length ? <ol className={styles.list}>{visible.map((post) => <li key={post.id}><Link href={`/community/${post.id}`}><div className={styles.title}><span>{post.category === "GUIDE" ? "공략" : "팁"}</span><strong>{post.title}</strong>{isNewCommunityPost(post.createdAt, now) ? <b>NEW</b> : null}</div><div className={styles.meta}><span>{post.author?.name ?? "탈퇴한 사용자"}</span><time dateTime={post.createdAt}>{formatCommunityPostTime(post.createdAt)}</time><span>조회 {post.viewCount}</span><span>좋아요 {post.likeCount}</span></div></Link></li>)}</ol> : <div className={styles.empty}><strong>아직 등록된 글이 없습니다.</strong><p>첫 공략이나 팁을 공유해 주세요.</p></div>}
    {next ? <Link className={styles.next} href={`/community?sort=${sort}&cursor=${encodeURIComponent(next)}`}>다음 글 보기</Link> : null}
  </div>;
}
