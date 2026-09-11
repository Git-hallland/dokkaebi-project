"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/admin/admin.module.css";

type Sanction = Readonly<{ id: string; type: "POST_SUSPENSION" | "COMMENT_SUSPENSION" | "BAN"; reason: string | null; startsAt: string; endsAt: string | null; revokedAt: string | null; createdBy: string; revokedBy: string | null }>;
const labels = { POST_SUSPENSION: "게시글 작성 정지", COMMENT_SUSPENSION: "댓글 작성 정지", BAN: "영구 BAN" } as const;
const ko = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
async function getMessage(response: Response) { try { const body = await response.json(); return typeof body.message === "string" ? body.message : "요청을 처리하지 못했습니다."; } catch { return "요청을 처리하지 못했습니다."; } }

export function MemberSanctionManager({ memberId, disabled, sanctions }: Readonly<{ memberId: string; disabled: boolean; sanctions: readonly Sanction[] }>) {
  const router = useRouter();
  const [type, setType] = useState<keyof typeof labels>("POST_SUSPENSION");
  const [duration, setDuration] = useState("3");
  const [customEnd, setCustomEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async () => {
    const endsAt = duration === "custom" ? customEnd && new Date(customEnd).toISOString() : new Date(Date.now() + Number(duration) * 86_400_000).toISOString();
    if (type !== "BAN" && !endsAt) { setMessage("종료 시간을 선택해 주세요."); return; }
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/members/${memberId}/sanctions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, endsAt: type === "BAN" ? null : endsAt, reason }) });
    if (!response.ok) setMessage(await getMessage(response)); else { setMessage("제재를 적용했습니다."); router.refresh(); }
    setBusy(false);
  };
  const revoke = async (id: string) => {
    if (!window.confirm("이 제재를 취소할까요? 이력은 보존됩니다.")) return;
    setBusy(true); const response = await fetch(`/api/admin/members/${memberId}/sanctions/${id}`, { method: "PATCH" });
    if (!response.ok) setMessage(await getMessage(response)); else { setMessage("제재를 취소했습니다."); router.refresh(); }
    setBusy(false);
  };
  return <section className={styles.sanctionPanel} aria-labelledby="sanction-title">
    <h2 id="sanction-title">제재 관리</h2>
    {disabled ? <p className={styles.muted}>자기 자신 또는 다른 관리자 계정은 제재할 수 없습니다.</p> : <div className={styles.sanctionForm}>
      <label>제재 종류<select value={type} onChange={(event) => setType(event.target.value as keyof typeof labels)}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {type !== "BAN" ? <label>기간<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="1">1일</option><option value="3">3일</option><option value="7">7일</option><option value="14">14일</option><option value="30">30일</option><option value="custom">직접 선택</option></select></label> : null}
      {type !== "BAN" && duration === "custom" ? <label>종료 시각<input type="datetime-local" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label> : null}
      <label className={styles.sanctionReason}>사유<textarea rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="도배, 욕설, 광고 등" /></label>
      <button type="button" disabled={busy} onClick={submit}>{busy ? "처리 중…" : "제재 적용"}</button>
    </div>}
    {message ? <p role="status">{message}</p> : null}
    <h3>제재/해제 이력</h3>
    <ol className={styles.sanctionHistory}>{sanctions.map((sanction) => { const active = !sanction.revokedAt && (!sanction.endsAt || new Date(sanction.endsAt) > new Date()); return <li key={sanction.id}><div><strong>{labels[sanction.type]}</strong><span className={active ? styles.activeSanction : styles.inactiveSanction}>{active ? "활성" : "종료"}</span></div><small>{ko(sanction.startsAt)} ~ {sanction.endsAt ? ko(sanction.endsAt) : "무기한"}</small><small>사유: {sanction.reason || "기록 없음"}</small><small>처리: {sanction.createdBy}{sanction.revokedBy ? ` · 해제: ${sanction.revokedBy}` : ""}</small>{active && !disabled ? <button type="button" disabled={busy} onClick={() => revoke(sanction.id)}>제재 취소</button> : null}</li>; })}</ol>
    {!sanctions.length ? <p className={styles.muted}>제재 이력이 없습니다.</p> : null}
  </section>;
}
