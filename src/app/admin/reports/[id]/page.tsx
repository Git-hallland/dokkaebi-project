import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import { ReportModerationActions } from "@/components/ReportModerationActions";
import { auth } from "@/lib/auth";
import { communityDocumentPreview, hasCommunityCapability } from "@/lib/community-reports";
import { prisma } from "@/lib/prisma";
import styles from "../../admin.module.css";

const reasonLabels = { SPAM:"스팸/도배",ABUSE:"욕설/괴롭힘",MISINFORMATION:"잘못된 정보",COPYRIGHT:"저작권 침해",OTHER:"기타" } as const;
const statusLabels = { PENDING:"미처리",RESOLVED:"처리됨",DISMISSED:"기각됨" } as const;

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session,{id}] = await Promise.all([headers().then((value)=>auth.api.getSession({headers:value})),params]);
  if(!session) redirect("/profile");
  if(!hasCommunityCapability(session.user.role,"viewReports")) forbidden();
  const report=await prisma.guideReport.findUnique({where:{id},select:{id:true,reason:true,description:true,status:true,createdAt:true,resolvedAt:true,resolution:true,reporter:{select:{name:true}},resolvedBy:{select:{name:true}},post:{select:{id:true,title:true,body:true,deletedAt:true,author:{select:{name:true}}}},comment:{select:{id:true,postId:true,body:true,deletedAt:true,author:{select:{name:true}},post:{select:{deletedAt:true}}}}}});
  if(!report) notFound();
  const targetAuthor=report.post?.author?.name??report.comment?.author?.name??"탈퇴한 사용자";
  const targetPreview=report.post?communityDocumentPreview(report.post.body):report.comment?.body??"대상을 찾을 수 없습니다.";
  const targetHref=report.post?`/community/${report.post.id}`:report.comment?`/community/${report.comment.postId}#comment-${report.comment.id}`:null;
  const targetDeleted=Boolean(report.post?.deletedAt||report.comment?.deletedAt||report.comment?.post.deletedAt);
  return <div className={styles.page}><Link className={styles.back} href="/admin">← 신고 목록</Link><header className={styles.hero}><p className={styles.eyebrow}>REPORT DETAIL</p><h1>{report.post?report.post.title:"댓글 신고"}</h1><p>{statusLabels[report.status]}</p></header><section className={styles.card}><dl className={styles.detailGrid}><div><dt>신고 사유</dt><dd>{reasonLabels[report.reason]}</dd></div><div><dt>신고자</dt><dd>{report.reporter?.name??"탈퇴한 사용자"}</dd></div><div><dt>신고 일시</dt><dd>{report.createdAt.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</dd></div><div><dt>대상 작성자</dt><dd>{targetAuthor}</dd></div><div><dt>대상 상태</dt><dd>{targetDeleted?"숨김/삭제됨":"공개 중"}</dd></div><div><dt>대상 종류</dt><dd>{report.post?"게시글":"댓글"}</dd></div></dl><h2>신고 설명</h2><p className={styles.target}>{report.description??"추가 설명 없음"}</p><h2>대상 미리보기</h2><p className={styles.target}>{targetPreview||"본문 미리보기 없음"}</p>{targetHref&&!targetDeleted?<Link className={styles.back} href={targetHref}>원문 열기</Link>:null}{report.status!=="PENDING"?<><h2>처리 이력</h2><p>{report.resolvedBy?.name??"탈퇴한 관리자"} · {report.resolvedAt?.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}<br/>{report.resolution??"처리 메모 없음"}</p></>:null}</section>{report.status==="PENDING"&&hasCommunityCapability(session.user.role,"resolveReports")?<ReportModerationActions reportId={report.id} canModerate={hasCommunityCapability(session.user.role,"moderateCommunity")}/>:null}</div>;
}
