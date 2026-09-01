import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { GUIDE_REPORT_PAGE_SIZE, communityDocumentPreview, hasCommunityCapability } from "@/lib/community-reports";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Community 신고 관리 | DokkaebiProject", robots: { index: false, follow: false } };
const statuses = { PENDING: "미처리", RESOLVED: "처리됨", DISMISSED: "기각됨" } as const;
const reasons = { SPAM:"스팸/도배",ABUSE:"욕설/괴롭힘",MISINFORMATION:"잘못된 정보",COPYRIGHT:"저작권 침해",OTHER:"기타" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isFrontendOnly()) return <div className={styles.page}><FrontendPreviewNotice heading="관리자 기능 미리보기" description="관리자 신고 관리 기능은 로컬 개발 환경에서 확인할 수 있습니다." /></div>;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const [session, query] = await Promise.all([headers().then((value) => auth.api.getSession({ headers: value })), searchParams]);
  if (!session) redirect("/profile");
  if (!hasCommunityCapability(session.user.role, "viewReports")) forbidden();
  const status = typeof query.status === "string" && query.status in statuses ? query.status as keyof typeof statuses : "PENDING";
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined;
  const reports = await prisma.guideReport.findMany({
    where: { status }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: GUIDE_REPORT_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id:true, reason:true, createdAt:true, reporter:{select:{name:true}}, post:{select:{title:true,body:true,author:{select:{name:true}}}}, comment:{select:{body:true,author:{select:{name:true}}}} },
  });
  const next = reports.length > GUIDE_REPORT_PAGE_SIZE ? reports[GUIDE_REPORT_PAGE_SIZE - 1]?.id : null;
  const visible = reports.slice(0, GUIDE_REPORT_PAGE_SIZE);
  return <div className={styles.page}><header className={styles.hero}><p className={styles.eyebrow}>COMMUNITY MODERATION</p><h1>신고 관리</h1><p>신고를 검토하고 처리 상태를 기록합니다.</p></header><nav className={styles.filters} aria-label="신고 상태 필터">{Object.entries(statuses).map(([key,label])=><Link key={key} className={status===key?styles.active:undefined} href={`/admin?status=${key}`}>{label}</Link>)}</nav>{visible.length?<ol className={styles.list}>{visible.map((report)=>{const post=report.post;const comment=report.comment;const preview=post?communityDocumentPreview(post.body):comment?.body??"";const author=post?.author?.name??comment?.author?.name??"탈퇴한 사용자";return <li key={report.id}><Link href={`/admin/reports/${report.id}`}><span className={styles.badge}>{post?"게시글":"댓글"} · {reasons[report.reason]}</span><span className={styles.summary}><strong>{post?.title??preview.slice(0,60)??"삭제된 대상"}</strong><span>{preview||"미리보기 없음"}</span></span><span className={styles.meta}>신고 {report.reporter?.name??"탈퇴한 사용자"}<br/>작성 {author}<br/>{report.createdAt.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</span></Link></li>})}</ol>:<section className={styles.card}><p>이 상태의 신고가 없습니다.</p></section>}{next?<Link className={styles.pager} href={`/admin?status=${status}&cursor=${encodeURIComponent(next)}`}>다음 신고 보기</Link>:null}</div>;
}
