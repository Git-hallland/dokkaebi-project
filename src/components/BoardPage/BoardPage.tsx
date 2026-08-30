import Link from "next/link";

import type { BoardCategory } from "@/lib/board-categories";

import styles from "./BoardPage.module.css";

type BoardPageProps = Readonly<{
  category: BoardCategory;
}>;

export function BoardPage({ category }: BoardPageProps) {
  const toolsTitleId = `${category.key}-tools-title`;
  const listTitleId = `${category.key}-list-title`;
  const emptyStatusId = `${category.key}-empty-status`;

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

        <ul className={styles.list} aria-describedby={emptyStatusId} />
        <div id={emptyStatusId} className={styles.emptyState} role="status">
          <strong>아직 공개된 게시글이 없습니다.</strong>
          <p>출처와 내용을 검수한 문서가 준비되면 이곳에 표시합니다.</p>
        </div>
      </section>
    </div>
  );
}
