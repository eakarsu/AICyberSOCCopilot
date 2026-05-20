// Custom SOC Views router — 4 endpoints powering 2 VIZ + 2 NON-VIZ features
// for the AICyberSOCCopilot defensive security workspace.
//
// All endpoints are read-only or in-memory CRUD (for the playbook-rules editor)
// so they work without schema migrations.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_BUCKETS = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
  info:     '#38bdf8',
};

// MITRE ATT&CK Enterprise — compact tactic → technique map used to seed the
// heatmap deterministically when DB rows are sparse.
const MITRE = {
  'Initial Access':       ['T1566', 'T1190', 'T1078', 'T1133'],
  'Execution':            ['T1059', 'T1106', 'T1204', 'T1569'],
  'Persistence':          ['T1136', 'T1543', 'T1547', 'T1574'],
  'Privilege Escalation': ['T1068', 'T1078', 'T1055', 'T1134'],
  'Defense Evasion':      ['T1027', 'T1070', 'T1140', 'T1562'],
  'Credential Access':    ['T1003', 'T1110', 'T1555', 'T1556'],
  'Discovery':            ['T1018', 'T1057', 'T1082', 'T1083'],
  'Lateral Movement':     ['T1021', 'T1080', 'T1210', 'T1570'],
  'Collection':           ['T1005', 'T1056', 'T1113', 'T1119'],
  'Command and Control':  ['T1071', 'T1090', 'T1095', 'T1573'],
  'Exfiltration':         ['T1041', 'T1048', 'T1567', 'T1052'],
  'Impact':               ['T1486', 'T1490', 'T1499', 'T1561'],
};

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

// In-memory playbook rules (alert → action) — fully CRUD, persists for the
// lifetime of the backend process which is sufficient for the SOC views demo.
let RULE_SEQ = 5;
let PLAYBOOK_RULES = [
  {
    id: 1,
    name: 'Ransomware containment',
    alert_pattern: 'Ransomware behavior',
    severity: 'critical',
    action: 'isolate_host',
    target: 'EDR',
    enabled: true,
    notes: 'Isolate host via CrowdStrike Falcon RTR, page on-call.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Credential theft block',
    alert_pattern: 'LSASS access',
    severity: 'high',
    action: 'force_password_reset',
    target: 'Identity Provider',
    enabled: true,
    notes: 'Reset credentials, revoke sessions in Okta.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Phishing auto-quarantine',
    alert_pattern: 'Phishing',
    severity: 'medium',
    action: 'quarantine_email',
    target: 'Email Gateway',
    enabled: true,
    notes: 'Pull message from all inboxes, add sender to blocklist.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'C2 beacon block',
    alert_pattern: 'beacon',
    severity: 'high',
    action: 'block_ip',
    target: 'Firewall',
    enabled: true,
    notes: 'Push deny rule to perimeter firewall, open IR ticket.',
    updated_at: new Date().toISOString(),
  },
];

