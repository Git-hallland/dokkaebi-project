"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

import { formatYouTubeViewCount, type PopularYouTubeVideo } from "@/lib/youtube-videos";

import styles from "./page.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });
const AUTO_SLIDE_INTERVAL_MS = 5_000;
const INTERACTION_PAUSE_MS = 7_000;

export function YouTubeVideoCarousel({ videos }: Readonly<{ videos: readonly PopularYouTubeVideo[] }>) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeSnapRef = useRef(0);
  const hoveredRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const resumeAtRef = useRef(0);
  const scheduleAutoplayRef = useRef<(delay: number) => void>(() => undefined);

  const getSnapPositions = useCallback(() => {
    const list = listRef.current;
    if (!list) return [];

    const listRect = list.getBoundingClientRect();
    const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);

    return Array.from(list.children).reduce<number[]>((positions, item) => {
      const itemRect = item.getBoundingClientRect();
      const position = Math.min(maxScrollLeft, Math.max(0, itemRect.left - listRect.left + list.scrollLeft));
      if (positions.length === 0 || Math.abs(positions.at(-1)! - position) > 1) positions.push(position);
      return positions;
    }, []);
  }, []);

  const updateActiveSnap = useCallback(() => {
    const list = listRef.current;
    const positions = getSnapPositions();
    if (!list || positions.length === 0) return;

    activeSnapRef.current = positions.reduce(
      (closestIndex, position, index) =>
        Math.abs(position - list.scrollLeft) < Math.abs(positions[closestIndex] - list.scrollLeft) ? index : closestIndex,
      0,
    );
  }, [getSnapPositions]);

  const move = useCallback((direction: -1 | 1) => {
    const list = listRef.current;
    const positions = getSnapPositions();
    if (!list || positions.length === 0) return;

    updateActiveSnap();
    const nextIndex = (activeSnapRef.current + direction + positions.length) % positions.length;
    activeSnapRef.current = nextIndex;
    list.scrollTo({
      behavior: reducedMotionRef.current ? "auto" : "smooth",
      left: positions[nextIndex],
    });
  }, [getSnapPositions, updateActiveSnap]);

  const pauseAutoplay = useCallback(() => {
    resumeAtRef.current = Date.now() + INTERACTION_PAUSE_MS;
    scheduleAutoplayRef.current(INTERACTION_PAUSE_MS);
  }, []);

  const handleUserMove = useCallback((direction: -1 | 1) => {
    pauseAutoplay();
    move(direction);
  }, [move, pauseAutoplay]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || videos.length < 2) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    function clearTimer() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    }

    function schedule(delay: number) {
      clearTimer();
      if (document.visibilityState === "hidden" || reducedMotionRef.current || hoveredRef.current) return;
      timer = window.setTimeout(runAutoplay, Math.max(0, delay));
    }

    function runAutoplay() {
      const remainingPause = resumeAtRef.current - Date.now();
      if (remainingPause > 0) {
        schedule(remainingPause);
        return;
      }
      if (document.visibilityState === "hidden" || reducedMotionRef.current || hoveredRef.current) return;

      move(1);
      schedule(AUTO_SLIDE_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") clearTimer();
      else schedule(AUTO_SLIDE_INTERVAL_MS);
    }

    function handleMotionPreference(event: MediaQueryListEvent) {
      reducedMotionRef.current = event.matches;
      if (event.matches) clearTimer();
      else schedule(AUTO_SLIDE_INTERVAL_MS);
    }

    reducedMotionRef.current = motionQuery.matches;
    scheduleAutoplayRef.current = schedule;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionQuery.addEventListener("change", handleMotionPreference);
    schedule(AUTO_SLIDE_INTERVAL_MS);

    const resizeObserver = new ResizeObserver(() => {
      const positions = getSnapPositions();
      if (positions.length === 0) return;
      activeSnapRef.current = Math.min(activeSnapRef.current, positions.length - 1);
      list.scrollTo({ behavior: "auto", left: positions[activeSnapRef.current] });
    });
    resizeObserver.observe(list);

    return () => {
      clearTimer();
      scheduleAutoplayRef.current = () => undefined;
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionPreference);
    };
  }, [getSnapPositions, move, videos.length]);

  return (
    <div
      className={styles.videoCarousel}
      aria-label="도깨비의세계 인기 YouTube 영상"
      aria-roledescription="캐러셀"
      role="region"
      onFocusCapture={pauseAutoplay}
      onKeyDown={(event) => {
        pauseAutoplay();
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onMouseEnter={() => {
        hoveredRef.current = true;
        scheduleAutoplayRef.current(AUTO_SLIDE_INTERVAL_MS);
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        pauseAutoplay();
      }}
      onPointerDown={pauseAutoplay}
    >
      <div className={styles.carouselActions}>
        <button type="button" onClick={() => handleUserMove(-1)} aria-label="이전 인기 영상">‹</button>
        <button type="button" onClick={() => handleUserMove(1)} aria-label="다음 인기 영상">›</button>
      </div>
      <ul className={styles.videoRail} ref={listRef} onScroll={updateActiveSnap}>
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
