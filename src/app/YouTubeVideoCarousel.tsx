"use client";

import Image from "next/image";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { formatYouTubeViewCount, type PopularYouTubeVideo } from "@/lib/youtube-videos";

import styles from "./page.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });
const AUTO_SLIDE_INTERVAL_MS = 3_000;
const INTERACTION_PAUSE_MS = 7_000;
const MAX_CLONE_COUNT = 3;
const SWIPE_THRESHOLD_PX = 40;

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function YouTubeVideoCarousel({ videos }: Readonly<{ videos: readonly PopularYouTubeVideo[] }>) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const cloneCount = Math.min(MAX_CLONE_COUNT, videos.length);
  const renderedVideos = useMemo(
    () => [
      ...videos.slice(-cloneCount),
      ...videos,
      ...videos.slice(0, cloneCount),
    ],
    [cloneCount, videos],
  );
  const [trackIndex, setTrackIndex] = useState(cloneCount);
  const trackIndexRef = useRef(cloneCount);
  const [step, setStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const reducedMotionRef = useRef(false);
  const resumeAtRef = useRef(0);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const motionPendingRef = useRef(false);
  const animationFrameRef = useRef<number[]>([]);
  const scheduleAutoplayRef = useRef<(delay: number) => void>(() => undefined);

  const setTrackPosition = useCallback((index: number) => {
    trackIndexRef.current = index;
    setTrackIndex(index);
  }, []);

  const normalizeTrackPosition = useCallback((index: number) => {
    if (videos.length === 0) return index;
    if (index < cloneCount) return index + videos.length;
    if (index >= cloneCount + videos.length) return index - videos.length;
    return index;
  }, [cloneCount, videos.length]);

  const clearMotionFrames = useCallback(() => {
    for (const frame of animationFrameRef.current) cancelAnimationFrame(frame);
    animationFrameRef.current = [];
    motionPendingRef.current = false;
  }, []);

  const animateTo = useCallback((index: number) => {
    clearMotionFrames();
    motionPendingRef.current = true;
    isAnimatingRef.current = true;
    setIsAnimating(true);

    const prepareFrame = requestAnimationFrame(() => {
      const moveFrame = requestAnimationFrame(() => {
        setDragOffset(0);
        setTrackPosition(index);
        animationFrameRef.current = [];
        motionPendingRef.current = false;
      });
      animationFrameRef.current = [moveFrame];
    });
    animationFrameRef.current = [prepareFrame];
  }, [clearMotionFrames, setTrackPosition]);

  const move = useCallback((direction: -1 | 1) => {
    if (!isReady || isAnimatingRef.current || motionPendingRef.current || videos.length < 2) return;

    const nextIndex = trackIndexRef.current + direction;

    if (reducedMotionRef.current) {
      setDragOffset(0);
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setTrackPosition(normalizeTrackPosition(nextIndex));
      return;
    }

    animateTo(nextIndex);
  }, [animateTo, isReady, normalizeTrackPosition, setTrackPosition, videos.length]);

  const pauseAutoplay = useCallback(() => {
    resumeAtRef.current = Date.now() + INTERACTION_PAUSE_MS;
    scheduleAutoplayRef.current(INTERACTION_PAUSE_MS);
  }, []);

  const handleUserMove = useCallback((direction: -1 | 1) => {
    pauseAutoplay();
    move(direction);
  }, [move, pauseAutoplay]);

  const handleTransitionEnd = useCallback((event: React.TransitionEvent<HTMLUListElement>) => {
    if (event.propertyName !== "transform") return;

    const normalizedIndex = normalizeTrackPosition(trackIndexRef.current);
    clearMotionFrames();
    isAnimatingRef.current = false;
    setIsAnimating(false);
    if (normalizedIndex !== trackIndexRef.current) setTrackPosition(normalizedIndex);
  }, [clearMotionFrames, normalizeTrackPosition, setTrackPosition]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isReady || isAnimatingRef.current || motionPendingRef.current || videos.length < 2 || event.button !== 0) return;
    pauseAutoplay();
    suppressClickRef.current = false;
    pointerStartXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isReady, pauseAutoplay, videos.length]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartXRef.current === null || pointerIdRef.current !== event.pointerId) return;
    const nextOffset = event.clientX - pointerStartXRef.current;
    if (Math.abs(nextOffset) > 5) suppressClickRef.current = true;
    setDragOffset(Math.max(-step, Math.min(step, nextOffset)));
  }, [step]);

  const settlePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    if (pointerStartXRef.current === null || pointerIdRef.current !== event.pointerId) return;

    const offset = event.clientX - pointerStartXRef.current;
    pointerStartXRef.current = null;
    pointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!cancelled && Math.abs(offset) >= SWIPE_THRESHOLD_PX) {
      move(offset < 0 ? 1 : -1);
      return;
    }

    setDragOffset(0);
    if (!reducedMotionRef.current && Math.abs(offset) > 0) animateTo(trackIndexRef.current);
  }, [animateTo, move]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || videos.length === 0) return;

    const measure = () => {
      const firstItem = list.children.item(0) as HTMLElement | null;
      const secondItem = list.children.item(1) as HTMLElement | null;
      if (!firstItem) return;

      const firstRect = firstItem.getBoundingClientRect();
      const secondRect = secondItem?.getBoundingClientRect();
      const nextStep = secondRect ? secondRect.left - firstRect.left : firstRect.width;
      clearMotionFrames();
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setDragOffset(0);
      setStep(nextStep);
      setTrackPosition(cloneCount);
      setIsReady(nextStep > 0);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(list);
    return () => resizeObserver.disconnect();
  }, [clearMotionFrames, cloneCount, setTrackPosition, videos.length]);

  useEffect(() => clearMotionFrames, [clearMotionFrames]);

  useEffect(() => {
    if (videos.length < 2) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    function clearTimer() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    }

    function schedule(delay: number) {
      clearTimer();
      if (document.visibilityState === "hidden") return;
      timer = window.setTimeout(runAutoplay, Math.max(0, delay));
    }

    function runAutoplay() {
      const remainingPause = resumeAtRef.current - Date.now();
      if (remainingPause > 0) {
        schedule(remainingPause);
        return;
      }
      if (document.visibilityState === "hidden") return;
      if (carouselRef.current?.contains(document.activeElement)) {
        schedule(AUTO_SLIDE_INTERVAL_MS);
        return;
      }

      move(1);
      schedule(AUTO_SLIDE_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") clearTimer();
      else schedule(AUTO_SLIDE_INTERVAL_MS);
    }

    function handleMotionPreference(event: MediaQueryListEvent) {
      reducedMotionRef.current = event.matches;
    }

    reducedMotionRef.current = motionQuery.matches;
    scheduleAutoplayRef.current = schedule;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionQuery.addEventListener("change", handleMotionPreference);
    schedule(AUTO_SLIDE_INTERVAL_MS);

    return () => {
      clearTimer();
      scheduleAutoplayRef.current = () => undefined;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionPreference);
    };
  }, [move, videos.length]);

  const activeSourceIndex = videos.length === 0
    ? 0
    : wrapIndex(trackIndex - cloneCount, videos.length);

  return (
    <div
      ref={carouselRef}
      className={styles.videoCarousel}
      aria-label="도깨비의세계 인기 YouTube 영상"
      aria-roledescription="캐러셀"
      role="region"
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        suppressClickRef.current = false;
      }}
      onFocusCapture={pauseAutoplay}
      onMouseEnter={pauseAutoplay}
      onKeyDown={(event) => {
        pauseAutoplay();
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => settlePointer(event)}
      onPointerCancel={(event) => settlePointer(event, true)}
    >
      <div className={styles.carouselActions}>
        <button type="button" onClick={() => handleUserMove(-1)} onFocus={pauseAutoplay} aria-label="이전 인기 영상">‹</button>
        <button type="button" onClick={() => handleUserMove(1)} onFocus={pauseAutoplay} aria-label="다음 인기 영상">›</button>
      </div>
      <ul
        className={`${styles.videoRail} ${isReady ? styles.videoRailReady : ""} ${isAnimating ? styles.videoRailAnimating : ""}`}
        ref={listRef}
        style={{ transform: `translate3d(${-trackIndex * step + dragOffset}px, 0, 0)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {renderedVideos.map((video, renderedIndex) => {
          const sourceIndex = wrapIndex(renderedIndex - cloneCount, videos.length);
          const isClone = renderedIndex < cloneCount || renderedIndex >= cloneCount + videos.length;
          return (
            <li
              aria-hidden={isClone || undefined}
              className={sourceIndex === activeSourceIndex ? styles.activeVideo : undefined}
              key={`${video.videoId}-${renderedIndex}`}
            >
              <a
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isClone ? -1 : undefined}
                onFocus={pauseAutoplay}
              >
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
          );
        })}
      </ul>
    </div>
  );
}
