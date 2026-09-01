"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { ReportDialog } from "./ReportDialog";
import styles from "./CommentSection.module.css";

type CommentItem = Readonly<{ author: { image: string | null; name: string } | null; authorId: string | null; body: string; createdLabel: string; deleted: boolean; edited: boolean; id: string; likeCount: number; liked: boolean; replies: readonly Omit<CommentItem, "replies">[] }>;
type Props = Readonly<{ comments: readonly CommentItem[]; isAuthenticated: boolean; nextCursor: string | null; postId: string; totalCount: number; userId: string | null }>;
async function responseMessage(response: Response, fallback: string) { try { const body = await response.json(); return typeof body?.message === "string" ? body.message : fallback; } catch { return fallback; } }

function Composer({ label, onCancel, onSubmit }: Readonly<{ label: string; onCancel?: () => void; onSubmit: (body: string) => Promise<void> }>) {
  const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <form className={styles.composer} onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { await onSubmit(body); setBody(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "댓글을 저장하지 못했습니다."); setBusy(false); } }}><label>{label}<textarea value={body} maxLength={1000} rows={3} onChange={(event) => setBody(event.target.value)} placeholder="1~1,000자의 댓글을 입력하세요." /></label><div><small>{body.length}/1,000</small>{onCancel ? <button type="button" onClick={onCancel}>취소</button> : null}<button type="submit" disabled={busy}>{busy ? "등록 중…" : "등록"}</button></div>{error ? <p role="alert">{error}</p> : null}</form>;
}

function CommentCard({ item, postId, userId, isReply = false }: Readonly<{ item: Omit<CommentItem, "replies"> | CommentItem; postId: string; userId: string | null; isReply?: boolean }>) {
  const router = useRouter(); const [replying, setReplying] = useState(false); const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(item.body); const [liked, setLiked] = useState(item.liked); const [count, setCount] = useState(item.likeCount); const [busy, setBusy] = useState(false); const mine = Boolean(userId && userId === item.authorId);
  const submitReply = async (body: string) => { const response = await fetch(`/api/community/posts/${postId}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, parentId: item.id }) }); if (!response.ok) throw new Error(await responseMessage(response, "답글을 저장하지 못했습니다.")); setReplying(false); router.refresh(); };
  const saveEdit = async () => { setBusy(true); const response = await fetch(`/api/community/comments/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: draft }) }); if (response.ok) { setEditing(false); router.refresh(); } else { window.alert(await responseMessage(response, "댓글을 수정하지 못했습니다.")); } setBusy(false); };
  const remove = async () => { if (!window.confirm("댓글을 삭제할까요?")) return; setBusy(true); const response = await fetch(`/api/community/comments/${item.id}`, { method: "DELETE" }); if (response.ok) router.refresh(); else { setBusy(false); window.alert(await responseMessage(response, "댓글을 삭제하지 못했습니다.")); } };
  const toggleLike = async () => { if (!userId) { window.alert("로그인이 필요한 기능입니다."); return; } if (mine || busy) return; const oldLiked = liked; const oldCount = count; const next = !liked; setLiked(next); setCount(Math.max(0,count+(next?1:-1))); setBusy(true); const response = await fetch(`/api/community/comments/${item.id}/like`, { method: next ? "POST" : "DELETE" }); if (response.ok) { const result = await response.json() as { active:boolean; likeCount:number }; setLiked(result.active); setCount(result.likeCount); } else { setLiked(oldLiked); setCount(oldCount); window.alert(await responseMessage(response,"댓글 좋아요를 변경하지 못했습니다.")); } setBusy(false); };
  return <article id={`comment-${item.id}`} className={`${styles.comment} ${isReply ? styles.reply : ""}`}>
    {item.deleted ? <p className={styles.deleted}>삭제된 댓글입니다.</p> : <><header><UserAvatar image={item.author?.image} name={item.author?.name ?? "탈퇴한 사용자"} size="small" /><div><strong>{item.author?.name ?? "탈퇴한 사용자"}</strong><small>{item.createdLabel}{item.edited ? " · 수정됨" : ""}</small></div></header>{editing ? <div className={styles.edit}><textarea value={draft} maxLength={1000} onChange={(event)=>setDraft(event.target.value)} /><button type="button" onClick={()=>setEditing(false)}>취소</button><button type="button" disabled={busy} onClick={saveEdit}>저장</button></div> : <p className={styles.body}>{item.body}</p>}<footer><button type="button" className={liked ? styles.liked : ""} aria-pressed={liked} disabled={mine || busy} title={mine ? "자신의 댓글에는 좋아요를 누를 수 없습니다." : undefined} onClick={toggleLike}>{liked ? "♥" : "♡"} {count}</button>{!isReply && userId ? <button type="button" onClick={()=>setReplying((value)=>!value)}>답글</button> : null}{mine ? <><button type="button" onClick={()=>setEditing(true)}>수정</button><button type="button" disabled={busy} onClick={remove}>삭제</button></> : userId ? <ReportDialog endpoint={`/api/community/comments/${item.id}/report`} /> : null}</footer></>}
    {replying && !item.deleted ? <Composer label={`${item.author?.name ?? "탈퇴한 사용자"}님에게 답글`} onCancel={()=>setReplying(false)} onSubmit={submitReply} /> : null}
    {"replies" in item && item.replies.length ? <div className={styles.replies}>{item.replies.map((reply)=><CommentCard key={reply.id} item={reply} postId={postId} userId={userId} isReply />)}</div> : null}
  </article>;
}

export function CommentSection({ comments, isAuthenticated, nextCursor, postId, totalCount, userId }: Props) {
  const router = useRouter(); const submit = async (body:string) => { const response = await fetch(`/api/community/posts/${postId}/comments`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({body,parentId:null}) }); if(!response.ok) throw new Error(await responseMessage(response,"댓글을 저장하지 못했습니다.")); router.refresh(); };
  return <section id="comments" className={styles.section} aria-labelledby="comments-title"><h2 id="comments-title">댓글 {totalCount}</h2>{isAuthenticated ? <Composer label="댓글 작성" onSubmit={submit} /> : <p className={styles.login}><Link href="/profile">로그인</Link> 후 댓글을 작성할 수 있습니다.</p>}<div className={styles.thread}>{comments.length ? comments.map((comment)=><CommentCard key={comment.id} item={comment} postId={postId} userId={userId} />) : <p className={styles.empty}>아직 댓글이 없습니다.</p>}</div>{nextCursor ? <Link className={styles.more} href={`/community/${postId}?commentsCursor=${encodeURIComponent(nextCursor)}#comments`}>다음 댓글 보기</Link> : null}</section>;
}
