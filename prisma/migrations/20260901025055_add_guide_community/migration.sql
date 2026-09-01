-- CreateEnum
CREATE TYPE "GuidePostCategory" AS ENUM ('GUIDE', 'TIP');

-- CreateEnum
CREATE TYPE "GuideNotificationType" AS ENUM ('POST_LIKE', 'POST_COMMENT', 'COMMENT_REPLY', 'COMMENT_LIKE');

-- CreateTable
CREATE TABLE "GuidePost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "category" "GuidePostCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GuidePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GuideComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidePostLike" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidePostLike_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "GuideCommentLike" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideCommentLike_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateTable
CREATE TABLE "GuidePostFavorite" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidePostFavorite_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "GuideReadingProgress" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideReadingProgress_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "GuidePostView" (
    "postId" TEXT NOT NULL,
    "viewerKeyHash" TEXT NOT NULL,
    "viewedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidePostView_pkey" PRIMARY KEY ("postId","viewerKeyHash","viewedOn")
);

-- CreateTable
CREATE TABLE "GuideNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "GuideNotificationType" NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "GuideNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuidePost_deletedAt_createdAt_idx" ON "GuidePost"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "GuidePost_deletedAt_likeCount_createdAt_idx" ON "GuidePost"("deletedAt", "likeCount", "createdAt");

-- CreateIndex
CREATE INDEX "GuidePost_authorId_createdAt_idx" ON "GuidePost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "GuideComment_postId_createdAt_idx" ON "GuideComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "GuideComment_parentId_createdAt_idx" ON "GuideComment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "GuidePostLike_postId_idx" ON "GuidePostLike"("postId");

-- CreateIndex
CREATE INDEX "GuideCommentLike_commentId_idx" ON "GuideCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "GuidePostFavorite_postId_idx" ON "GuidePostFavorite"("postId");

-- CreateIndex
CREATE INDEX "GuideReadingProgress_postId_idx" ON "GuideReadingProgress"("postId");

-- CreateIndex
CREATE INDEX "GuidePostView_postId_createdAt_idx" ON "GuidePostView"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuideNotification_dedupeKey_key" ON "GuideNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "GuideNotification_recipientId_createdAt_idx" ON "GuideNotification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "GuideNotification_recipientId_readAt_idx" ON "GuideNotification"("recipientId", "readAt");

-- AddForeignKey
ALTER TABLE "GuidePost" ADD CONSTRAINT "GuidePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideComment" ADD CONSTRAINT "GuideComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideComment" ADD CONSTRAINT "GuideComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideComment" ADD CONSTRAINT "GuideComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GuideComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePostLike" ADD CONSTRAINT "GuidePostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePostLike" ADD CONSTRAINT "GuidePostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCommentLike" ADD CONSTRAINT "GuideCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCommentLike" ADD CONSTRAINT "GuideCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "GuideComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePostFavorite" ADD CONSTRAINT "GuidePostFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePostFavorite" ADD CONSTRAINT "GuidePostFavorite_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideReadingProgress" ADD CONSTRAINT "GuideReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideReadingProgress" ADD CONSTRAINT "GuideReadingProgress_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePostView" ADD CONSTRAINT "GuidePostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideNotification" ADD CONSTRAINT "GuideNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideNotification" ADD CONSTRAINT "GuideNotification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideNotification" ADD CONSTRAINT "GuideNotification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideNotification" ADD CONSTRAINT "GuideNotification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "GuideComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
