import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";

import { AdminNavigation } from "@/components/AdminNavigation";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { UserAvatar } from "@/components/UserAvatar";
import { isCmsAdmin } from "@/lib/admin-content";
import { isFrontendOnly } from "@/lib/runtime-mode";
import { ADMIN_MEMBER_PAGE_SIZE, normalizeMemberSearch, providerNames } from "@/lib/supporters";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "회원 관리 | DokkaebiProject", robots: { index: false, follow: false } };
const roles = ["USER", "EDITOR", "REVIEWER", "ADMIN"] as const;
const roleLabels = { USER: "일반 사용자", EDITOR: "작성자", REVIEWER: "검수자", ADMIN: "관리자" } as const;
const providers = ["google", "kakao"] as const;

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="회원 관리 미리보기" description="회원 관리는 운영 DB 환경에서 사용할 수 있습니다." /></div>;
  const [{ auth }, { prisma }, params] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma"), searchParams]);
  const session = await headers().then((value) => auth.api.getSession({ headers: value }));
  if (!session) redirect("/profile");
  if (!isCmsAdmin(session.user.role)) forbidden();

  const query = normalizeMemberSearch(params.q);
  const role = typeof params.role === "string" && roles.includes(params.role as never) ? params.role as typeof roles[number] : "";
  const provider = typeof params.provider === "string" && providers.includes(params.provider as never) ? params.provider as typeof providers[number] : "";
  const page = typeof params.page === "string" && /^\d+$/u.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const where: Prisma.UserWhereInput = {
    ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}),
    ...(role ? { role } : {}),
    ...(provider ? { accounts: { some: { providerId: provider } } } : {}),
  };
  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ADMIN_MEMBER_PAGE_SIZE,
      take: ADMIN_MEMBER_PAGE_SIZE,
      select: { id: true, name: true, email: true, image: true, role: true, createdAt: true, accounts: { select: { providerId: true } }, sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } }, supporter: { select: { id: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_MEMBER_PAGE_SIZE));
  const pageHref = (nextPage: number) => { const next = new URLSearchParams(); if (query) next.set("q", query); if (role) next.set("role", role); if (provider) next.set("provider", provider); next.set("page", String(nextPage)); return `/admin/members?${next}`; };

  return <div className={styles.page}>
    <AdminNavigation active="members" isAdmin />
    <header className={styles.hero}><p className={styles.eyebrow}>MEMBER ADMINISTRATION</p><h1>회원 관리</h1><p>가입 회원의 공개 프로필과 권한, 가입 제공자를 확인합니다.</p></header>
    <form className={styles.memberFilters} method="get"><label>회원 검색<input name="q" defaultValue={query} maxLength={80} placeholder="닉네임 또는 이메일" /></label><label>가입 경로<select name="provider" defaultValue={provider}><option value="">전체</option><option value="google">Google</option><option value="kakao">Kakao</option></select></label><label>권한<select name="role" defaultValue={role}><option value="">전체</option>{roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label><button type="submit">검색</button></form>
    <p className={styles.resultCount}>총 {total.toLocaleString("ko-KR")}명</p>
    <ol className={styles.memberList}>{members.map((member) => <li key={member.id}><UserAvatar image={member.image} name={member.name} size="small" /><span><strong>{member.name}</strong><small>{member.email}</small></span><span><b>{providerNames(member.accounts).join(", ") || "연결 정보 없음"}</b><small>{roleLabels[member.role]}{member.supporter ? " · 후원자" : ""}</small></span><span><small>가입 {member.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</small><small>최근 로그인 {member.sessions[0]?.updatedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) ?? "기록 없음"}</small></span></li>)}</ol>
    {!members.length ? <section className={styles.card}><p>조건에 맞는 회원이 없습니다.</p></section> : null}
    <nav className={styles.pagination} aria-label="회원 목록 페이지">{page > 1 ? <Link href={pageHref(page - 1)}>이전</Link> : <span /> }<span>{page} / {pageCount}</span>{page < pageCount ? <Link href={pageHref(page + 1)}>다음</Link> : <span />}</nav>
  </div>;
}
