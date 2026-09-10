CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "guideWriteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rightAdEnabled" BOOLEAN NOT NULL DEFAULT false,
    "footerAdEnabled" BOOLEAN NOT NULL DEFAULT false,
    "footerStickyAdEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteSetting" (
    "id",
    "guideWriteEnabled",
    "rightAdEnabled",
    "footerAdEnabled",
    "footerStickyAdEnabled",
    "updatedAt"
)
VALUES ('site', false, false, false, false, CURRENT_TIMESTAMP);
