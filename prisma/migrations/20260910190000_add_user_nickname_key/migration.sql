-- Existing OAuth display names remain untouched. The key is populated only
-- after a user explicitly saves a validated wiki nickname.
ALTER TABLE "user" ADD COLUMN "nicknameKey" TEXT;

CREATE UNIQUE INDEX "user_nicknameKey_key" ON "user"("nicknameKey");
