const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM incidents ORDER BY opened_at DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { incident_id, title, severity, status, assignee, sla_breach_in_min } = req.body;
    const r = await pool.query(
      `INSERT INTO incidents (incident_id, title, severity, status, assignee, sla_breach_in_min)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [incident_id || `INC-${Date.now()}`, title, severity || 'medium', status || 'open', assignee, sla_breach_in_min || 240]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, severity, status, assignee, sla_breach_in_min } = req.body;
    const r = await pool.query(
      `UPDATE incidents SET title=$1, severity=$2, status=$3, assignee=$4, sla_breach_in_min=$5 WHERE id=$6 RETURNING *`,
      [title, severity, status, assignee, sla_breach_in_min, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM incidents WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', incident: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'incidents', ['incident_id', 'title', 'severity', 'status', 'assignee', 'sla_breach_in_min'], 'INC');

module.exports = router;
