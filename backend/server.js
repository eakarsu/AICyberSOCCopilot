const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Fallback: load OpenRouter creds from canonical source if not present
if (!process.env.OPENROUTER_API_KEY) {
  try {
    const fs = require('fs');
    const canonPath = '/Users/erolakarsu/projects/beauty-wellness-ai/.env';
    if (fs.existsSync(canonPath)) {
      const content = fs.readFileSync(canonPath, 'utf8');
      const keyMatch = content.match(/^OPENROUTER_API_KEY=(.*)$/m);
      const modelMatch = content.match(/^OPENROUTER_MODEL=(.*)$/m);
      if (keyMatch) process.env.OPENROUTER_API_KEY = keyMatch[1].replace(/^"|"$/g, '').trim();
      if (modelMatch && !process.env.OPENROUTER_MODEL) {
        process.env.OPENROUTER_MODEL = modelMatch[1].replace(/^"|"$/g, '').trim();
      }
    }
  } catch (e) {
    console.warn('[openrouter-fallback] could not load canonical creds:', e.message);
  }
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Public health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', require('./routes/auth'));

// All API routes below this line require a valid JWT
const { authenticateToken, rbacEnforce } = require('./middleware/auth');

// Mount-style middleware that requires JWT and enforces RBAC on writes.
const guard = [authenticateToken, rbacEnforce];

// ---------- Original CRUD (8) ----------
app.use('/api/alerts',             guard, require('./routes/alerts'));
app.use('/api/incidents',          guard, require('./routes/incidents'));
app.use('/api/assets',             guard, require('./routes/assets'));
app.use('/api/playbooks',          guard, require('./routes/playbooks'));
app.use('/api/iocs',               guard, require('./routes/iocs'));
app.use('/api/threat-intel-feed',  guard, require('./routes/threat_intel_feed'));
app.use('/api/shift-roster',       guard, require('./routes/shift_roster'));
app.use('/api/audit-log',          guard, require('./routes/audit_log'));

// ---------- New CRUD (10) ----------
app.use('/api/vulnerabilities',    guard, require('./routes/vulnerabilities'));
app.use('/api/exceptions',         guard, require('./routes/exceptions'));
app.use('/api/change-requests',    guard, require('./routes/change_requests'));
app.use('/api/vendor-risk',        guard, require('./routes/vendor_risk'));
app.use('/api/certificates',       guard, require('./routes/certificates'));
app.use('/api/secrets-vault',      guard, require('./routes/secrets_vault'));
app.use('/api/runbooks',           guard, require('./routes/runbooks'));
app.use('/api/evidence-library',   guard, require('./routes/evidence_library'));
app.use('/api/allowlists',         guard, require('./routes/allowlists'));
app.use('/api/blocklists',         guard, require('./routes/blocklists'));

// ---------- AI ----------
app.use('/api/ai',                 authenticateToken, require('./routes/ai'));

// ---------- Dashboard ----------
app.use('/api/dashboard',          authenticateToken, require('./routes/dashboard'));

// ---------- Cross-cutting ----------
app.use('/api/notifications',      authenticateToken, require('./routes/notifications'));
app.use('/api/webhooks',           authenticateToken, require('./routes/webhooks'));

// ---------- Custom SOC Views (2 VIZ + 2 NON-VIZ) ----------
// Mounted BEFORE the catch-all attachments router & 404 handler.
app.use('/api/custom-views',       authenticateToken, require('./routes/customViews'));

// ---------- Pass 7: On-call escalation engine ----------
app.use('/api/oncall',             authenticateToken, require('./routes/oncall_escalations'));

// ---------- Pass 7: NEEDS-CREDS vendor integration surfaces ----------
// SIEM/EDR ingest (Splunk HEC, Sentinel, CrowdStrike, SentinelOne)
app.use('/api/integrations/siem',      authenticateToken, require('./routes/integrations_siem'));
// Ticketing connectors (Jira, ServiceNow, PagerDuty)
app.use('/api/integrations/ticketing', authenticateToken, require('./routes/integrations_ticketing'));

// Attachments router exposes /upload AND /attachments/... so we mount at root.
app.use('/api',                    authenticateToken, require('./routes/attachments'));

// 404 for any unmatched /api/* path
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.listen(PORT, () => {
  console.log(`\nAI CyberSOC Copilot API running on http://localhost:${PORT}\n`);
});
