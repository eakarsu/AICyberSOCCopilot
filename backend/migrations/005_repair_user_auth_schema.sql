-- Repair databases that were reseeded after the governed auth migration was
-- recorded. The demo seeder previously recreated the legacy users table while
-- leaving schema_migrations untouched.
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
