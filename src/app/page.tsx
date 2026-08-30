import Link from "next/link";

import { CategoryCard } from "@/components/CategoryCard";
import { SiteSearch } from "@/components/SiteSearch";
import { boardCategories } from "@/lib/board-categories";

import { publishedGuides } from "./guides/guide-data";

import styles from "./page.module.css";

export default function Home() {
  const latestGuide = publishedGuides[0];

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>비공식 팬 위키</p>
          <h1 id="home-title">도깨비의 세계 WIKI</h1>
          <p className={styles.heroDescription}>
            공식 발표와 확인 가능한 근거를 바탕으로 게임 정보를 정리합니다.
          </p>
        </div>

        <div className={styles.mobileSearch}>
          <SiteSearch inputId="mobile-site-search" />
        </div>
      </section>

      <section
        id="main-categories"
        className={styles.section}
        aria-labelledby="category-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionLabel}>탐색</p>
            <h2 id="category-title">주요 정보 영역</h2>
          </div>
          <p>현재 확인된 정보부터 순차적으로 공개합니다.</p>
        </div>
        <div className={styles.categoryGrid}>
          {boardCategories.map((category) => (
            <CategoryCard
              key={category.title}
              title={category.title}
              description={category.homeDescription}
              href={category.href}
            />
          ))}
        </div>
      </section>

      <div className={styles.infoGrid}>
        <section className={styles.panel} aria-labelledby="latest-title">
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.sectionLabel}>업데이트</p>
              <h2 id="latest-title">최신 정보</h2>
            </div>
          </div>
          <div className={styles.emptyState}>
            {latestGuide ? (
              <>
                <strong>
                  <Link href={`/guides/${latestGuide.slug}`}>{latestGuide.title}</Link>
                </strong>
                <p>{latestGuide.summary}</p>
              </>
            ) : (
              <>
                <strong>아직 공개된 위키 문서가 없습니다.</strong>
                <p>
                  공식 출처로 확인할 수 있는 정보부터 작성하고 검수한 뒤 이곳에 표시합니다.
                </p>
              </>
            )}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="source-title">
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.sectionLabel}>편집 원칙</p>
              <h2 id="source-title">근거와 사실을 함께</h2>
            </div>
          </div>
          <ul className={styles.policyList}>
            <li>
              <strong>공식 확인</strong>
              <span>공식 발표와 직접 확인할 수 있는 자료를 우선합니다.</span>
            </li>
            <li>
              <strong>출처 추적</strong>
              <span>핵심 정보에는 출처와 확인 시점을 함께 남깁니다.</span>
            </li>
            <li>
              <strong>변경 이력 보존</strong>
              <span>현재 정보와 함께 중요한 변경 근거를 보존합니다.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
