import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { findGuide, guideExamples } from "../guide-data";
import styles from "./page.module.css";

type GuideDetailPageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export function generateStaticParams() {
  return guideExamples.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);

  return {
    title: guide
      ? `${guide.title} | 공략게시판 | 도깨비의세계 비공식 위키`
      : "공략을 찾을 수 없습니다 | 도깨비의세계 비공식 위키",
    description: guide?.summary,
  };
}

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { slug } = await params;
  const guide = findGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="현재 위치">
        <Link href="/">홈</Link>
        <span aria-hidden="true">/</span>
        <Link href="/guides">공략게시판</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{guide.title}</span>
      </nav>

      <article className={styles.article}>
        <header className={styles.articleHeader}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.category}>{guide.category}</p>
              <h1>{guide.title}</h1>
            </div>
            <button
              className={styles.bookmarkButton}
              type="button"
              disabled
              title="즐겨찾기 기능 준비 중"
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.8L6 21Z" />
              </svg>
              즐겨찾기 준비 중
            </button>
          </div>
          <p className={styles.summary}>{guide.summary}</p>
          <dl className={styles.metadata}>
            {guide.updatedAt ? (
              <div>
                <dt>최종 수정일</dt>
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
        </header>

        <div className={styles.documentBody}>
          <p className={styles.placeholderNotice} role="note">
            이 문서는 상세 화면 검증용 placeholder이며 실제 게임 공략이 아닙니다.
          </p>

          <section aria-labelledby="overview-title">
            <h2 id="overview-title">공략 개요</h2>
            <p>
              실제 공략이 검수되어 공개되면 이 영역에 핵심 목표와 적용 범위를 설명합니다.
              확인되지 않은 게임 정보는 예시로 작성하지 않습니다.
            </p>
          </section>

          <section aria-labelledby="steps-title">
            <h2 id="steps-title">진행 단계</h2>
            <p>긴 공략을 읽기 쉽게 나눌 수 있는 문서 구조를 확인하는 영역입니다.</p>
            <ol>
              <li>공략의 전제 조건과 기준 버전을 확인합니다.</li>
              <li>출처로 검증된 순서와 주의 사항을 단계별로 정리합니다.</li>
              <li>변경된 정보가 있으면 본문과 근거를 함께 재검수합니다.</li>
            </ol>

            <h3 id="detail-example-title">세부 단계 예시</h3>
            <p>
              실제 콘텐츠에서는 제목 구조를 유지해 향후 목차와 섹션 책갈피를 연결할 수
              있습니다.
            </p>
          </section>

          <figure className={styles.imagePlaceholder}>
            <div role="img" aria-label="공략 이미지가 배치될 수 있는 예시 영역">
              이미지 영역
            </div>
            <figcaption>검증된 이미지와 설명이 필요한 경우 이 위치에 배치합니다.</figcaption>
          </figure>

          <section id="sources" className={styles.supportingSection} aria-labelledby="sources-title">
            <h2 id="sources-title">출처</h2>
            <p>연결된 출처가 없습니다. 실제 공략은 핵심 주장과 근거를 검수한 뒤 공개합니다.</p>
          </section>

          <section id="related" className={styles.supportingSection} aria-labelledby="related-title">
            <h2 id="related-title">관련 공략</h2>
            <p>현재 연결된 관련 공략이 없습니다.</p>
            <Link className={styles.backLink} href="/guides">
              공략 목록으로 돌아가기
            </Link>
          </section>
        </div>
      </article>
    </div>
  );
}
