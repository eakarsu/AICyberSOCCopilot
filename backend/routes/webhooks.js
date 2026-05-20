const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');
const { fireWebhooks } = require('../services/webhook');
const { requireRole } = require('../middleware/auth');

// GET list
router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM webhooks ORDER BY id DESC LIMIT 100`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { url, event_types = [], status = 'active' } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });
    const secret = req.body.secret || crypto.randomBytes(16).toString('hex');
    const r = await pool.query(
      `INSERT INTO webhooks (url, event_types, secret, status)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [url, event_types, secret, status]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { url, event_types = [], status = 'active' } = req.body || {};
    const r = await pool.query(
      `UPDATE webhooks SET url=$1, event_types=$2, status=$3 WHERE id=$4 RETURNING *`,
      [url, event_types, status, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM webhooks WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', row: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET deliveries log
router.get('/deliveries', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const r = await pool.query(
      `SELECT * FROM webhook_deliveries ORDER BY delivered_at DESC LIMIT ${limit}`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /webhooks/test  -> fire a test event to all matching hooks
router.post('/test', requireRole('admin'), async (req, res) => {
  try {
    const evt = req.body?.event || 'test.ping';
    const payload = req.body?.payload || { source: 'manual', ts: new Date().toISOString() };
    await fireWebhooks(evt, payload);
    res.json({ ok: true, event: evt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
