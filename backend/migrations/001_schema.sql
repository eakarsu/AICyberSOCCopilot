-- ============================================================
-- AICyberSOCCopilot - Full Schema Migration
-- 001_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
  id           SERIAL PRIMARY KEY,
  alert_id     VARCHAR(64) UNIQUE NOT NULL,
  source       VARCHAR(100),
  severity     VARCHAR(20) DEFAULT 'medium',
  title        VARCHAR(500) NOT NULL,
  status       VARCHAR(50) DEFAULT 'open',
  asset        VARCHAR(255),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id                   SERIAL PRIMARY KEY,
  incident_id          VARCHAR(64) UNIQUE NOT NULL,
  title                VARCHAR(500) NOT NULL,
  severity             VARCHAR(20) DEFAULT 'medium',
  status               VARCHAR(50) DEFAULT 'open',
  assignee             VARCHAR(255),
  opened_at            TIMESTAMPTZ DEFAULT NOW(),
  sla_breach_in_min    INTEGER
);

CREATE TABLE IF NOT EXISTS assets (
  id          SERIAL PRIMARY KEY,
  asset_id    VARCHAR(64) UNIQUE NOT NULL,
  hostname    VARCHAR(255) NOT NULL,
  ip          VARCHAR(64),
  os          VARCHAR(100),
  owner       VARCHAR(255),
  criticality VARCHAR(20) DEFAULT 'medium',
  last_seen   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playbooks (
  id             SERIAL PRIMARY KEY,
  playbook_id    VARCHAR(64) UNIQUE NOT NULL,
  name           VARCHAR(255) NOT NULL,
  trigger        VARCHAR(255),
  steps_count    INTEGER DEFAULT 0,
  owner          VARCHAR(255),
  last_run       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS iocs (
  id          SERIAL PRIMARY KEY,
  ioc_id      VARCHAR(64) UNIQUE NOT NULL,
  type        VARCHAR(50),
  value       VARCHAR(500) NOT NULL,
  source      VARCHAR(255),
  confidence  NUMERIC(3,2) DEFAULT 0.5,
  first_seen  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threat_intel_feed (
  id            SERIAL PRIMARY KEY,
  feed_id       VARCHAR(64) UNIQUE NOT NULL,
  source        VARCHAR(255),
  indicator     VARCHAR(500),
  threat_actor  VARCHAR(255),
  ttp           VARCHAR(255),
  observed_at   TIMESTAMPTZ DEFAULT NOW(),
  severity      VARCHAR(20) DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS shift_roster (
  id            SERIAL PRIMARY KEY,
  entry_id      VARCHAR(64) UNIQUE NOT NULL,
  analyst       VARCHAR(255) NOT NULL,
  shift         VARCHAR(50),
  day_of_week   VARCHAR(20),
  on_call       BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  log_id     VARCHAR(64) UNIQUE NOT NULL,
  actor      VARCHAR(255),
  action     VARCHAR(255),
  target     VARCHAR(255),
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  result     VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ai_results (
  id          SERIAL PRIMARY KEY,
  feature     VARCHAR(64) NOT NULL,
  input       JSONB,
  result      JSONB,
  created_by  VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature_created
  ON ai_results (feature, created_at DESC);
