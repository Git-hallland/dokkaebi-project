"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { shouldRestoreProgress } from "@/lib/community-interactions";
import styles from "./CommunityEngagement.module.css";

type Props = Readonly<{
  initialFavorite: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialProgress: number | null;
  isAuthenticated: boolean;
  isOwnPost: boolean;
  postId: string;
}>;

async function responseMessage(response: Response, fallback: string) {
  try { const body = await response.json(); return typeof body?.message === "string" ? body.message : fallback; } catch { return fallback; }
}

export function CommunityEngagement(props: Props) {
  const [liked, setLiked] = useState(props.initialLiked);
  const [likeCount, setLikeCount] = useState(props.initialLikeCount);
  const [favorite, setFavorite] = useState(props.initialFavorite);
  const [likeBusy, setLikeBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [restored, setRestored] = useState(false);
  const lastSent = useRef(props.initialProgress ?? 0);

  useEffect(() => {
    if (!shouldRestoreProgress(props.initialProgress)) return;
    let cancelled = false;
    const restore = () => {
      if (cancelled) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) { window.scrollTo({ top: max * (props.initialProgress ?? 0), behavior: "smooth" }); setRestored(true); }
    };
    const timer = window.setTimeout(restore, 650);
    const images = Array.from(document.querySelectorAll<HTMLImageElement>("main img"));
    void Promise.allSettled(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); }))).then(() => window.setTimeout(restore, 100));
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [props.initialProgress]);

  useEffect(() => {
    if (!props.isAuthenticated) return;
    let timer: number | null = null;
    const ratio = () => { const max = document.documentElement.scrollHeight - window.innerHeight; return max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max)); };
    const save = (progress: number) => {
      if (Math.abs(progress - lastSent.current) < 0.01) return;
      lastSent.current = progress;
      void fetch(`/api/community/posts/${props.postId}/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ progress }), keepalive: true });
    };
    const onScroll = () => { if (timer !== null) return; timer = window.setTimeout(() => { timer = null; save(ratio()); }, 4_000); };
    const onPageHide = () => save(ratio());
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("pagehide", onPageHide);
    return () => { if (timer !== null) window.clearTimeout(timer); window.removeEventListener("scroll", onScroll); window.removeEventListener("pagehide", onPageHide); save(ratio()); };
  }, [props.isAuthenticated, props.postId]);

  const requireLogin = () => { setMessage("로그인이 필요한 기능입니다."); };
  const toggleLike = async () => {
    if (!props.isAuthenticated) { requireLogin(); return; }
    if (props.isOwnPost || likeBusy) return;
    const previous = liked; const previousCount = likeCount; const next = !liked;
    setLiked(next); setLikeCount(Math.max(0, likeCount + (next ? 1 : -1))); setLikeBusy(true); setMessage("");
    const response = await fetch(`/api/community/posts/${props.postId}/like`, { method: next ? "POST" : "DELETE" });
    if (response.ok) { const result = await response.json() as { active: boolean; likeCount: number }; setLiked(result.active); setLikeCount(result.likeCount); }
    else { setLiked(previous); setLikeCount(previousCount); setMessage(await responseMessage(response, "좋아요를 변경하지 못했습니다.")); }
    setLikeBusy(false);
  };
  const toggleFavorite = async () => {
    if (!props.isAuthenticated) { requireLogin(); return; }
    if (favoriteBusy) return;
    const previous = favorite; const next = !favorite; setFavorite(next); setFavoriteBusy(true); setMessage("");
    const response = await fetch(`/api/community/posts/${props.postId}/favorite`, { method: next ? "POST" : "DELETE" });
    if (!response.ok) { setFavorite(previous); setMessage(await responseMessage(response, "즐겨찾기를 변경하지 못했습니다.")); }
    setFavoriteBusy(false);
  };

  return <>
    <div className={styles.bar} aria-label="게시물 활동">
      <button className={`${styles.action} ${liked ? styles.liked : ""}`} type="button" aria-pressed={liked} aria-label={liked ? `좋아요 취소, 현재 ${likeCount}개` : `좋아요, 현재 ${likeCount}개`} disabled={props.isOwnPost || likeBusy} title={props.isOwnPost ? "자신이 작성한 글에는 좋아요를 누를 수 없습니다." : undefined} onClick={toggleLike}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20.4 4.2 13A5.2 5.2 0 0 1 12 6.1 5.2 5.2 0 0 1 19.8 13Z" /></svg><small>{likeCount}</small></button>
      <button className={`${styles.action} ${favorite ? styles.favorited : ""}`} type="button" aria-pressed={favorite} aria-label={favorite ? "즐겨찾기 취소" : "즐겨찾기 추가"} disabled={favoriteBusy} title={favorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"} onClick={toggleFavorite}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3.5h12v17.7L12 17l-6 4.2Z" /></svg></button>
    </div>
    {props.isOwnPost ? <p className={styles.hint}>내가 작성한 글에는 좋아요를 누를 수 없습니다.</p> : null}
    {message ? <p className={styles.message} role="status">{message} {!props.isAuthenticated ? <Link href="/profile">로그인하기</Link> : null}</p> : null}
    {restored ? <div className={styles.restore} role="status"><span>지난번 읽던 위치로 이동했습니다.</span><button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setRestored(false); }}>처음부터 보기</button></div> : null}
  </>;
}
