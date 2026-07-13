-- Mehrere Rollenvorlagen pro Mitarbeiter
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_templates" JSONB NOT NULL DEFAULT '[]';

UPDATE "User"
SET role_templates = jsonb_build_array(role_template)
WHERE role_template IS NOT NULL
  AND role_templates = '[]'::jsonb;
