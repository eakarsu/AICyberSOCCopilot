const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/notifications -> own + broadcast, newest first
router.get('/', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const r = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY created_at DESC LIMIT 100`,
      [userId || 0]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const r = await pool.query(
      `SELECT COUNT(*)::int AS n FROM notifications
       WHERE (user_id IS NULL OR user_id = $1) AND read = FALSE`,
      [userId || 0]
    );
    res.json({ count: r.rows[0].n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/notifications  (create)
router.post('/', async (req, res) => {
  try {
    const { user_id, type, message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const r = await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3) RETURNING *`,
      [user_id || null, type || 'info', message]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/notifications/:id/read
router.post('/:id/read', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/notifications/read-all  (mark all visible read)
router.post('/read-all', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    await pool.query(
      `UPDATE notifications SET read = TRUE
       WHERE (user_id IS NULL OR user_id = $1) AND read = FALSE`,
      [userId || 0]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// Helper exported for other routes to push notifications easily
module.exports.create = async (user_id, type, message) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)`,
      [user_id || null, type || 'info', message]
    );
  } catch (e) { /* swallow */ }
};
