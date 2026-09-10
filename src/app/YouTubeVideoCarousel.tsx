"use client";

import Image from "next/image";
import { useRef } from "react";

import { formatYouTubeViewCount, type PopularYouTubeVideo } from "@/lib/youtube-videos";

import styles from "./page.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

export function YouTubeVideoCarousel({ videos }: Readonly<{ videos: readonly PopularYouTubeVideo[] }>) {
  const listRef = useRef<HTMLUListElement>(null);

  function move(direction: -1 | 1) {
    listRef.current?.scrollBy({ behavior: "smooth", left: direction * listRef.current.clientWidth * 0.85 });
  }

  return (
    <div className={styles.videoCarousel} aria-label="도깨비의세계 인기 YouTube 영상">
      <div className={styles.carouselActions}>
        <button type="button" onClick={() => move(-1)} aria-label="이전 인기 영상">‹</button>
        <button type="button" onClick={() => move(1)} aria-label="다음 인기 영상">›</button>
      </div>
      <ul className={styles.videoRail} ref={listRef}>
        {videos.map((video) => (
          <li key={video.videoId}>
            <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`} target="_blank" rel="noopener noreferrer">
              <span className={styles.thumbnail}>
                <Image src={video.thumbnailUrl} alt="" width={480} height={270} sizes="(max-width: 44rem) 82vw, 20rem" />
                <span aria-hidden="true">▶</span>
              </span>
              <strong>{video.title}</strong>
              <span className={styles.videoMeta}>{video.channelTitle}</span>
              <span className={styles.videoMeta}>
                조회수 {formatYouTubeViewCount(video.viewCount)} · {dateFormatter.format(new Date(video.publishedAt))}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
