const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM iocs ORDER BY first_seen DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM iocs WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { ioc_id, type, value, source, confidence } = req.body;
    const r = await pool.query(
      `INSERT INTO iocs (ioc_id, type, value, source, confidence)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [ioc_id || `IOC-${Date.now()}`, type, value, source, confidence ?? 0.5]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { type, value, source, confidence } = req.body;
    const r = await pool.query(
      `UPDATE iocs SET type=$1, value=$2, source=$3, confidence=$4 WHERE id=$5 RETURNING *`,
      [type, value, source, confidence, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM iocs WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', ioc: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'iocs', ['ioc_id', 'type', 'value', 'source', 'confidence'], 'IOC');

module.exports = router;
