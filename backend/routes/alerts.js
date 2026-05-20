const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { alert_id, source, severity, title, status, asset } = req.body;
    const r = await pool.query(
      `INSERT INTO alerts (alert_id, source, severity, title, status, asset)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [alert_id || `ALR-${Date.now()}`, source, severity || 'medium', title, status || 'open', asset]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { source, severity, title, status, asset } = req.body;
    const r = await pool.query(
      `UPDATE alerts SET source=$1, severity=$2, title=$3, status=$4, asset=$5 WHERE id=$6 RETURNING *`,
      [source, severity, title, status, asset, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM alerts WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', alert: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'alerts', ['alert_id', 'source', 'severity', 'title', 'status', 'asset'], 'ALR');

module.exports = router;
