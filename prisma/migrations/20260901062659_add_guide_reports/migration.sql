-- CreateEnum
CREATE TYPE "GuideReportReason" AS ENUM ('SPAM', 'ABUSE', 'MISINFORMATION', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "GuideReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "GuideReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "reason" "GuideReportReason" NOT NULL,
    "description" TEXT,
    "status" "GuideReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,

    CONSTRAINT "GuideReport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GuideReport_exactly_one_target" CHECK (num_nonnulls("postId", "commentId") = 1),
    CONSTRAINT "GuideReport_resolution_state" CHECK (
        ("status" = 'PENDING' AND "resolvedAt" IS NULL AND "resolvedById" IS NULL)
        OR
        ("status" IN ('RESOLVED', 'DISMISSED') AND "resolvedAt" IS NOT NULL)
    )
);

-- CreateIndex
CREATE INDEX "GuideReport_status_createdAt_idx" ON "GuideReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GuideReport_postId_idx" ON "GuideReport"("postId");

-- CreateIndex
CREATE INDEX "GuideReport_commentId_idx" ON "GuideReport"("commentId");

-- CreateIndex
CREATE INDEX "GuideReport_resolvedById_resolvedAt_idx" ON "GuideReport"("resolvedById", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuideReport_reporterId_postId_key" ON "GuideReport"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideReport_reporterId_commentId_key" ON "GuideReport"("reporterId", "commentId");

-- AddForeignKey
ALTER TABLE "GuideReport" ADD CONSTRAINT "GuideReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideReport" ADD CONSTRAINT "GuideReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideReport" ADD CONSTRAINT "GuideReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuidePost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideReport" ADD CONSTRAINT "GuideReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "GuideComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
