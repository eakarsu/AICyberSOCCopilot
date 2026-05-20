const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM assets ORDER BY last_seen DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM assets WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { asset_id, hostname, ip, os, owner, criticality } = req.body;
    const r = await pool.query(
      `INSERT INTO assets (asset_id, hostname, ip, os, owner, criticality)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [asset_id || `AST-${Date.now()}`, hostname, ip, os, owner, criticality || 'medium']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { hostname, ip, os, owner, criticality } = req.body;
    const r = await pool.query(
      `UPDATE assets SET hostname=$1, ip=$2, os=$3, owner=$4, criticality=$5, last_seen=NOW() WHERE id=$6 RETURNING *`,
      [hostname, ip, os, owner, criticality, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM assets WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', asset: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'assets', ['asset_id', 'hostname', 'ip', 'os', 'owner', 'criticality'], 'AST');

module.exports = router;
