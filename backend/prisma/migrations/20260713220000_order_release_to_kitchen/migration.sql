-- Add explicit kitchen-release state on orders.
ALTER TABLE "Order"
  ADD COLUMN "released_to_kitchen" BOOLEAN NOT NULL DEFAULT false;

-- Vor-Ort Bestellungen sind sofort freigegeben.
UPDATE "Order"
SET "released_to_kitchen" = true
WHERE "source"::text = 'CASHIER';

-- Bereits durch Zahlung freigegebene Online-Bestellungen übernehmen (falls Payment-Modul-Tabelle vorhanden).
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    UPDATE "Order" o
    SET "released_to_kitchen" = true
    WHERE EXISTS (
      SELECT 1
      FROM payments p
      WHERE p.tenant_id = o.tenant_id
        AND p.resource_type = 'order'
        AND p.resource_id = o.id
        AND p.released_to_kitchen = true
    );
  END IF;
END $$;

