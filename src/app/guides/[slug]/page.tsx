import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { findPublishedGuide, publishedGuides } from "../guide-data";
import styles from "./page.module.css";

type GuideDetailPageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export function generateStaticParams() {
  return publishedGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findPublishedGuide(slug);

  return {
    title: guide
      ? `${guide.title} | 공략게시판 | 도깨비의세계 비공식 위키`
      : "공략을 찾을 수 없습니다 | 도깨비의세계 비공식 위키",
    description: guide?.summary,
  };
}

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { slug } = await params;
  const guide = findPublishedGuide(slug);

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
            <div>
              <dt>콘텐츠 상태</dt>
              <dd>{guide.contentStatus}</dd>
            </div>
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
            {guide.notice}
          </p>

          {guide.sections.map((section, index) => {
            const titleId = `guide-section-${index + 1}`;

            return (
              <section key={section.title} aria-labelledby={titleId}>
                <h2 id={titleId}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items ? (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}

          <section id="sources" className={styles.supportingSection} aria-labelledby="sources-title">
            <h2 id="sources-title">출처</h2>
            <ul className={styles.sourceList}>
              {guide.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="noreferrer" target="_blank">
                    {source.title}
                  </a>
                  <span>
                    게시일 {source.publishedAt} · 확인일 {source.checkedAt}
                  </span>
                </li>
              ))}
            </ul>
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
