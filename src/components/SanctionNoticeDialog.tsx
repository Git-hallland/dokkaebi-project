"use client";

import { useEffect, useRef } from "react";
import styles from "./SanctionNoticeDialog.module.css";

export type SanctionNotice = Readonly<{ message: string; reason?: string | null; startsAt?: string; endsAt?: string | null }>;
const kst = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));

export function SanctionNoticeDialog({ notice, onClose }: Readonly<{ notice: SanctionNotice | null; onClose: () => void }>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (notice) buttonRef.current?.focus(); }, [notice]);
  if (!notice) return null;
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="sanction-notice-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}><h2 id="sanction-notice-title">{notice.message}</h2>{notice.startsAt ? <p className={styles.period}>기간: {kst(notice.startsAt)}{notice.endsAt ? `\n~ ${kst(notice.endsAt)}` : " ~ 무기한"}</p> : null}{notice.reason ? <p className={styles.reason}>사유: {notice.reason}</p> : null}<div className={styles.actions}><button ref={buttonRef} type="button" onClick={onClose}>확인</button></div></section></div>;
}

export async function readSanctionNotice(response: Response): Promise<SanctionNotice | null> {
  try {
    const body = await response.clone().json() as { code?: string; message?: string; sanction?: { reason?: string | null; startsAt?: string; endsAt?: string | null } };
    if (!body.code || !["POST_SUSPENSION", "COMMENT_SUSPENSION", "BAN"].includes(body.code) || typeof body.message !== "string") return null;
    return { message: body.message, ...body.sanction };
  } catch { return null; }
}
