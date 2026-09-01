import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { NotificationEntryLink } from "@/components/NotificationEntryLink";
import { NotificationReadAll } from "@/components/NotificationReadAll";
import { auth } from "@/lib/auth";
import { formatCommunityPostTime } from "@/lib/guide-community";
import { prisma } from "@/lib/prisma";
import styles from "../community/community.module.css";

export const metadata: Metadata = { title: "알림 | 도깨비의세계 비공식 위키", robots: { index: false, follow: false } };
const messages = { POST_LIKE: "회원님의 글을 좋아합니다.", POST_COMMENT: "회원님의 글에 댓글을 남겼습니다.", COMMENT_REPLY: "회원님의 댓글에 답글을 남겼습니다.", COMMENT_LIKE: "회원님의 댓글을 좋아합니다." } as const;
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [session, params] = await Promise.all([headers().then((value) => auth.api.getSession({ headers: value })), searchParams]);
  if (!session) return <div className={styles.empty}><h1>로그인이 필요합니다</h1><p>내 알림은 로그인 후 확인할 수 있습니다.</p><Link className={styles.write} href="/profile">로그인하러 가기</Link></div>;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const items = await prisma.guideNotification.findMany({ where: { recipientId: session.user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 26, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, type: true, postId: true, commentId: true, createdAt: true, readAt: true, actor: { select: { name: true, image: true } } } });
  const next = items.length > 25 ? items[24]?.id : null; const visible = items.slice(0,25); const unread = visible.some((item) => !item.readAt);
  return <div className={styles.page}><header className={styles.header}><div><p>NOTIFICATIONS</p><h1>알림</h1><span>내 글과 댓글에 새로 생긴 활동입니다.</span></div><NotificationReadAll disabled={!unread} /></header>{visible.length ? <div className={styles.list}>{visible.map((item) => { const actorName = item.actor?.name ?? "탈퇴한 사용자"; const anchor = item.commentId ? `#comment-${item.commentId}` : ""; return <NotificationEntryLink key={item.id} id={item.id} unread={!item.readAt} actorName={actorName} actorImage={item.actor?.image ?? null} message={`${actorName}님이 ${messages[item.type]}`} createdLabel={formatCommunityPostTime(item.createdAt)} href={item.postId ? `/community/${item.postId}${anchor}` : "/notifications"} />; })}</div> : <div className={styles.empty}><strong>새 알림이 없습니다.</strong></div>}{next ? <Link className={styles.next} href={`/notifications?cursor=${encodeURIComponent(next)}`}>다음 알림 보기</Link> : null}</div>;
}
