ALTER TABLE "Content"
ADD COLUMN "detailStatus" TEXT,
ADD COLUMN "entityMetadata" JSONB,
ADD COLUMN "entitySortOrder" INTEGER;

ALTER TABLE "Source"
ALTER COLUMN "url" DROP NOT NULL;
