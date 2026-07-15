-- Admin-Benachrichtigungen pro Mandant (opt-in per User-Profil)
ALTER TABLE "User" ADD COLUMN "notification_emails_enabled" BOOLEAN NOT NULL DEFAULT false;
