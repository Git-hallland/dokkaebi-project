ALTER TABLE "Content"
ADD COLUMN "iconImageUrl" TEXT,
ADD COLUMN "entityCategory" TEXT;

CREATE TABLE "SkillLevel" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillLevel_contentId_order_key" ON "SkillLevel"("contentId", "order");
CREATE INDEX "SkillLevel_contentId_order_idx" ON "SkillLevel"("contentId", "order");

ALTER TABLE "SkillLevel"
ADD CONSTRAINT "SkillLevel_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
