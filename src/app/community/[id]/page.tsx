import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { FrontendPreviewNotice } from "@/components/FrontendPreviewNotice";
import { CommunityPostActions } from "@/components/CommunityPostActions";
import { CommunityEngagement } from "@/components/CommunityEngagement";
import { CommentSection } from "@/components/CommentSection";
import { CommunityRichText } from "@/components/CommunityRichText";
import { CommunityViewCount } from "@/components/CommunityViewCount";
import { ReportDialog } from "@/components/ReportDialog";
import { formatCommunityPostTime, type CommunityDocument } from "@/lib/guide-community";
import { isFrontendOnly } from "@/lib/runtime-mode";
import styles from "../community.module.css";

export function generateMetadata(): Metadata {
  return isFrontendOnly() ? { title: "게시글 상세 미리보기", robots: { index: false, follow: false } } : {};
}

export default async function CommunityDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (isFrontendOnly()) return <article className={styles.page}><Link href="/community">← 목록으로</Link><FrontendPreviewNotice heading="게시글 상세 미리보기" description="게시글 상세 데이터는 로컬 개발 환경에서 확인할 수 있습니다." /></article>;
  const [{ auth }, { prisma }] = await Promise.all([import("@/lib/auth"), import("@/lib/prisma")]);
  const [{ id }, query, session] = await Promise.all([params, searchParams, headers().then((value) => auth.api.getSession({ headers: value }))]);
  const commentCursor = typeof query.commentsCursor === "string" ? query.commentsCursor : undefined;
  const post = await prisma.guidePost.findFirst({ where: { id, deletedAt: null }, select: { id: true, authorId: true, author: { select: { name: true } }, title: true, category: true, body: true, createdAt: true, updatedAt: true, viewCount: true, likeCount: true, commentCount: true } });
  if (!post) notFound();
  const viewerId = session?.user.id ?? "__anonymous__";
  const [interaction, commentRows] = await Promise.all([session ? Promise.all([
    prisma.guidePostLike.findUnique({ where: { userId_postId: { userId: session.user.id, postId: id } }, select: { userId: true } }),
    prisma.guidePostFavorite.findUnique({ where: { userId_postId: { userId: session.user.id, postId: id } }, select: { userId: true } }),
    prisma.guideReadingProgress.findUnique({ where: { userId_postId: { userId: session.user.id, postId: id } }, select: { progress: true } }),
  ]) : Promise.resolve([null, null, null] as const), prisma.guideComment.findMany({ where: { postId: id, parentId: null, OR: [{ deletedAt: null }, { replies: { some: { deletedAt: null } } }] }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 21, ...(commentCursor ? { cursor: { id: commentCursor }, skip: 1 } : {}), select: { id: true, authorId: true, body: true, createdAt: true, updatedAt: true, deletedAt: true, likeCount: true, author: { select: { name: true, image: true } }, likes: { where: { userId: viewerId }, take: 1, select: { userId: true } }, replies: { where: { deletedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, authorId: true, body: true, createdAt: true, updatedAt: true, deletedAt: true, likeCount: true, author: { select: { name: true, image: true } }, likes: { where: { userId: viewerId }, take: 1, select: { userId: true } } } } } })]);
  const nextCursor = commentRows.length > 20 ? commentRows[19]?.id ?? null : null;
  const serialize = (comment: typeof commentRows[number]["replies"][number]) => ({ id: comment.id, authorId: comment.deletedAt ? null : comment.authorId, author: comment.deletedAt ? null : comment.author, body: comment.deletedAt ? "" : comment.body, deleted: Boolean(comment.deletedAt), edited: !comment.deletedAt && comment.updatedAt.getTime() > comment.createdAt.getTime() + 1_000, createdLabel: formatCommunityPostTime(comment.createdAt), likeCount: comment.likeCount, liked: comment.likes.length > 0 });
  const comments = commentRows.slice(0, 20).map((comment) => ({ ...serialize(comment), replies: comment.replies.map(serialize) }));
  const mine = session?.user.id === post.authorId;
  return <article className={styles.page}><Link href="/community">← 목록으로</Link><header className={styles.header}><div><p>{post.category === "GUIDE" ? "공략" : "팁"}</p><h1>{post.title}</h1><div className={styles.meta}><span>{post.author?.name ?? "탈퇴한 사용자"}</span><time dateTime={post.createdAt.toISOString()}>작성 {formatCommunityPostTime(post.createdAt)}</time><time dateTime={post.updatedAt.toISOString()}>수정 {formatCommunityPostTime(post.updatedAt)}</time><CommunityViewCount postId={post.id} initialViewCount={post.viewCount} /></div></div><div className={styles.headerActions}>{mine ? <CommunityPostActions id={post.id} /> : session ? <ReportDialog endpoint={`/api/community/posts/${post.id}/report`} label="게시글 신고" /> : null}</div></header><section className={styles.bodyCard} aria-label="게시글 본문"><CommunityRichText document={post.body as unknown as CommunityDocument} /><CommunityEngagement postId={post.id} isAuthenticated={Boolean(session)} isOwnPost={mine} initialLiked={Boolean(interaction[0])} initialFavorite={Boolean(interaction[1])} initialProgress={interaction[2]?.progress ?? null} initialLikeCount={post.likeCount} /></section><CommentSection postId={post.id} isAuthenticated={Boolean(session)} userId={session?.user.id ?? null} totalCount={post.commentCount} comments={comments} nextCursor={nextCursor} /></article>;
}
