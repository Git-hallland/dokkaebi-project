import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import type { BoardCategory } from "@/lib/board-categories";
import type { CmsBoardType } from "@/lib/admin-content";
import { getPublishedBoardContents } from "@/lib/editorial-content";
import { CMS_EVENT_STATUS_LABELS, resolveCmsEventStatus } from "@/lib/cms-event-status";

import styles from "./BoardPage.module.css";

type BoardPageProps = Readonly<{
  category: BoardCategory;
}>;

export async function BoardPage({ category }: BoardPageProps) {
  await connection();
  const toolsTitleId = `${category.key}-tools-title`;
  const listTitleId = `${category.key}-list-title`;
  const emptyStatusId = `${category.key}-empty-status`;
  const contents = category.key === "guides" ? [] : await getPublishedBoardContents(category.key as CmsBoardType);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="현재 위치">
        <Link href="/">홈</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category.title}</span>
      </nav>

      <header className={styles.intro}>
        <p className={styles.eyebrow}>정보 게시판</p>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
      </header>

      <section className={styles.tools} aria-labelledby={toolsTitleId}>
        <h2 id={toolsTitleId} className="sr-only">
          {category.title} 검색과 정렬
        </h2>
        <label className={styles.field}>
          <span>게시판 검색</span>
          <input
            type="search"
            placeholder="게시판 검색 (준비 중)"
            aria-describedby={emptyStatusId}
            disabled
          />
        </label>
        <label className={styles.field}>
          <span>정렬</span>
          <select aria-describedby={emptyStatusId} disabled>
            <option>최신순 (준비 중)</option>
          </select>
        </label>
      </section>

      <section aria-labelledby={listTitleId}>
        <div className={styles.sectionHeading}>
          <h2 id={listTitleId}>게시글 목록</h2>
          <p>확인된 정보부터 순차적으로 공개합니다.</p>
        </div>

        {contents.length ? <ul className={styles.list}>{contents.map((content) => { const eventStatus = category.key === "events" ? resolveCmsEventStatus(content.eventStatus) : null; return <li key={content.id}><Link className={content.coverImageUrl ? undefined : styles.noThumbnail} href={`/${category.key}/${encodeURIComponent(content.slug ?? "")}`}>{content.coverImageUrl ? <Image className={styles.thumbnail} src={content.coverImageUrl} alt="" width={160} height={90} unoptimized /> : null}<span className={styles.content}><span className={styles.titleRow}>{eventStatus ? <span className={`${styles.eventBadge} ${eventStatus === "ENDED" ? styles.eventEnded : styles.eventOngoing}`}>{CMS_EVENT_STATUS_LABELS[eventStatus]}</span> : null}<strong>{content.title}</strong></span><p>{content.summary}</p></span><time dateTime={content.updatedAt}>{new Date(content.updatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</time></Link></li>; })}</ul> : <div id={emptyStatusId} className={styles.emptyState} role="status"><strong>아직 공개된 게시글이 없습니다.</strong><p>출처와 내용을 검수한 문서가 준비되면 이곳에 표시합니다.</p></div>}
      </section>
    </div>
  );
}
