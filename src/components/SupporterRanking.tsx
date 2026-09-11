"use client";

import { useEffect, useRef } from "react";

import { UserAvatar } from "./UserAvatar";
import styles from "./SupporterRanking.module.css";

export type PublicSupporter = Readonly<{
  id: string;
  user: Readonly<{ image: string | null; name: string }>;
}>;

export function SupporterRanking({ supporters }: Readonly<{ supporters: readonly PublicSupporter[] }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => document.body.classList.remove("modal-open");
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      document.body.classList.remove("modal-open");
    };
  }, []);

  const open = () => {
    document.body.classList.add("modal-open");
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button className={styles.trigger} type="button" onClick={open}>
        <span className={styles.icon} aria-hidden="true">★</span>
        <span><strong>후원자 랭킹</strong><small>후원해주신 분들을 확인합니다</small></span>
      </button>
      <dialog
        className={styles.dialog}
        ref={dialogRef}
        aria-labelledby="supporter-ranking-title"
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <section className={styles.panel}>
          <header>
            <div><p>SUPPORTER</p><h2 id="supporter-ranking-title">후원자 랭킹</h2></div>
            <button type="button" onClick={close} aria-label="후원자 랭킹 닫기">×</button>
          </header>
          <p className={styles.intro}>도깨비의세계 비공식 위키 운영을 응원해 주셔서 감사합니다.</p>
          {supporters.length ? (
            <ol className={styles.list}>
              {supporters.map((supporter, index) => (
                <li key={supporter.id}>
                  <span className={styles.rank}>{index + 1}</span>
                  <UserAvatar image={supporter.user.image} name={supporter.user.name} size="small" />
                  <strong>{supporter.user.name}</strong>
                </li>
              ))}
            </ol>
          ) : <p className={styles.empty}>등록된 후원자가 아직 없습니다.</p>}
        </section>
      </dialog>
    </>
  );
}
