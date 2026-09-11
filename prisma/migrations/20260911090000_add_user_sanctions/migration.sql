CREATE TYPE "UserSanctionType" AS ENUM ('POST_SUSPENSION', 'COMMENT_SUSPENSION', 'BAN');

CREATE TABLE "UserSanction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserSanctionType" NOT NULL,
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSanction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserSanction_userId_type_revokedAt_endsAt_idx"
ON "UserSanction"("userId", "type", "revokedAt", "endsAt");

CREATE INDEX "UserSanction_createdById_createdAt_idx"
ON "UserSanction"("createdById", "createdAt");

CREATE INDEX "UserSanction_revokedById_revokedAt_idx"
ON "UserSanction"("revokedById", "revokedAt");

ALTER TABLE "UserSanction"
ADD CONSTRAINT "UserSanction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSanction"
ADD CONSTRAINT "UserSanction_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserSanction"
ADD CONSTRAINT "UserSanction_revokedById_fkey"
FOREIGN KEY ("revokedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
