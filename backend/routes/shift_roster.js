const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { attachBulkImport } = require('../services/bulk_import');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM shift_roster ORDER BY id ASC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM shift_roster WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { entry_id, analyst, shift, day_of_week, on_call } = req.body;
    const r = await pool.query(
      `INSERT INTO shift_roster (entry_id, analyst, shift, day_of_week, on_call)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [entry_id || `SR-${Date.now()}`, analyst, shift, day_of_week, !!on_call]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { analyst, shift, day_of_week, on_call } = req.body;
    const r = await pool.query(
      `UPDATE shift_roster SET analyst=$1, shift=$2, day_of_week=$3, on_call=$4 WHERE id=$5 RETURNING *`,
      [analyst, shift, day_of_week, !!on_call, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM shift_roster WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', entry: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

attachBulkImport(router, 'shift_roster', ['entry_id', 'analyst', 'shift', 'day_of_week', 'on_call'], 'SR');

module.exports = router;
