"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./ReportDialog.module.css";

const reasons = [
  ["SPAM", "스팸/도배"],
  ["ABUSE", "욕설/괴롭힘"],
  ["MISINFORMATION", "잘못된 정보"],
  ["COPYRIGHT", "저작권 침해"],
  ["OTHER", "기타"],
] as const;

async function responseMessage(response: Response) {
  try {
    const body = await response.json();
    return typeof body?.message === "string" ? body.message : "신고를 접수할 수 없습니다.";
  } catch {
    return "신고를 접수할 수 없습니다.";
  }
}

export function ReportDialog({ endpoint, label = "신고" }: Readonly<{ endpoint: string; label?: string }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("SPAM");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setMessage("");
  };

  return <>
    <button className={styles.trigger} type="button" onClick={() => { setSuccess(false); setOpen(true); }}>{label}</button>
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onClose={() => setOpen(false)}
    >
      <form className={styles.form} onSubmit={async (event) => {
        event.preventDefault();
        if (busy || success) return;
        setBusy(true);
        setMessage("");
        const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason, description }) });
        if (response.ok) {
          setSuccess(true);
          setMessage("신고가 접수되었습니다.");
          setDescription("");
        } else {
          setMessage(await responseMessage(response));
        }
        setBusy(false);
      }}>
        <header><h2 id={titleId}>콘텐츠 신고</h2><button type="button" aria-label="신고 창 닫기" onClick={close}>×</button></header>
        <p>운영자가 확인할 수 있도록 가장 가까운 사유를 선택해 주세요.</p>
        <label>신고 사유<select value={reason} disabled={busy || success} onChange={(event) => setReason(event.target.value)}>{reasons.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label>추가 설명 <span>(선택)</span><textarea value={description} disabled={busy || success} maxLength={1000} rows={5} onChange={(event) => setDescription(event.target.value)} /></label>
        <small>{description.length}/1,000</small>
        {message ? <p className={success ? styles.success : styles.error} role={success ? "status" : "alert"}>{message}</p> : null}
        <footer><button type="button" disabled={busy} onClick={close}>{success ? "닫기" : "취소"}</button>{!success ? <button type="submit" disabled={busy}>{busy ? "접수 중…" : "신고하기"}</button> : null}</footer>
      </form>
    </dialog>
  </>;
}
