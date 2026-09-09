import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import { AdminContentEditor, type AdminContentEditorValue } from "@/components/AdminContentEditor";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { CMS_BOARD_TYPES, CMS_SOURCE_TYPES, isCmsAdmin, type CmsBoardType, type CmsSourceType } from "@/lib/admin-content";
import { isFrontendOnly } from "@/lib/runtime-mode";
import { readSkillLevelMetadata } from "@/lib/cms-entity";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "위키 콘텐츠 수정 | DokkaebiProject", robots: { index: false, follow: false } };

export default async function EditAdminContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="콘텐츠 수정 미리보기" description="콘텐츠 수정 기능은 로컬 DB 환경에서 사용할 수 있습니다." /></div>;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const [session, { id }, query] = await Promise.all([auth.api.getSession({ headers: await headers() }), params, searchParams]);
  if (!session) redirect("/profile");
  if (!isCmsAdmin(session.user.role)) forbidden();
  const content = await prisma.content.findUnique({ where: { id }, select: { body: true, coverImageUrl: true, detailStatus: true, entityCategory: true, entityMetadata: true, entitySortOrder: true, eventStatus: true, iconImageUrl: true, id: true, skillLevels: { orderBy: { order: "asc" }, select: { description: true, id: true, label: true, metadata: true, order: true } }, slug: true, sources: { orderBy: { source: { checkedAt: "desc" } }, select: { source: { select: { checkedAt: true, publisher: true, sourceType: true, title: true, url: true } } } }, status: true, summary: true, title: true, type: true } });
  if (!content || !CMS_BOARD_TYPES.includes(content.type as CmsBoardType)) notFound();
  const initial: AdminContentEditorValue = { body: content.body ?? "", coverImageUrl: content.coverImageUrl ?? "", detailStatus: content.detailStatus === "UNRELEASED" ? "UNRELEASED" : "PUBLISHED", entityCategory: content.entityCategory ?? "", entityMetadata: readSkillLevelMetadata(content.entityMetadata), entitySortOrder: content.entitySortOrder, eventStatus: content.eventStatus, iconImageUrl: content.iconImageUrl ?? "", id: content.id, skillLevels: content.skillLevels.map((level) => ({ description: level.description ?? "", id: level.id, label: level.label, metadata: readSkillLevelMetadata(level.metadata), order: level.order })), slug: content.slug ?? "", sources: content.sources.map(({ source }) => ({ checkedAt: source.checkedAt.toISOString().slice(0, 10), publisher: source.publisher, sourceType: CMS_SOURCE_TYPES.includes(source.sourceType as CmsSourceType) ? source.sourceType as CmsSourceType : "official_page", title: source.title, url: source.url ?? "" })), status: content.status, summary: content.summary ?? "", title: content.title, type: content.type as CmsBoardType };
  return <div className={styles.page}><Link className={styles.back} href="/admin/content">← 콘텐츠 목록</Link><header className={styles.hero}><p className={styles.eyebrow}>EDIT EDITORIAL CONTENT</p><h1>{content.title}</h1><p>본문, 출처와 공개 상태를 한 화면에서 관리합니다.</p></header>{query.saved === "1" ? <p className={styles.success} role="status">콘텐츠를 저장했습니다.</p> : null}<AdminContentEditor initial={initial} /></div>;
}
