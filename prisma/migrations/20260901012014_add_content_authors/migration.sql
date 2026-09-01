-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "ContentRevision" ADD COLUMN     "authorId" TEXT;

-- CreateIndex
CREATE INDEX "Content_authorId_idx" ON "Content"("authorId");

-- CreateIndex
CREATE INDEX "ContentRevision_authorId_changedAt_idx" ON "ContentRevision"("authorId", "changedAt");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
