import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BoardCategory } from "@/lib/board-categories";
import type { CmsBoardType } from "@/lib/admin-content";
import { getPublishedBoardContent } from "@/lib/editorial-content";
import { decodeCmsRouteSlug } from "@/lib/cms-content-format";
import { CmsContentBody } from "@/components/CmsContentBody";
import { CMS_EVENT_STATUS_LABELS, resolveCmsEventStatus } from "@/lib/cms-event-status";
import styles from "./EditorialContentPage.module.css";

export async function EditorialContentPage({ category, slug, type }: Readonly<{ category: BoardCategory; slug: string; type: CmsBoardType }>) {
  const decodedSlug = decodeCmsRouteSlug(slug);
  if (!decodedSlug) notFound();
  const content = await getPublishedBoardContent(type, decodedSlug);
  if (!content) notFound();
  const eventStatus = type === "events" ? resolveCmsEventStatus(content.eventStatus) : null;
  return <div className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="현재 위치"><Link href="/">홈</Link><span aria-hidden="true">/</span><Link href={category.href}>{category.title}</Link><span aria-hidden="true">/</span><span aria-current="page">{content.title}</span></nav>
    <article className={styles.article}>
      <header><p className={styles.eyebrow}>검수된 위키 콘텐츠</p><div className={styles.titleRow}>{eventStatus ? <span className={`${styles.eventBadge} ${eventStatus === "ENDED" ? styles.eventEnded : styles.eventOngoing}`}>{CMS_EVENT_STATUS_LABELS[eventStatus]}</span> : null}<h1>{content.title}</h1></div>{content.summary ? <p className={styles.summary}>{content.summary}</p> : null}<dl className={styles.metadata}><div><dt>최종 수정</dt><dd>{new Date(content.updatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</dd></div>{content.checkedAt ? <div><dt>출처 확인</dt><dd>{new Date(content.checkedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</dd></div> : null}</dl></header>
      {content.coverImageUrl ? <Image className={styles.cover} src={content.coverImageUrl} alt="" width={1200} height={675} priority unoptimized /> : null}
      <div className={styles.body}><CmsContentBody body={content.body} imageClassName={styles.bodyImage} /></div>
      <section className={styles.sources} aria-labelledby="editorial-sources-title"><h2 id="editorial-sources-title">출처</h2><ul>{content.sources.map(({ source }) => <li key={source.id}>{source.url ? <a href={source.url} rel="noreferrer" target="_blank">{source.title}</a> : <strong>{source.title}</strong>}<span>{source.publisher} · 확인 {new Date(source.checkedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span></li>)}</ul></section>
    </article>
  </div>;
}
