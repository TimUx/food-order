-- Stornierungsfrist: Einheit Stunden oder Tage wählbar
ALTER TABLE "tenant_settings" ADD COLUMN "cancellation_deadline_unit" TEXT NOT NULL DEFAULT 'hours';
ALTER TABLE "ClubSettings" ADD COLUMN "cancellationDeadlineUnit" TEXT NOT NULL DEFAULT 'hours';
