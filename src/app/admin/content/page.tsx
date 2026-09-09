import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { CMS_BOARD_TYPES, CMS_CONTENT_STATUSES, isCmsAdmin, type CmsBoardType, type CmsContentStatus } from "@/lib/admin-content";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "위키 콘텐츠 관리 | DokkaebiProject", robots: { index: false, follow: false } };
const statusLabels: Record<CmsContentStatus, string> = { ARCHIVED: "보관됨", DRAFT: "초안", PUBLISHED: "공개", REVIEW: "검수 대기" };

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="위키 콘텐츠 관리 미리보기" description="콘텐츠 CMS는 로컬 DB 환경에서 사용할 수 있습니다." /></div>;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const [session, query] = await Promise.all([headers().then((value) => auth.api.getSession({ headers: value })), searchParams]);
  if (!session) redirect("/profile");
  if (!isCmsAdmin(session.user.role)) forbidden();

  const type = typeof query.type === "string" && CMS_BOARD_TYPES.includes(query.type as CmsBoardType) ? query.type as CmsBoardType : null;
  const status = typeof query.status === "string" && CMS_CONTENT_STATUSES.includes(query.status as CmsContentStatus) ? query.status as CmsContentStatus : null;
  const contents = await prisma.content.findMany({
    where: { type: type ?? { in: [...CMS_BOARD_TYPES] }, ...(status ? { status } : {}) },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: { author: { select: { name: true } }, id: true, status: true, title: true, type: true, updatedAt: true },
  });

  return <div className={styles.page}>
    <div className={styles.adminNav}><Link href="/admin">신고 관리</Link><Link className={styles.active} href="/admin/content">위키 콘텐츠 관리</Link></div>
    <header className={styles.hero}><p className={styles.eyebrow}>EDITORIAL CMS</p><h1>위키 콘텐츠 관리</h1><p>공식 출처를 바탕으로 정보 게시판 문서를 작성하고 공개합니다.</p><Link className={styles.primaryLink} href="/admin/content/new">새 콘텐츠 작성</Link></header>
    <nav className={styles.filters} aria-label="게시판 필터"><Link className={!type ? styles.active : undefined} href={status ? `/admin/content?status=${status}` : "/admin/content"}>전체</Link>{CMS_BOARD_TYPES.map((value) => <Link key={value} className={type === value ? styles.active : undefined} href={`/admin/content?type=${value}${status ? `&status=${status}` : ""}`}>{value}</Link>)}</nav>
    <nav className={styles.filters} aria-label="상태 필터"><Link className={!status ? styles.active : undefined} href={type ? `/admin/content?type=${type}` : "/admin/content"}>전체 상태</Link>{CMS_CONTENT_STATUSES.map((value) => <Link key={value} className={status === value ? styles.active : undefined} href={`/admin/content?status=${value}${type ? `&type=${type}` : ""}`}>{statusLabels[value]}</Link>)}</nav>
    {contents.length ? <ol className={styles.contentList}>{contents.map((content) => <li key={content.id}><Link href={`/admin/content/${content.id}`}><span className={`${styles.statusBadge} ${styles[`status${content.status}`]}`}>{statusLabels[content.status]}</span><span><strong>{content.title}</strong><small>{content.type} · 작성자 {content.author?.name ?? "탈퇴한 사용자"}</small></span><time dateTime={content.updatedAt.toISOString()}>{content.updatedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</time><b>수정</b></Link></li>)}</ol> : <section className={styles.card}><p>조건에 맞는 콘텐츠가 없습니다.</p></section>}
  </div>;
}
