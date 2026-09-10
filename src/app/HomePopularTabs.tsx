"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { PopularGuidePostSummary } from "@/lib/guide-community";
import type { PopularYouTubeVideo } from "@/lib/youtube-videos";

import styles from "./page.module.css";

const guideCategoryLabels = {
  GUIDE: "공략",
  TIP: "팁",
} as const;

type TabKey = "guides" | "videos";

export function HomePopularTabs({
  frontendOnly,
  popularGuidePosts,
  popularVideos,
}: Readonly<{
  frontendOnly: boolean;
  popularGuidePosts: readonly PopularGuidePostSummary[];
  popularVideos: readonly PopularYouTubeVideo[];
}>) {
  const [activeTab, setActiveTab] = useState<TabKey>("guides");

  return (
    <section className={`${styles.panel} ${styles.popularPanel}`} aria-labelledby="popular-content-title">
      <div className={styles.popularHeader}>
        <div>
          <p className={styles.sectionLabel}>지금 많이 보는 콘텐츠</p>
          <h2 id="popular-content-title">인기 콘텐츠</h2>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="인기 콘텐츠 종류">
          <button
            id="popular-guides-tab"
            type="button"
            role="tab"
            aria-controls="popular-guides-panel"
            aria-selected={activeTab === "guides"}
            onClick={() => setActiveTab("guides")}
          >
            인기글
          </button>
          <button
            id="popular-videos-tab"
            type="button"
            role="tab"
            aria-controls="popular-videos-panel"
            aria-selected={activeTab === "videos"}
            onClick={() => setActiveTab("videos")}
          >
            인기 영상
          </button>
        </div>
      </div>

      {activeTab === "guides" ? (
        <div id="popular-guides-panel" role="tabpanel" aria-labelledby="popular-guides-tab">
          {popularGuidePosts.length > 0 ? (
            <ol className={styles.popularList}>
              {popularGuidePosts.map((post, index) => (
                <li key={post.id}>
                  <span className={styles.rank}>{index + 1}</span>
                  <div className={styles.postSummary}>
                    <span>{guideCategoryLabels[post.category]}</span>
                    <strong>
                      <Link href={`/community/${post.id}`}>{post.title}</Link>
                    </strong>
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
              <strong>{frontendOnly ? "프론트엔드 미리보기 환경입니다." : "아직 등록된 인기 공략이 없습니다."}</strong>
              <p>{frontendOnly ? "인기 공략 데이터는 로컬 개발 환경에서 확인할 수 있습니다." : "공략과 팁이 등록되면 인기 순으로 이곳에 표시됩니다."}</p>
            </div>
          )}
        </div>
      ) : (
        <div id="popular-videos-panel" role="tabpanel" aria-labelledby="popular-videos-tab">
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
              <p>기존 YouTube 연동에서 영상이 확인되면 이곳에 표시됩니다.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
