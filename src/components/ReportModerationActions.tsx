"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./ReportModerationActions.module.css";

async function responseMessage(response: Response) {
  try {
    const body = await response.json();
    return typeof body?.message === "string" ? body.message : "신고를 처리할 수 없습니다.";
  } catch { return "신고를 처리할 수 없습니다."; }
}

export function ReportModerationActions({ canModerate, reportId }: Readonly<{ canModerate: boolean; reportId: string }>) {
  const router = useRouter();
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (status: "RESOLVED" | "DISMISSED", action: "NONE" | "HIDE_TARGET") => {
    if (busy) return;
    if (action === "HIDE_TARGET" && !window.confirm("대상을 숨기고 신고를 처리할까요? 이 작업은 목록과 상세에서 콘텐츠를 숨깁니다.")) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/community/reports/${reportId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, action, resolution }) });
    if (response.ok) { setMessage("처리되었습니다."); router.refresh(); }
    else { setMessage(await responseMessage(response)); setBusy(false); }
  };

  return <section className={styles.actions} aria-labelledby="moderation-actions-title">
    <h2 id="moderation-actions-title">처리</h2>
    <label>처리 메모 <span>(선택)</span><textarea rows={4} maxLength={1000} value={resolution} disabled={busy} onChange={(event) => setResolution(event.target.value)} /></label>
    <div><button type="button" disabled={busy} onClick={() => submit("DISMISSED", "NONE")}>신고 기각</button><button type="button" disabled={busy} onClick={() => submit("RESOLVED", "NONE")}>처리 완료</button>{canModerate ? <button className={styles.danger} type="button" disabled={busy} onClick={() => submit("RESOLVED", "HIDE_TARGET")}>대상 숨김 + 해결</button> : null}</div>
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
