-- Tenant role templates: per-user permissions (idempotent for db-push → migrate upgrades)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_template" TEXT;

-- Migrate existing STAFF users: copy global STAFF role permissions or default Küche template
UPDATE "User" u
SET
  permissions = CASE
    WHEN r.name = 'STAFF' AND jsonb_array_length(COALESCE(r.permissions::jsonb, '[]'::jsonb)) > 0
      THEN r.permissions::jsonb
    WHEN r.name = 'STAFF'
      THEN '["orders.view","orders.kitchen","printer.print"]'::jsonb
    ELSE u.permissions
  END,
  role_template = CASE
    WHEN r.name = 'STAFF' AND u.role_template IS NULL THEN 'kueche'
    ELSE u.role_template
  END
FROM "Role" r
WHERE u."roleId" = r.id
  AND r.name = 'STAFF'
  AND (
    u.role_template IS NULL
    OR u.permissions = '[]'::jsonb
  );
