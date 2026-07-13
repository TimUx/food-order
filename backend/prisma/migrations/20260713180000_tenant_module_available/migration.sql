-- Modul-Freigabe pro Mandant (Plattform-Admin steuert verfügbare Module)
ALTER TABLE "modules" ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT false;

-- Bestehende Mandanten: bisherige Modul-Zeilen bleiben nutzbar
UPDATE "modules" SET "available" = true;
