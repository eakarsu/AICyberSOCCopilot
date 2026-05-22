-- ============================================================
-- AICyberSOCCopilot — Pass 7 migration
-- 003_pass7_oncall.sql
-- Adds on-call escalation engine tables on top of shift_roster.
-- (NEEDS-CREDS vendor stubs require no schema; AI verbs use the
--  existing ai_results table.)
-- ============================================================

-- Escalation policies: an ordered chain of analyst handles +
-- ack window. `chain` is JSONB so a step can be a single analyst
-- string or a structured { type:'group', members:[...] } object.
CREATE TABLE IF NOT EXISTS oncall_policies (
  id                  SERIAL PRIMARY KEY,
  policy_id           VARCHAR(64) UNIQUE NOT NULL,
  name                VARCHAR(255) NOT NULL,
  chain               JSONB DEFAULT '[]'::jsonb,
  ack_window_minutes  INTEGER DEFAULT 10,
  status              VARCHAR(32) DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- A single page event going through the escalation chain.
-- status: firing | acked | escalated | overridden | resolved
CREATE TABLE IF NOT EXISTS oncall_pages (
  id                SERIAL PRIMARY KEY,
  page_id           VARCHAR(64) UNIQUE NOT NULL,
  policy_id         VARCHAR(64),
  incident_id       VARCHAR(64),
  severity          VARCHAR(20) DEFAULT 'P2',
  message           TEXT,
  current_step      INTEGER DEFAULT 0,
  chain_snapshot    JSONB DEFAULT '[]'::jsonb,
  status            VARCHAR(32) DEFAULT 'firing',
  ack_deadline      TIMESTAMPTZ,
  acked_by          VARCHAR(255),
  acked_at          TIMESTAMPTZ,
  override_to       VARCHAR(255),
  override_reason   TEXT,
  overridden_by     VARCHAR(255),
  overridden_at     TIMESTAMPTZ,
  resolved_by       VARCHAR(255),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oncall_pages_status ON oncall_pages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oncall_pages_policy ON oncall_pages (policy_id, created_at DESC);
