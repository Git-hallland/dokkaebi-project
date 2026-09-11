"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { UserAvatar } from "./UserAvatar";
import styles from "./SupporterManagement.module.css";

type Supporter = Readonly<{ displayOrder: number; id: string; isVisible: boolean; user: { email: string; image: string | null; name: string } }>;
type Member = Readonly<{ email: string; id: string; image: string | null; name: string; providers: readonly string[]; supporterId: string | null }>;

async function responseMessage(response: Response, fallback: string) { try { const body = await response.json(); return typeof body?.message === "string" ? body.message : fallback; } catch { return fallback; } }

function SupporterRow({ supporter, refresh }: Readonly<{ supporter: Supporter; refresh: () => void }>) {
  const [order, setOrder] = useState(String(supporter.displayOrder));
  const [busy, setBusy] = useState(false);
  const change = async (data: { displayOrder?: number; isVisible?: boolean }) => { setBusy(true); const response = await fetch(`/api/admin/supporters/${supporter.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) window.alert(await responseMessage(response, "변경하지 못했습니다.")); else refresh(); setBusy(false); };
  return <li><UserAvatar image={supporter.user.image} name={supporter.user.name} size="small" /><span><strong>{supporter.user.name}</strong><small>{supporter.user.email}</small></span><label>순서<input type="number" min={0} max={9999} value={order} disabled={busy} onChange={(event) => setOrder(event.target.value)} /></label><button type="button" disabled={busy} onClick={() => void change({ displayOrder: Number(order) })}>순서 저장</button><button type="button" disabled={busy} onClick={() => void change({ isVisible: !supporter.isVisible })}>{supporter.isVisible ? "숨기기" : "표시하기"}</button><button className={styles.remove} type="button" disabled={busy} onClick={async () => { if (!window.confirm(`${supporter.user.name}님을 후원자 목록에서 제거할까요?`)) return; setBusy(true); const response = await fetch(`/api/admin/supporters/${supporter.id}`, { method: "DELETE" }); if (!response.ok) window.alert(await responseMessage(response, "제거하지 못했습니다.")); else refresh(); setBusy(false); }}>제거</button></li>;
}

export function SupporterManagement({ supporters }: Readonly<{ supporters: readonly Supporter[] }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true); setMessage("");
      try { const response = await fetch(`/api/admin/members?q=${encodeURIComponent(normalized)}`, { signal: controller.signal }); if (!response.ok) throw new Error(await responseMessage(response, "회원을 검색할 수 없습니다.")); const body = await response.json() as { members: Member[] }; setMembers(body.members); }
      catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "회원을 검색할 수 없습니다."); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const refresh = () => router.refresh();
  return <div className={styles.management}>
    <section className={styles.search}><label htmlFor="supporter-member-search">회원 검색</label><input id="supporter-member-search" value={query} maxLength={80} placeholder="닉네임 또는 이메일 2자 이상" onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) { setMembers([]); setSearching(false); setMessage(""); } }} /><small>{searching ? "검색 중…" : "검색 결과에서 회원을 선택해 후원자로 추가합니다."}</small>{message ? <p role="alert">{message}</p> : null}{members.length ? <ul>{members.map((member) => <li key={member.id}><UserAvatar image={member.image} name={member.name} size="small" /><span><strong>{member.name}</strong><small>{member.email} · {member.providers.join(", ") || "연결 정보 없음"}</small></span><button type="button" disabled={Boolean(member.supporterId)} onClick={async () => { const response = await fetch("/api/admin/supporters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: member.id }) }); if (!response.ok) { setMessage(await responseMessage(response, "후원자를 추가할 수 없습니다.")); return; } setMembers((current) => current.map((item) => item.id === member.id ? { ...item, supporterId: "registered" } : item)); refresh(); }}>{member.supporterId ? "등록됨" : "후원자로 추가"}</button></li>)}</ul> : query.trim().length >= 2 && !searching && !message ? <p>검색 결과가 없습니다.</p> : null}</section>
    <section><h2>현재 후원자</h2>{supporters.length ? <ul className={styles.supporters}>{supporters.map((supporter) => <SupporterRow key={supporter.id} supporter={supporter} refresh={refresh} />)}</ul> : <p>아직 등록된 후원자가 없습니다.</p>}</section>
  </div>;
}
