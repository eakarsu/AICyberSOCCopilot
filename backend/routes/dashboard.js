const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/stats', async (req, res) => {
  try {
    const [alerts, incidents, assets, playbooks, iocs, feed, roster, audit] = await Promise.all([
      pool.query(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('open','investigating'))::int AS open,
        COUNT(*) FILTER (WHERE severity IN ('high','critical'))::int AS high_critical
       FROM alerts`),
      pool.query(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','resolved'))::int AS open
       FROM incidents`),
      pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical
       FROM assets`),
      pool.query(`SELECT COUNT(*)::int AS total FROM playbooks`),
      pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE confidence >= 0.7)::int AS high_confidence
       FROM iocs`),
      pool.query(`SELECT COUNT(*)::int AS total FROM threat_intel_feed`),
      pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE on_call = true)::int AS on_call
       FROM shift_roster`),
      pool.query(`SELECT COUNT(*)::int AS total FROM audit_log`),
    ]);
    res.json({
      alerts: alerts.rows[0],
      incidents: incidents.rows[0],
      assets: assets.rows[0],
      playbooks: playbooks.rows[0],
      iocs: iocs.rows[0],
      threat_intel_feed: feed.rows[0],
      shift_roster: roster.rows[0],
      audit_log: audit.rows[0],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
