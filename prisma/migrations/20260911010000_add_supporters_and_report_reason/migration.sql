-- AddEnumValue
ALTER TYPE "GuideReportReason" ADD VALUE 'INAPPROPRIATE';

-- CreateTable
CREATE TABLE "Supporter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supporter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supporter_userId_key" ON "Supporter"("userId");

-- CreateIndex
CREATE INDEX "Supporter_isVisible_displayOrder_createdAt_idx" ON "Supporter"("isVisible", "displayOrder", "createdAt");

-- AddForeignKey
ALTER TABLE "Supporter" ADD CONSTRAINT "Supporter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
