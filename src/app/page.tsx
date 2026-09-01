import Image from "next/image";

import { CategoryCard } from "@/components/CategoryCard";
import { SiteSearch } from "@/components/SiteSearch";
import { boardCategories } from "@/lib/board-categories";
import { COMMUNITY_VISIBLE_WHERE } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import { getPopularYouTubeVideos } from "@/lib/youtube-videos";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const guideCategoryLabels = {
  GUIDE: "공략",
  TIP: "팁",
} as const;

export default async function Home() {
  const [popularVideos, popularGuidePosts] = await Promise.all([
    getPopularYouTubeVideos(),
    prisma.guidePost.findMany({ where: COMMUNITY_VISIBLE_WHERE, orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 3, select: { id: true, title: true, category: true, likeCount: true, author: { select: { name: true } } } }),
  ]);

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

      <section className={`${styles.panel} ${styles.popularPanel}`} aria-labelledby="popular-title">
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.sectionLabel}>BEST 3</p>
            <h2 id="popular-title">공략게시판 인기글</h2>
          </div>
          <p>좋아요가 많은 공략과 팁을 소개합니다.</p>
        </div>
        {popularGuidePosts.length > 0 ? (
          <ol className={styles.popularList}>
            {popularGuidePosts.slice(0, 3).map((post, index) => (
              <li key={post.id}>
                <span className={styles.rank}>{index + 1}</span>
                <div className={styles.postSummary}>
                  <span>{guideCategoryLabels[post.category]}</span>
                  <strong><a href={`/community/${post.id}`}>{post.title}</a></strong>
                  <small>{post.author?.name ?? "탈퇴한 사용자"}</small>
                </div>
                <span className={styles.likeCount} aria-label={`좋아요 ${post.likeCount}개`}>
                  ♥ {post.likeCount}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.emptyState} role="status">
            <strong>아직 등록된 인기 공략이 없습니다.</strong>
            <p>공략게시판이 열리고 이용자 글이 등록되면 인기 순으로 이곳에 표시됩니다.</p>
          </div>
        )}
      </section>

      <section className={`${styles.panel} ${styles.videoPanel}`} aria-labelledby="video-title">
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.sectionLabel}>YouTube</p>
            <h2 id="video-title">도깨비의세계 인기 영상</h2>
          </div>
          <p>YouTube 조회수 기준 검색 결과입니다.</p>
        </div>
        {popularVideos.length > 0 ? (
          <ul className={styles.videoGrid}>
            {popularVideos.map((video) => (
              <li key={video.videoId}>
                <a
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.thumbnail}>
                    <Image
                      src={video.thumbnailUrl}
                      alt=""
                      width={480}
                      height={270}
                      sizes="(max-width: 44rem) 100vw, 22rem"
                    />
                    <span aria-hidden="true">▶</span>
                  </span>
                  <strong>{video.title}</strong>
                  <small>{video.channelTitle}</small>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState} role="status">
            <strong>현재 인기 영상을 불러올 수 없습니다.</strong>
            <p>서버 설정 또는 YouTube 응답을 확인한 뒤 자동으로 다시 시도합니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
