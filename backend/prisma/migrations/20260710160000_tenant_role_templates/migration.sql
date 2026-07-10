-- Tenant role templates: per-user permissions
ALTER TABLE "User" ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN "role_template" TEXT;

-- Migrate existing STAFF users: copy global STAFF role permissions or default Küche template
UPDATE "User" u
SET
  permissions = CASE
    WHEN r.name = 'STAFF' AND jsonb_array_length(COALESCE(r.permissions::jsonb, '[]'::jsonb)) > 0
      THEN r.permissions::jsonb
    WHEN r.name = 'STAFF'
      THEN '["orders.view","orders.kitchen","printer.print"]'::jsonb
    ELSE '[]'::jsonb
  END,
  role_template = CASE WHEN r.name = 'STAFF' THEN 'kueche' ELSE NULL END
FROM "Role" r
WHERE u."roleId" = r.id;
