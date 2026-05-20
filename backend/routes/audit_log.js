const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM audit_log WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { log_id, actor, action, target, result } = req.body;
    const r = await pool.query(
      `INSERT INTO audit_log (log_id, actor, action, target, result)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [log_id || `AUD-${Date.now()}`, actor, action, target, result || 'success']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { actor, action, target, result } = req.body;
    const r = await pool.query(
      `UPDATE audit_log SET actor=$1, action=$2, target=$3, result=$4 WHERE id=$5 RETURNING *`,
      [actor, action, target, result, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM audit_log WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', entry: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'audit_log', ['log_id', 'actor', 'action', 'target', 'result'], 'AUD');

module.exports = router;
