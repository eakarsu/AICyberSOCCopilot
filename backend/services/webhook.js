const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const pool = require('../config/database');

function deliverOnce(url, payload, secret) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (_) { return resolve({ status_code: 0, body: 'invalid url', success: false }); }
    const data = JSON.stringify(payload);
    const sig = secret
      ? crypto.createHmac('sha256', secret).update(data).digest('hex')
      : '';

    const opts = {
      method: 'POST',
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-AICyberSOC-Signature': `sha256=${sig}`,
        'User-Agent': 'AI-CyberSOC-Copilot/1.0',
      },
    };

    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({
        status_code: res.statusCode || 0,
        body: body.slice(0, 1000),
        success: res.statusCode >= 200 && res.statusCode < 300,
      }));
    });
    req.on('error', (err) => resolve({ status_code: 0, body: err.message, success: false }));
    req.write(data);
    req.end();
  });
}

/**
 * Fire all webhooks subscribed to `eventType`. Best-effort, swallows errors.
 * Logs each delivery to webhook_deliveries.
 */
async function fireWebhooks(eventType, payload) {
  let rows = [];
  try {
    const r = await pool.query(
      `SELECT id, url, secret FROM webhooks
       WHERE status='active' AND ($1 = ANY(event_types) OR cardinality(event_types) = 0)`,
      [eventType]
    );
    rows = r.rows;
  } catch (e) {
    return; // table may not exist yet
  }

  for (const wh of rows) {
    const env = { event: eventType, payload, sent_at: new Date().toISOString() };
    const result = await deliverOnce(wh.url, env, wh.secret);
    try {
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status_code, response_body, success)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [wh.id, eventType, env, result.status_code, result.body, result.success]
      );
    } catch (_) { /* ignore */ }
  }
}

module.exports = { fireWebhooks, deliverOnce };
