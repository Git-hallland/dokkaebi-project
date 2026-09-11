import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";

import { AdminNavigation } from "@/components/AdminNavigation";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { MemberSanctionManager } from "@/components/MemberSanctionManager";
import { UserAvatar } from "@/components/UserAvatar";
import { isCmsAdmin } from "@/lib/admin-content";
import { isFrontendOnly } from "@/lib/runtime-mode";
import { ADMIN_MEMBER_PAGE_SIZE, normalizeMemberSearch, providerNames } from "@/lib/supporters";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "회원 관리 | DokkaebiProject", robots: { index: false, follow: false } };
const roles = ["USER", "EDITOR", "REVIEWER", "ADMIN"] as const;
const roleLabels = { USER: "일반 사용자", EDITOR: "작성자", REVIEWER: "검수자", ADMIN: "관리자" } as const;
const providers = ["google", "kakao"] as const;
const sanctionFilters = ["SUSPENDED", "BAN"] as const;
const kst = (value: Date) => value.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="회원 관리 미리보기" description="회원 관리는 운영 DB 환경에서 사용할 수 있습니다." /></div>;
  const [{ auth }, { prisma }, params] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma"), searchParams]);
  const session = await headers().then((value) => auth.api.getSession({ headers: value }));
  if (!session) redirect("/profile");
  if (!isCmsAdmin(session.user.role)) forbidden();
  const query = normalizeMemberSearch(params.q);
  const role = typeof params.role === "string" && roles.includes(params.role as never) ? params.role as typeof roles[number] : "";
  const provider = typeof params.provider === "string" && providers.includes(params.provider as never) ? params.provider as typeof providers[number] : "";
  const sanction = typeof params.sanction === "string" && sanctionFilters.includes(params.sanction as never) ? params.sanction as typeof sanctionFilters[number] : "";
  const selectedId = typeof params.member === "string" ? params.member : "";
  const page = typeof params.page === "string" && /^\d+$/u.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const now = new Date();
  const activeClause = { revokedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } satisfies Prisma.UserSanctionWhereInput;
  const where: Prisma.UserWhereInput = {
    ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}),
    ...(role ? { role } : {}),
    ...(provider ? { accounts: { some: { providerId: provider } } } : {}),
    ...(sanction === "BAN" ? { sanctions: { some: { ...activeClause, type: "BAN" } } } : {}),
    ...(sanction === "SUSPENDED" ? { sanctions: { some: { ...activeClause, type: { in: ["POST_SUSPENSION", "COMMENT_SUSPENSION"] } } } } : {}),
  };
  const [members, total, selected] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * ADMIN_MEMBER_PAGE_SIZE, take: ADMIN_MEMBER_PAGE_SIZE, select: { id: true, name: true, email: true, image: true, role: true, createdAt: true, accounts: { select: { providerId: true } }, sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } }, supporter: { select: { id: true } }, sanctions: { where: activeClause, select: { type: true } } } }),
    prisma.user.count({ where }),
    selectedId ? prisma.user.findUnique({ where: { id: selectedId }, select: { id: true, name: true, email: true, image: true, role: true, createdAt: true, accounts: { select: { providerId: true } }, sanctions: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, type: true, reason: true, startsAt: true, endsAt: true, revokedAt: true, createdBy: { select: { name: true } }, revokedBy: { select: { name: true } } } } } }) : null,
  ]);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_MEMBER_PAGE_SIZE));
  const makeHref = (changes: Record<string, string | number | null>) => { const next = new URLSearchParams(); if (query) next.set("q", query); if (role) next.set("role", role); if (provider) next.set("provider", provider); if (sanction) next.set("sanction", sanction); next.set("page", String(page)); for (const [key,value] of Object.entries(changes)) { if (value === null) next.delete(key); else next.set(key, String(value)); } return `/admin/members?${next}`; };

  return <div className={styles.page}>
    <AdminNavigation active="members" isAdmin />
    <header className={styles.hero}><p className={styles.eyebrow}>MEMBER ADMINISTRATION</p><h1>회원 관리</h1><p>가입 회원과 현재 제재 상태, 제재/해제 이력을 관리합니다.</p></header>
    <nav className={styles.filters} aria-label="제재 상태"><Link className={!sanction ? styles.active : ""} href={makeHref({ sanction: null, page: 1 })}>전체</Link><Link className={sanction === "SUSPENDED" ? styles.active : ""} href={makeHref({ sanction: "SUSPENDED", page: 1 })}>정지</Link><Link className={sanction === "BAN" ? styles.active : ""} href={makeHref({ sanction: "BAN", page: 1 })}>BAN</Link></nav>
    <form className={styles.memberFilters} method="get"><input type="hidden" name="sanction" value={sanction} /><label>회원 검색<input name="q" defaultValue={query} maxLength={80} placeholder="닉네임 또는 이메일" /></label><label>가입 경로<select name="provider" defaultValue={provider}><option value="">전체</option><option value="google">Google</option><option value="kakao">Kakao</option></select></label><label>권한<select name="role" defaultValue={role}><option value="">전체</option>{roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label><button type="submit">검색</button></form>
    <p className={styles.resultCount}>총 {total.toLocaleString("ko-KR")}명</p>
    <ol className={styles.memberList}>{members.map((member) => <li key={member.id}><UserAvatar image={member.image} name={member.name} size="small" /><span><strong><Link href={makeHref({ member: member.id })}>{member.name}</Link></strong><small>{member.email}</small></span><span><b>{providerNames(member.accounts).join(", ") || "연결 정보 없음"}</b><small>{roleLabels[member.role]}{member.supporter ? " · 후원자" : ""}</small>{member.sanctions.length ? <small className={styles.activeSanction}>{member.sanctions.some((item) => item.type === "BAN") ? "BAN" : "작성 정지"}</small> : null}</span><span><small>가입 {member.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</small><small>최근 로그인 {member.sessions[0] ? kst(member.sessions[0].updatedAt) : "기록 없음"}</small></span></li>)}</ol>
    {!members.length ? <section className={styles.card}><p>조건에 맞는 회원이 없습니다.</p></section> : null}
    <nav className={styles.pagination} aria-label="회원 목록 페이지">{page > 1 ? <Link href={makeHref({ page: page - 1 })}>이전</Link> : <span /> }<span>{page} / {pageCount}</span>{page < pageCount ? <Link href={makeHref({ page: page + 1 })}>다음</Link> : <span />}</nav>
    {selected ? <section className={styles.card}><div className={styles.memberDetailHeader}><UserAvatar image={selected.image} name={selected.name} /><div><h2>{selected.name}</h2><p>{selected.email}</p><small>{providerNames(selected.accounts).join(", ") || "연결 정보 없음"} · {roleLabels[selected.role]} · 가입 {kst(selected.createdAt)}</small></div><Link href={makeHref({ member: null })}>닫기</Link></div><MemberSanctionManager memberId={selected.id} disabled={selected.id === session.user.id || selected.role === "ADMIN"} sanctions={selected.sanctions.map((item) => ({ id: item.id, type: item.type, reason: item.reason, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt?.toISOString() ?? null, revokedAt: item.revokedAt?.toISOString() ?? null, createdBy: item.createdBy.name, revokedBy: item.revokedBy?.name ?? null }))} /></section> : null}
  </div>;
}
