"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "@/app/admin/admin.module.css";

import { MemberSanctionManager, type MemberSanction } from "./MemberSanctionManager";
import { UserAvatar } from "./UserAvatar";

type MemberSummary = Readonly<{
  createdAt: string;
  email: string;
  id: string;
  image: string | null;
  lastLoginAt: string | null;
  name: string;
  providers: readonly string[];
  roleLabel: string;
  sanctions: readonly Readonly<{ endsAt: string | null; startsAt: string; type: "POST_SUSPENSION" | "COMMENT_SUSPENSION" | "BAN" }>[];
  supporter: boolean;
}>;

type MemberDetail = Readonly<{
  createdAt: string;
  email: string;
  id: string;
  image: string | null;
  lastLoginAt: string | null;
  name: string;
  providers: readonly string[];
  role: "USER" | "EDITOR" | "REVIEWER" | "ADMIN";
  sanctions: readonly MemberSanction[];
}>;

const roleLabels = { USER: "일반 사용자", EDITOR: "작성자", REVIEWER: "검수자", ADMIN: "관리자" } as const;
const sanctionLabels = { POST_SUSPENSION: "게시글 정지", COMMENT_SUSPENSION: "댓글 정지", BAN: "BAN" } as const;
const kst = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));

function sanctionSummary(sanctions: MemberSummary["sanctions"]) {
  const sanction = sanctions[0];
  if (!sanction) return null;
  return sanction.type === "BAN"
    ? `BAN · ${kst(sanction.startsAt)} 시작`
    : `${sanctionLabels[sanction.type]} · ~ ${sanction.endsAt ? kst(sanction.endsAt) : "무기한"}`;
}

async function responseMessage(response: Response) {
  try {
    const body = await response.json() as { message?: string };
    return body.message ?? "회원 정보를 불러오지 못했습니다.";
  } catch {
    return "회원 정보를 불러오지 못했습니다.";
  }
}

export function MemberManagementClient({ currentUserId, members }: Readonly<{ currentUserId: string; members: readonly MemberSummary[] }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadMember = useCallback(async (memberId: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(memberId)}`, { cache: "no-store", signal });
      if (!response.ok) {
        setError(await responseMessage(response));
        setDetail(null);
        return;
      }
      setDetail(await response.json() as MemberDetail);
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setError("회원 정보를 불러오지 못했습니다.");
        setDetail(null);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const dialog = dialogRef.current;
    const controller = new AbortController();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    const timer = window.setTimeout(() => void loadMember(selectedId, controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      document.body.style.overflow = previousOverflow;
    };
  }, [loadMember, selectedId]);

  const close = useCallback(() => {
    if (dirty && !window.confirm("입력 중인 제재 내용이 있습니다. 닫을까요?")) return;
    setDirty(false);
    dialogRef.current?.close();
  }, [dirty]);

  const finishClose = () => {
    setSelectedId(null);
    setDetail(null);
    setError("");
    openerRef.current?.focus();
  };

  return (
    <>
      <ol className={styles.memberList}>
        {members.map((member) => {
          const activeSanction = sanctionSummary(member.sanctions);
          return (
            <li key={member.id}>
              <button
                className={styles.memberRow}
                type="button"
                onClick={(event) => {
                  openerRef.current = event.currentTarget;
                  setLoading(true);
                  setError("");
                  setDetail(null);
                  setSelectedId(member.id);
                }}
              >
                <UserAvatar image={member.image} name={member.name} size="small" />
                <span><strong>{member.name}</strong><small>{member.email}</small></span>
                <span><b>{member.providers.join(", ") || "연결 정보 없음"}</b><small>{member.roleLabel}{member.supporter ? " · 후원자" : ""}</small>{activeSanction ? <small className={styles.activeSanction}>{activeSanction}</small> : null}</span>
                <span><small>가입 {new Date(member.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</small><small>최근 로그인 {member.lastLoginAt ? kst(member.lastLoginAt) : "기록 없음"}</small></span>
              </button>
            </li>
          );
        })}
      </ol>

      <dialog
        ref={dialogRef}
        className={styles.memberDialog}
        aria-labelledby="member-detail-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={finishClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={styles.memberDialogSurface}>
          <header className={styles.memberDialogTitle}>
            <h2 id="member-detail-title">회원 정보</h2>
            <button type="button" aria-label="회원 정보 닫기" onClick={close}>×</button>
          </header>
          {loading ? <p role="status" className={styles.muted}>회원 정보를 불러오는 중입니다.</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {detail ? (
            <>
              <div className={styles.memberDetailHeader}>
                <UserAvatar image={detail.image} name={detail.name} />
                <div>
                  <h3>{detail.name}</h3>
                  <p className={styles.memberEmail}>{detail.email}</p>
                  <small>{detail.providers.join(", ") || "연결 정보 없음"} · {roleLabels[detail.role]}</small>
                  <small>가입 {kst(detail.createdAt)} · 최근 로그인 {detail.lastLoginAt ? kst(detail.lastLoginAt) : "기록 없음"}</small>
                </div>
              </div>
              <MemberSanctionManager
                memberId={detail.id}
                disabled={detail.id === currentUserId || detail.role === "ADMIN"}
                sanctions={detail.sanctions}
                onDirtyChange={setDirty}
                onChanged={() => {
                  setLoading(true);
                  setError("");
                  return loadMember(detail.id);
                }}
              />
            </>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
