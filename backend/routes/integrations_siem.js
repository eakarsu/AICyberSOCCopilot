// ============================================================
// NEEDS-CREDS — SIEM/EDR vendor-shaped ingest endpoints.
// These are intentional 503 stubs: HMAC signature verification
// and persistence are wired up once vendor secrets/tokens are
// provided via env. Surface exists so frontends / vendor
// webhooks can be configured against stable URLs today.
// ============================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function vendorStub(vendor, signatureHeader) {
  return (req, res) => {
    const cfgKey = `${vendor.toUpperCase()}_HMAC_SECRET`;
    const secret = process.env[cfgKey];
    if (!secret) {
      return res.status(503).json({
        error: `${vendor} ingest not configured`,
        reason: `${cfgKey} env var not set`,
        vendor,
        signature_header_expected: signatureHeader,
        next_step: `Provision ${cfgKey} and the matching webhook secret in the ${vendor} portal.`,
      });
    }
    // If secret IS present, verify HMAC and record. (Stub path: still 503 until
    // ingestion table is provisioned; vendor's required schema differs per product.)
    const sig = req.get(signatureHeader);
    if (!sig) return res.status(401).json({ error: `missing ${signatureHeader} header`, vendor });
    const raw = JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (sig !== expected && sig !== `sha256=${expected}`) {
      return res.status(401).json({ error: 'HMAC signature mismatch', vendor });
    }
    return res.status(503).json({
      error: `${vendor} ingest persistence not yet implemented`,
      vendor,
      received_event_size: raw.length,
      note: 'Signature verified, but downstream normalization to internal alerts table is pending product decision.',
    });
  };
}

// Vendor surfaces — stable URLs the SOC can hand to vendor admins today
router.post('/splunk/hec',          vendorStub('splunk',        'X-Splunk-Signature'));
router.post('/sentinel/webhook',    vendorStub('sentinel',      'X-Sentinel-Signature'));
router.post('/crowdstrike/falcon',  vendorStub('crowdstrike',   'X-CS-Signature'));
router.post('/sentinelone/webhook', vendorStub('sentinelone',   'X-S1-Signature'));

// GET status — show which vendor surfaces are credentialed
router.get('/status', (_req, res) => {
  res.json({
    splunk:        { configured: !!process.env.SPLUNK_HMAC_SECRET,        url: '/api/integrations/siem/splunk/hec' },
    sentinel:      { configured: !!process.env.SENTINEL_HMAC_SECRET,      url: '/api/integrations/siem/sentinel/webhook' },
    crowdstrike:   { configured: !!process.env.CROWDSTRIKE_HMAC_SECRET,   url: '/api/integrations/siem/crowdstrike/falcon' },
    sentinelone:   { configured: !!process.env.SENTINELONE_HMAC_SECRET,   url: '/api/integrations/siem/sentinelone/webhook' },
  });
});

module.exports = router;
