import Link from "next/link";

import { CategoryCard } from "@/components/CategoryCard";
import { SiteSearch } from "@/components/SiteSearch";

import { publishedGuides } from "./guides/guide-data";

import styles from "./page.module.css";

const categories = [
  {
    title: "공략게시판",
    description: "게임 플레이에 도움이 되는 검수된 공략을 확인할 수 있습니다.",
    href: "/guides",
  },
  {
    title: "클래스 / 스킬",
    description: "공식적으로 공개된 전투와 성장 정보를 확인한 뒤 제공합니다.",
  },
  {
    title: "아이템 / 장비",
    description: "획득과 활용 정보를 검증할 수 있는 자료가 확보되면 공개합니다.",
  },
  {
    title: "몬스터 / 보스",
    description: "등장 조건과 공략 정보는 실제 확인 가능한 범위에서 다룹니다.",
  },
  {
    title: "지역 / NPC",
    description: "지역과 인물 정보가 공식적으로 확인되면 찾아보기 쉽게 연결합니다.",
  },
  {
    title: "던전 / 콘텐츠",
    description: "참여 조건과 진행 방식이 공개된 콘텐츠부터 정리합니다.",
  },
  {
    title: "제작 / 생활",
    description: "반복해서 찾아볼 가치가 있는 제작·생활 정보를 준비합니다.",
  },
  {
    title: "이벤트 / 쿠폰",
    description: "기간과 출처를 다시 확인한 유효한 정보만 제공할 예정입니다.",
  },
  {
    title: "패치노트",
    description: "공식 변경 사항을 최신 정보와 이전 기록으로 구분해 정리합니다.",
  },
];

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
          {categories.map((category) => (
            <CategoryCard
              key={category.title}
              title={category.title}
              description={category.description}
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
