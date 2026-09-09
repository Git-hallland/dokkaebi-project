CREATE TYPE "EventStatus" AS ENUM ('ONGOING', 'ENDED');

ALTER TABLE "Content" ADD COLUMN "eventStatus" "EventStatus";