async function safeQuery(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1) VIZ — Alert timeline (severity-colored)
//    GET /api/custom-views/alert-timeline
// ---------------------------------------------------------------------------
router.get('/alert-timeline', async (req, res) => {
  try {
    const rows = await safeQuery(
      `SELECT id, alert_id, source, severity, title, status, asset, created_at
         FROM alerts
        ORDER BY created_at DESC
        LIMIT 60`
    );

    let points;
    if (rows && rows.length) {
      points = rows.map((r) => {
        const sev = (r.severity || 'medium').toLowerCase();
        return {
          id: r.id,
          alert_id: r.alert_id,
          title: r.title,
          source: r.source,
          asset: r.asset,
          status: r.status,
          severity: sev,
          color: SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium,
          timestamp: r.created_at,
        };
      });
    } else {
      // Deterministic fallback so the timeline always renders something useful.
      const now = Date.now();
      points = Array.from({ length: 24 }).map((_, i) => {
        const sev = SEVERITY_BUCKETS[i % SEVERITY_BUCKETS.length];
        return {
          id: i + 1,
          alert_id: `ALR-${String(i + 1).padStart(4, '0')}`,
          title: `Synthetic ${sev} signal #${i + 1}`,
          source: ['Falcon', 'Defender', 'Splunk', 'Sentinel'][i % 4],
          asset: `host-${i + 1}`,
          status: i % 3 === 0 ? 'investigating' : 'open',
          severity: sev,
          color: SEVERITY_COLORS[sev],
          timestamp: new Date(now - i * 25 * 60 * 1000).toISOString(),
        };
      });
    }

    // Sort ascending for left-to-right timeline rendering.
    points.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const severityCounts = SEVERITY_BUCKETS.reduce((acc, s) => {
      acc[s] = points.filter((p) => p.severity === s).length;
      return acc;
    }, {});

    res.json({
      generated_at: new Date().toISOString(),
      total: points.length,
      severity_counts: severityCounts,
      severity_palette: SEVERITY_COLORS,
      points,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 2) VIZ — MITRE ATT&CK technique heatmap (tactic x technique)
//    GET /api/custom-views/mitre-heatmap
// ---------------------------------------------------------------------------
router.get('/mitre-heatmap', async (req, res) => {
  try {
    // Pull alert titles + IOC tags as evidence sources for technique scoring.
    const alerts = (await safeQuery(`SELECT title, severity FROM alerts LIMIT 500`)) || [];
    const iocs   = (await safeQuery(`SELECT value, type FROM iocs LIMIT 500`)) || [];

    const corpus = [
      ...alerts.map((a) => `${a.title || ''} ${a.severity || ''}`),
      ...iocs.map((i)   => `${i.value || ''} ${i.type || ''}`),
    ].join(' ').toLowerCase();

    const tactics = Object.keys(MITRE);
    const cells = [];
    let maxScore = 0;

    tactics.forEach((tactic) => {
      MITRE[tactic].forEach((technique) => {
        // Score combines: deterministic base (so heatmap is always populated)
        // + evidence boost when alert text mentions tactic/technique tokens.
        const base = (hashCode(tactic + technique) % 7);
        const tacticHits = corpus.includes(tactic.toLowerCase().split(' ')[0]) ? 4 : 0;
        const techHits = corpus.includes(technique.toLowerCase()) ? 6 : 0;
        const score = base + tacticHits + techHits;
        if (score > maxScore) maxScore = score;
        cells.push({
          tactic,
          technique,
          score,
        });
      });
    });

    // Normalize 0..1 for client coloring.
    const normalized = cells.map((c) => ({
      ...c,
      intensity: maxScore > 0 ? Number((c.score / maxScore).toFixed(3)) : 0,
    }));

    res.json({
      generated_at: new Date().toISOString(),
      tactics,
      techniques_per_tactic: MITRE,
      max_score: maxScore,
      cells: normalized,
      evidence: {
        alert_count: alerts.length,
        ioc_count: iocs.length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 3) NON-VIZ — Incident Response Report (PDF-style text/plain doc)
//    GET /api/custom-views/ir-report?incident_id=<id>
//
//    Returns a self-contained text/plain report shaped for printing / save-as
//    PDF directly from the browser. Keeps zero external dependencies.
// ---------------------------------------------------------------------------
router.get('/ir-report', async (req, res) => {
  try {
    const incidentId = req.query.incident_id;
    let incident = null;
    if (incidentId) {
      const r = await safeQuery(`SELECT * FROM incidents WHERE id = $1 LIMIT 1`, [incidentId]);
      if (r && r.length) incident = r[0];
    }
    if (!incident) {
      const r = await safeQuery(`SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1`);
      if (r && r.length) incident = r[0];
    }

    if (!incident) {
      incident = {
        id: 0,
        incident_id: 'INC-DEMO-0001',
        title: 'Suspected ransomware on FILE-SRV-02',
        severity: 'critical',
        status: 'investigating',
        owner: 'soc-l2',
        created_at: new Date().toISOString(),
      };
    }

    const relatedAlerts = (await safeQuery(
      `SELECT alert_id, title, severity, source FROM alerts ORDER BY created_at DESC LIMIT 6`
    )) || [];

    const relatedIocs = (await safeQuery(
      `SELECT value, type, confidence FROM iocs ORDER BY id DESC LIMIT 6`
    )) || [];

    const now = new Date();
    const lines = [];
    lines.push('====================================================');
    lines.push('   INCIDENT RESPONSE REPORT — AI CYBERSOC COPILOT');
    lines.push('====================================================');
    lines.push('');
    lines.push(`Report generated:    ${now.toISOString()}`);
    lines.push(`Incident ID:         ${incident.incident_id || incident.id}`);
    lines.push(`Title:               ${incident.title || '(untitled)'}`);
    lines.push(`Severity:            ${(incident.severity || 'unknown').toUpperCase()}`);
    lines.push(`Status:              ${incident.status || 'unknown'}`);
    lines.push(`Owner:               ${incident.owner || 'unassigned'}`);
    lines.push(`Opened:              ${incident.created_at || 'unknown'}`);
    lines.push('');
    lines.push('---------------- EXECUTIVE SUMMARY -----------------');
    lines.push('A defensive-security incident has been opened in the');
    lines.push('SOC Copilot platform. This report consolidates the');
    lines.push('triggering alerts, related indicators of compromise');
    lines.push('and recommended containment actions for hand-off to');
    lines.push('the incident response lead.');
    lines.push('');
    lines.push('--------------- TRIGGERING ALERTS ------------------');
    if (relatedAlerts.length === 0) {
      lines.push('  (no alerts available)');
    } else {
      relatedAlerts.forEach((a, i) => {
        lines.push(`  ${i + 1}. [${(a.severity || '').toUpperCase()}] ${a.alert_id} — ${a.title}`);
        lines.push(`     source: ${a.source}`);
      });
    }
    lines.push('');
    lines.push('--------- INDICATORS OF COMPROMISE (IOCs) ----------');
    if (relatedIocs.length === 0) {
      lines.push('  (no IOCs available)');
    } else {
      relatedIocs.forEach((i, idx) => {
        lines.push(`  ${idx + 1}. ${i.type}: ${i.value}  (confidence ${i.confidence ?? '—'})`);
      });
    }
    lines.push('');
    lines.push('-------------- RECOMMENDED ACTIONS -----------------');
    lines.push('  1. Isolate affected host(s) via EDR (Falcon RTR).');
    lines.push('  2. Rotate credentials for impacted identities.');
    lines.push('  3. Push deny rules for any external C2 IPs.');
    lines.push('  4. Capture forensic image of suspect endpoints.');
    lines.push('  5. Notify CISO + legal per IR runbook RB-CRIT-01.');
    lines.push('');
    lines.push('----------------- ATTESTATION ----------------------');
    lines.push('Prepared by: AI CyberSOC Copilot (automated draft).');
    lines.push('Reviewed by: __________________  Date: __________');
    lines.push('');
    lines.push('====================================================');

    const report = lines.join('\n');

    res.json({
      generated_at: now.toISOString(),
      incident: {
        id: incident.id,
        incident_id: incident.incident_id || incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
      },
      filename: `IR-Report-${incident.incident_id || incident.id}.txt`,
      mime: 'text/plain',
      content: report,
      stats: {
        alerts: relatedAlerts.length,
        iocs: relatedIocs.length,
        characters: report.length,
        lines: lines.length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 4) NON-VIZ — SOC Playbook Rules editor (CRUD alert → action)
//    Methods on the same /playbook-rules path:
//      GET    list
//      POST   create
//      PUT    /:id update
//      DELETE /:id delete
// ---------------------------------------------------------------------------
router.get('/playbook-rules', (req, res) => {
  res.json({
    generated_at: new Date().toISOString(),
    total: PLAYBOOK_RULES.length,
    rules: PLAYBOOK_RULES,
    actions: [
      'isolate_host',
      'block_ip',
      'quarantine_email',
      'force_password_reset',
      'disable_account',
      'open_ticket',
      'notify_oncall',
    ],
    severities: SEVERITY_BUCKETS,
  });
});

router.post('/playbook-rules', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.action) {
    return res.status(400).json({ error: 'name and action are required' });
  }
  const rule = {
    id: ++RULE_SEQ,
    name: String(b.name).slice(0, 120),
    alert_pattern: String(b.alert_pattern || '').slice(0, 200),
    severity: SEVERITY_BUCKETS.includes(b.severity) ? b.severity : 'medium',
    action: String(b.action).slice(0, 80),
    target: String(b.target || 'SOAR').slice(0, 80),
    enabled: b.enabled !== false,
    notes: String(b.notes || '').slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  PLAYBOOK_RULES.push(rule);
  res.status(201).json(rule);
});

router.put('/playbook-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = PLAYBOOK_RULES.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const b = req.body || {};
  const existing = PLAYBOOK_RULES[idx];
  PLAYBOOK_RULES[idx] = {
    ...existing,
    name:          b.name          !== undefined ? String(b.name).slice(0, 120)         : existing.name,
    alert_pattern: b.alert_pattern !== undefined ? String(b.alert_pattern).slice(0, 200) : existing.alert_pattern,
    severity:      SEVERITY_BUCKETS.includes(b.severity) ? b.severity                    : existing.severity,
    action:        b.action        !== undefined ? String(b.action).slice(0, 80)         : existing.action,
    target:        b.target        !== undefined ? String(b.target).slice(0, 80)         : existing.target,
    enabled:       b.enabled       !== undefined ? !!b.enabled                           : existing.enabled,
    notes:         b.notes         !== undefined ? String(b.notes).slice(0, 500)         : existing.notes,
    updated_at: new Date().toISOString(),
  };
  res.json(PLAYBOOK_RULES[idx]);
});

router.delete('/playbook-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = PLAYBOOK_RULES.length;
  PLAYBOOK_RULES = PLAYBOOK_RULES.filter((r) => r.id !== id);
  if (PLAYBOOK_RULES.length === before) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  res.json({ message: 'Deleted', id });
});

module.exports = router;
