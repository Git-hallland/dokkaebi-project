import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BoardCategory } from "@/lib/board-categories";
import type { CmsBoardType } from "@/lib/admin-content";
import { getPublishedBoardContent } from "@/lib/editorial-content";
import { decodeCmsRouteSlug } from "@/lib/cms-content-format";
import { readSkillLevelMetadata } from "@/lib/cms-entity";
import { CmsContentBody } from "@/components/CmsContentBody";
import { SkillLevelViewer } from "@/components/SkillLevelViewer";
import { CMS_DETAIL_STATUS_LABELS } from "@/lib/cms-entity";
import styles from "./EntityDetailPage.module.css";

export async function EntityDetailPage({ category, slug, type }: Readonly<{ category: BoardCategory; slug: string; type: CmsBoardType }>) {
  const decodedSlug = decodeCmsRouteSlug(slug);
  if (!decodedSlug) notFound();
  const content = await getPublishedBoardContent(type, decodedSlug);
  if (!content) notFound();
  const levels = type === "skills" ? content.skillLevels.map((level) => ({ ...level, metadata: readSkillLevelMetadata(level.metadata) })) : [];
  const detailStatus = content.detailStatus === "UNRELEASED" ? "UNRELEASED" : "PUBLISHED";
  const entityMetadata = readSkillLevelMetadata(content.entityMetadata);

  return <div className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="현재 위치"><Link href="/">홈</Link><span aria-hidden="true">/</span><Link href={category.href}>{category.title}</Link><span aria-hidden="true">/</span><span aria-current="page">{content.title}</span></nav>
    <article className={styles.article}>
      <header className={styles.header}>
        {content.iconImageUrl ? <Image className={styles.icon} src={content.iconImageUrl} alt="" width={112} height={112} priority unoptimized /> : <span className={styles.placeholder} aria-hidden="true">{content.title.trim().slice(0, 1) || "?"}</span>}
        <div><p className={styles.eyebrow}>검수된 게임 정보</p><div className={styles.titleRow}><h1>{content.title}</h1><span className={styles.badge}>{content.entityCategory || "미분류"}</span><span className={`${styles.detailBadge} ${detailStatus === "UNRELEASED" ? styles.unreleased : styles.published}`}>{CMS_DETAIL_STATUS_LABELS[detailStatus]}</span></div>{detailStatus === "PUBLISHED" && content.summary ? <p className={styles.summary}>{content.summary}</p> : null}<dl className={styles.metadata}><div><dt>최종 수정</dt><dd>{content.updatedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</dd></div>{content.checkedAt ? <div><dt>출처 확인</dt><dd>{content.checkedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</dd></div> : null}</dl></div>
      </header>
      {detailStatus === "PUBLISHED" && content.coverImageUrl ? <Image className={styles.cover} src={content.coverImageUrl} alt="" width={1200} height={675} priority unoptimized /> : null}
      {detailStatus === "UNRELEASED" ? <section className={styles.unreleasedNotice}><strong>아직 상세 정보가 공개되지 않은 도술입니다.</strong><p>공식 자료에서 확인되는 정보가 공개되면 내용을 갱신합니다.</p></section> : <>
        {Object.keys(entityMetadata).length ? <section className={styles.infoSection} aria-labelledby="entity-info-title"><h2 id="entity-info-title">도술 정보</h2><dl>{Object.entries(entityMetadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section> : null}
        <section className={styles.body} aria-labelledby="entity-description-title"><h2 id="entity-description-title">기본 설명</h2><CmsContentBody body={content.body} imageClassName={styles.bodyImage} /></section>
        {levels.length ? <SkillLevelViewer levels={levels} /> : null}
      </>}
      <section className={styles.sources} aria-labelledby="entity-sources-title"><h2 id="entity-sources-title">출처</h2><ul>{content.sources.map(({ source }) => <li key={source.id}>{source.url ? <a href={source.url} rel="noreferrer" target="_blank">{source.title}</a> : <strong>{source.title}</strong>}<span>{source.publisher} · 확인 {source.checkedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span></li>)}</ul></section>
    </article>
  </div>;
}
