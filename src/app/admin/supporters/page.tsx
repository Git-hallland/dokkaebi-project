import type { Metadata } from "next";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { AdminNavigation } from "@/components/AdminNavigation";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { SupporterManagement } from "@/components/SupporterManagement";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "후원자 관리 | DokkaebiProject", robots: { index: false, follow: false } };

export default async function AdminSupportersPage() {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="후원자 관리 미리보기" description="후원자 관리는 운영 DB 환경에서 사용할 수 있습니다." /></div>;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const session = await headers().then((value) => auth.api.getSession({ headers: value }));
  if (!session) redirect("/profile");
  if (session.user.role !== "ADMIN") forbidden();
  const supporters = await prisma.supporter.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true, displayOrder: true, isVisible: true, user: { select: { name: true, email: true, image: true } } } });
  return <div className={styles.page}><AdminNavigation active="supporters" isAdmin /><header className={styles.hero}><p className={styles.eyebrow}>SUPPORTER MANAGEMENT</p><h1>후원자 관리</h1><p>가입 회원을 검색해 후원자 랭킹의 공개 여부와 순서를 관리합니다.</p></header><section className={styles.card}><SupporterManagement supporters={supporters} /></section></div>;
}
