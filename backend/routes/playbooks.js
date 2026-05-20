const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM playbooks ORDER BY id DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM playbooks WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { playbook_id, name, trigger, steps_count, owner, last_run } = req.body;
    const r = await pool.query(
      `INSERT INTO playbooks (playbook_id, name, trigger, steps_count, owner, last_run)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [playbook_id || `PB-${Date.now()}`, name, trigger, steps_count || 0, owner, last_run]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, trigger, steps_count, owner, last_run } = req.body;
    const r = await pool.query(
      `UPDATE playbooks SET name=$1, trigger=$2, steps_count=$3, owner=$4, last_run=$5 WHERE id=$6 RETURNING *`,
      [name, trigger, steps_count, owner, last_run, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM playbooks WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', playbook: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'playbooks', ['playbook_id', 'name', 'trigger', 'steps_count', 'owner', 'last_run'], 'PB');

module.exports = router;
