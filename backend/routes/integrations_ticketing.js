// ============================================================
// NEEDS-CREDS — Ticketing connectors (Jira / ServiceNow / PagerDuty).
// 503 stubs until vendor API tokens / OAuth creds are provisioned.
// Surface contract is stable: push (create from incident) + pull (sync).
// ============================================================
const express = require('express');
const router = express.Router();

function ticketStub(vendor, envKey, direction) {
  return (req, res) => {
    const token = process.env[envKey];
    if (!token) {
      return res.status(503).json({
        error: `${vendor} ${direction} not configured`,
        reason: `${envKey} env var not set`,
        vendor,
        direction,
        next_step: `Provision ${envKey} in the deployment env, then this route will be live.`,
      });
    }
    // Creds present but downstream call deliberately not implemented in stub mode.
    return res.status(503).json({
      error: `${vendor} ${direction} live call not implemented in stub mode`,
      vendor,
      direction,
      received: { keys: Object.keys(req.body || {}), id: req.params.id || null },
    });
  };
}

// Jira
router.post('/jira/push',     ticketStub('jira',       'JIRA_API_TOKEN',       'push'));
router.get('/jira/pull/:id',  ticketStub('jira',       'JIRA_API_TOKEN',       'pull'));

// ServiceNow
router.post('/servicenow/push',    ticketStub('servicenow', 'SERVICENOW_API_TOKEN', 'push'));
router.get('/servicenow/pull/:id', ticketStub('servicenow', 'SERVICENOW_API_TOKEN', 'pull'));

// PagerDuty
router.post('/pagerduty/push',     ticketStub('pagerduty',  'PAGERDUTY_API_TOKEN',  'push'));
router.get('/pagerduty/pull/:id',  ticketStub('pagerduty',  'PAGERDUTY_API_TOKEN',  'pull'));

// Status
router.get('/status', (_req, res) => {
  res.json({
    jira:       { configured: !!process.env.JIRA_API_TOKEN,       push: '/api/integrations/ticketing/jira/push',       pull: '/api/integrations/ticketing/jira/pull/:id' },
    servicenow: { configured: !!process.env.SERVICENOW_API_TOKEN, push: '/api/integrations/ticketing/servicenow/push', pull: '/api/integrations/ticketing/servicenow/pull/:id' },
    pagerduty:  { configured: !!process.env.PAGERDUTY_API_TOKEN,  push: '/api/integrations/ticketing/pagerduty/push',  pull: '/api/integrations/ticketing/pagerduty/pull/:id' },
  });
});

module.exports = router;
