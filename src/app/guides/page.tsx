import type { Metadata } from "next";
import Link from "next/link";

import { guideExamples } from "./guide-data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "공략게시판 | 도깨비의세계 비공식 위키",
  description: "게임 플레이에 도움이 되는 검수된 공략을 모아보는 비공식 위키 페이지입니다.",
};

export default function GuidesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>검수된 공략 문서</p>
        <h1>공략게시판</h1>
        <p>게임 플레이에 도움이 되는 공략을 모아볼 수 있습니다.</p>
      </header>

      <section className={styles.tools} aria-labelledby="guide-tools-title">
        <h2 id="guide-tools-title" className="sr-only">
          공략 검색과 필터
        </h2>
        <label className={styles.field}>
          <span>공략 검색</span>
          <input
            type="search"
            aria-label="공략 검색"
            placeholder="공략 검색 (준비 중)"
            disabled
          />
        </label>
        <label className={styles.field}>
          <span>카테고리 필터</span>
          <select aria-label="공략 카테고리 필터" disabled>
            <option>전체 카테고리</option>
          </select>
        </label>
      </section>

      <section aria-labelledby="guide-list-title">
        <div className={styles.sectionHeading}>
          <h2 id="guide-list-title">공략 목록</h2>
          <p>확인된 공략부터 순차적으로 공개합니다.</p>
        </div>

        <p className={styles.placeholderNotice} role="note">
          아래 항목은 UI 확인용 예시이며 실제 게임 정보가 아닙니다.
        </p>

        <ul className={styles.list}>
          {guideExamples.map((guide) => (
            <li key={guide.slug}>
              <Link className={styles.guideItem} href={`/guides/${guide.slug}`}>
                <div className={styles.itemBody}>
                  <span className={styles.category}>{guide.category}</span>
                  <h3>{guide.title}</h3>
                  <p>{guide.summary}</p>
                </div>
                <dl className={styles.metadata}>
                  {guide.updatedAt ? (
                    <div>
                      <dt>수정일</dt>
                      <dd>{guide.updatedAt}</dd>
                    </div>
                  ) : null}
                  {guide.gameVersion ? (
                    <div>
                      <dt>게임 버전</dt>
                      <dd>{guide.gameVersion}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>출처 상태</dt>
                    <dd>{guide.sourceStatus}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
