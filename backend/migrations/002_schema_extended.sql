-- ============================================================
-- AICyberSOCCopilot - Extended Schema Migration
-- 002_schema_extended.sql
-- Adds: 10 new CRUD entities + RBAC + notifications + uploads +
-- webhooks + webhook deliveries
-- ============================================================

-- ---------- RBAC users ----------
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  name         VARCHAR(255),
  role         VARCHAR(32) DEFAULT 'viewer', -- admin | analyst | viewer
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- In-app notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER, -- nullable = broadcast to all
  type         VARCHAR(64),
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  read         BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read, created_at DESC);

-- ---------- File attachments ----------
CREATE TABLE IF NOT EXISTS attachments (
  id               SERIAL PRIMARY KEY,
  owner_collection VARCHAR(64) NOT NULL,
  owner_id         VARCHAR(64) NOT NULL,
  filename         VARCHAR(255) NOT NULL,
  mime             VARCHAR(100),
  size             INTEGER,
  uploaded_by      VARCHAR(255),
  path             VARCHAR(500),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments (owner_collection, owner_id);

-- ---------- Webhooks ----------
CREATE TABLE IF NOT EXISTS webhooks (
  id           SERIAL PRIMARY KEY,
  url          VARCHAR(500) NOT NULL,
  event_types  TEXT[] DEFAULT ARRAY[]::TEXT[],
  secret       VARCHAR(255),
  status       VARCHAR(32) DEFAULT 'active', -- active | paused
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id             SERIAL PRIMARY KEY,
  webhook_id     INTEGER,
  event_type     VARCHAR(64),
  payload        JSONB,
  status_code    INTEGER,
  response_body  TEXT,
  delivered_at   TIMESTAMPTZ DEFAULT NOW(),
  success        BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_wh ON webhook_deliveries (webhook_id, delivered_at DESC);

-- ============================================================
-- 10 NEW CRUD ENTITIES
-- ============================================================

-- 1. Vulnerabilities
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id              SERIAL PRIMARY KEY,
  cve             VARCHAR(64) UNIQUE NOT NULL,
  cvss            NUMERIC(3,1),
  asset           VARCHAR(255),
  status          VARCHAR(32) DEFAULT 'open', -- open | patching | mitigated | accepted
  discovered_at   TIMESTAMPTZ DEFAULT NOW(),
  patch_eta       TIMESTAMPTZ
);

-- 2. Exceptions
CREATE TABLE IF NOT EXISTS exceptions (
  id              SERIAL PRIMARY KEY,
  exception_id    VARCHAR(64) UNIQUE NOT NULL,
  control         VARCHAR(255),
  owner           VARCHAR(255),
  justification   TEXT,
  expires_at      TIMESTAMPTZ,
  status          VARCHAR(32) DEFAULT 'active' -- active | expired
);

-- 3. Change requests
CREATE TABLE IF NOT EXISTS change_requests (
  id              SERIAL PRIMARY KEY,
  cr_id           VARCHAR(64) UNIQUE NOT NULL,
  summary         VARCHAR(500),
  requester       VARCHAR(255),
  risk            VARCHAR(20) DEFAULT 'low', -- low | medium | high
  status          VARCHAR(32) DEFAULT 'submitted', -- submitted | approved | implemented
  approved_by     VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vendor risk
CREATE TABLE IF NOT EXISTS vendor_risk (
  id              SERIAL PRIMARY KEY,
  vendor_id       VARCHAR(64) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  tier            VARCHAR(20),
  soc2            BOOLEAN DEFAULT FALSE,
  last_review     TIMESTAMPTZ,
  risk_score      INTEGER DEFAULT 50,
  status          VARCHAR(32) DEFAULT 'active'
);

-- 5. Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id              SERIAL PRIMARY KEY,
  cert_id         VARCHAR(64) UNIQUE NOT NULL,
  common_name     VARCHAR(255) NOT NULL,
  issuer          VARCHAR(255),
  expires_at      TIMESTAMPTZ,
  status          VARCHAR(32) DEFAULT 'active', -- active | expiring | expired
  owner           VARCHAR(255)
);

-- 6. Secrets vault
CREATE TABLE IF NOT EXISTS secrets_vault (
  id              SERIAL PRIMARY KEY,
  secret_id       VARCHAR(64) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  scope           VARCHAR(255),
  owner           VARCHAR(255),
  last_rotated    TIMESTAMPTZ,
  rotation_due    TIMESTAMPTZ,
  used_by         VARCHAR(255)
);

-- 7. Runbooks
CREATE TABLE IF NOT EXISTS runbooks (
  id              SERIAL PRIMARY KEY,
  runbook_id      VARCHAR(64) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  scenario        VARCHAR(255),
  last_drill      TIMESTAMPTZ,
  owner           VARCHAR(255),
  status          VARCHAR(32) DEFAULT 'active' -- active | draft | retired
);

-- 8. Evidence library
CREATE TABLE IF NOT EXISTS evidence_library (
  id              SERIAL PRIMARY KEY,
  evidence_id     VARCHAR(64) UNIQUE NOT NULL,
  control         VARCHAR(255),
  type            VARCHAR(32), -- screenshot | log | report | cert
  collected_at    TIMESTAMPTZ DEFAULT NOW(),
  collected_by    VARCHAR(255),
  valid_until     TIMESTAMPTZ
);

-- 9. Allowlists
CREATE TABLE IF NOT EXISTS allowlists (
  id              SERIAL PRIMARY KEY,
  entry_id        VARCHAR(64) UNIQUE NOT NULL,
  type            VARCHAR(20), -- ip | domain | hash
  value           VARCHAR(500),
  scope           VARCHAR(255),
  justification   TEXT,
  added_by        VARCHAR(255),
  expires_at      TIMESTAMPTZ
);

-- 10. Blocklists
CREATE TABLE IF NOT EXISTS blocklists (
  id              SERIAL PRIMARY KEY,
  entry_id        VARCHAR(64) UNIQUE NOT NULL,
  type            VARCHAR(20), -- ip | domain | hash
  value           VARCHAR(500),
  source          VARCHAR(255),
  severity        VARCHAR(20),
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(32) DEFAULT 'active' -- active | expired
);
