-- Governed tenant-scoped SOC case workflow. Apply explicitly with npm run migrate.
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

CREATE TABLE IF NOT EXISTS soc_cases (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  source_system VARCHAR(100) NOT NULL,
  source_event_id VARCHAR(200) NOT NULL,
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  observed_at TIMESTAMPTZ NOT NULL,
  asset_refs JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(40) NOT NULL,
  proposed_action JSONB,
  proposed_by VARCHAR(100),
  approved_by VARCHAR(100),
  external_result JSONB,
  failure_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_system, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_soc_cases_tenant_status ON soc_cases (tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS soc_case_evidence (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES soc_cases(id) ON DELETE RESTRICT,
  tenant_id VARCHAR(100) NOT NULL,
  source VARCHAR(150) NOT NULL,
  summary TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  classification VARCHAR(30) NOT NULL CHECK (classification IN ('public','internal','confidential','restricted')),
  observed_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soc_case_audit (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES soc_cases(id) ON DELETE RESTRICT,
  tenant_id VARCHAR(100) NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  actor_role VARCHAR(30) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  from_status VARCHAR(40),
  to_status VARCHAR(40),
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_soc_case_audit_case ON soc_case_audit (tenant_id, case_id, created_at);
