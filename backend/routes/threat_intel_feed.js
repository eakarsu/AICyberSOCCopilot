const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM threat_intel_feed ORDER BY observed_at DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM threat_intel_feed WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { feed_id, source, indicator, threat_actor, ttp, severity } = req.body;
    const r = await pool.query(
      `INSERT INTO threat_intel_feed (feed_id, source, indicator, threat_actor, ttp, severity)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [feed_id || `TI-${Date.now()}`, source, indicator, threat_actor, ttp, severity || 'medium']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { source, indicator, threat_actor, ttp, severity } = req.body;
    const r = await pool.query(
      `UPDATE threat_intel_feed SET source=$1, indicator=$2, threat_actor=$3, ttp=$4, severity=$5 WHERE id=$6 RETURNING *`,
      [source, indicator, threat_actor, ttp, severity, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM threat_intel_feed WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', entry: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'threat_intel_feed', ['feed_id', 'source', 'indicator', 'threat_actor', 'ttp', 'severity'], 'TI');

module.exports = router;
