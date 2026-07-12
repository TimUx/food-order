-- AuthTokenType: Passwort-Reset
ALTER TYPE "AuthTokenType" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';

-- Mandanten-Benutzer: Benutzername, optionale E-Mail, Anmeldemethoden
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "magic_link_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "User" SET "password_enabled" = true WHERE "password_hash" IS NOT NULL;
UPDATE "User" SET "magic_link_enabled" = true WHERE "email" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_tenant_id_username_key" ON "User"("tenant_id", "username");

-- Plattform-Benutzer: Benutzername, optionales Passwort, Anmeldemethoden
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "platform_users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "password_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "magic_link_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "platform_users" SET "password_enabled" = true WHERE "password_hash" IS NOT NULL;
UPDATE "platform_users" SET "magic_link_enabled" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_users_username_key" ON "platform_users"("username");

-- Plattform-Login-Tokens (Magic Link, Passwort-Reset)
CREATE TABLE IF NOT EXISTS "platform_auth_login_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "type" "AuthTokenType" NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_auth_login_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_auth_login_tokens_token_hash_key" ON "platform_auth_login_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "platform_auth_login_tokens_user_id_idx" ON "platform_auth_login_tokens"("user_id");

DO $$ BEGIN
  ALTER TABLE "platform_auth_login_tokens"
    ADD CONSTRAINT "platform_auth_login_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
