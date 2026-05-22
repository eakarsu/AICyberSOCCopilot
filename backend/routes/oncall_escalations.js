// ============================================================
// NEEDS-PRODUCT-DECISION (resolved this pass) —
// On-call escalation engine built on shift_roster.
// Provides:
//   - escalation policies (ordered chain of analysts/groups)
//   - page events (paging fan-out + ack windows + overrides)
//   - resolve / ack / override workflow
// All persistence is in-DB; no external paging vendor calls
// (those would be NEEDS-CREDS via /integrations/ticketing/pagerduty).
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ---------- Policies CRUD ----------
router.get('/policies', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM oncall_policies ORDER BY id ASC LIMIT 200`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/policies/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM oncall_policies WHERE id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/policies', async (req, res) => {
  try {
    const { policy_id, name, chain, ack_window_minutes, status } = req.body || {};
    const r = await pool.query(
      `INSERT INTO oncall_policies (policy_id, name, chain, ack_window_minutes, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        policy_id || `OCP-${Date.now()}`,
        name || 'Default policy',
        Array.isArray(chain) ? chain : [],
        parseInt(ack_window_minutes, 10) || 10,
        status || 'active',
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/policies/:id', async (req, res) => {
  try {
    const { name, chain, ack_window_minutes, status } = req.body || {};
    const r = await pool.query(
      `UPDATE oncall_policies SET name=$1, chain=$2, ack_window_minutes=$3, status=$4
       WHERE id=$5 RETURNING *`,
      [name, Array.isArray(chain) ? chain : [], parseInt(ack_window_minutes, 10) || 10, status || 'active', req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/policies/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM oncall_policies WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', row: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Page (fire an escalation) ----------
router.post('/page', async (req, res) => {
  try {
    const { policy_id, incident_id, severity, message } = req.body || {};
    if (!policy_id) return res.status(400).json({ error: 'policy_id required' });
    const pol = await pool.query(`SELECT * FROM oncall_policies WHERE policy_id=$1 OR id::text=$1 LIMIT 1`, [String(policy_id)]);
    if (!pol.rows.length) return res.status(404).json({ error: 'policy not found' });
    const policy = pol.rows[0];
    const chain = Array.isArray(policy.chain) ? policy.chain : [];
    const r = await pool.query(
      `INSERT INTO oncall_pages (page_id, policy_id, incident_id, severity, message, current_step, chain_snapshot, status, ack_deadline)
       VALUES ($1,$2,$3,$4,$5,0,$6,'firing', NOW() + ($7 || ' minutes')::interval)
       RETURNING *`,
      [
        `PG-${Date.now()}`,
        policy.policy_id,
        incident_id || null,
        severity || 'P2',
        message || 'Auto-paged from SOC Copilot',
        JSON.stringify(chain),
        String(policy.ack_window_minutes || 10),
      ]
    );
    res.status(201).json({ ...r.rows[0], notified: chain[0] || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/pages', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM oncall_pages ORDER BY id DESC LIMIT 100`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/pages/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM oncall_pages WHERE id=$1 OR page_id=$2 LIMIT 1`, [parseInt(req.params.id, 10) || 0, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ack / escalate / override / resolve
router.post('/pages/:id/ack', async (req, res) => {
  try {
    const actor = (req.user && (req.user.email || req.user.name)) || 'anonymous';
    const r = await pool.query(
      `UPDATE oncall_pages SET status='acked', acked_by=$1, acked_at=NOW()
       WHERE (id=$2 OR page_id=$3) AND status IN ('firing','escalated') RETURNING *`,
      [actor, parseInt(req.params.id, 10) || 0, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Page not found or already terminal' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/pages/:id/escalate', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM oncall_pages WHERE id=$1 OR page_id=$2 LIMIT 1`, [parseInt(req.params.id, 10) || 0, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const page = r.rows[0];
    if (page.status === 'resolved') return res.status(409).json({ error: 'page already resolved' });
    const chain = Array.isArray(page.chain_snapshot) ? page.chain_snapshot : (() => { try { return JSON.parse(page.chain_snapshot); } catch (_) { return []; } })();
    const next = (page.current_step || 0) + 1;
    if (next >= chain.length) {
      return res.status(409).json({ error: 'end of escalation chain', page_id: page.page_id });
    }
    const u = await pool.query(
      `UPDATE oncall_pages SET current_step=$1, status='escalated', ack_deadline=NOW() + INTERVAL '10 minutes'
       WHERE id=$2 RETURNING *`,
      [next, page.id]
    );
    res.json({ ...u.rows[0], now_notifying: chain[next] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/pages/:id/override', async (req, res) => {
  try {
    const { override_to, reason } = req.body || {};
    const actor = (req.user && (req.user.email || req.user.name)) || 'anonymous';
    if (!override_to) return res.status(400).json({ error: 'override_to required' });
    const r = await pool.query(
      `UPDATE oncall_pages SET status='overridden', override_to=$1, override_reason=$2, overridden_by=$3, overridden_at=NOW()
       WHERE (id=$4 OR page_id=$5) AND status NOT IN ('resolved') RETURNING *`,
      [override_to, reason || null, actor, parseInt(req.params.id, 10) || 0, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found or already resolved' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/pages/:id/resolve', async (req, res) => {
  try {
    const actor = (req.user && (req.user.email || req.user.name)) || 'anonymous';
    const r = await pool.query(
      `UPDATE oncall_pages SET status='resolved', resolved_by=$1, resolved_at=NOW()
       WHERE (id=$2 OR page_id=$3) AND status <> 'resolved' RETURNING *`,
      [actor, parseInt(req.params.id, 10) || 0, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found or already resolved' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
