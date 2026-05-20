import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getUser } from '../services/api';

const STAT_DEFS = [
  { key: 'alerts',          label: 'Open Alerts',          sub: (s) => `${s.alerts?.high_critical || 0} high / critical`, accent: '#ef4444', icon: '🚨' },
  { key: 'incidents',       label: 'Open Incidents',       sub: (s) => `${s.incidents?.total || 0} total tracked`,         accent: '#f97316', icon: '⚠' },
  { key: 'iocs',            label: 'High-Confidence IOCs', sub: (s) => `${s.iocs?.total || 0} indicators total`,           accent: '#22c55e', icon: '🎯' },
  { key: 'vulnerabilities', label: 'Open Vulnerabilities', sub: (s) => `${s.vulnerabilities?.high_critical || 0} high+`,   accent: '#a855f7', icon: '🛠' },
  { key: 'assets',          label: 'Tracked Assets',       sub: (s) => `${s.assets?.critical || 0} critical`,              accent: '#06b6d4', icon: '🖥' },
  { key: 'change_requests', label: 'Pending CRs',          sub: (s) => `${s.change_requests?.total || 0} total`,           accent: '#fbbf24', icon: '📋' },
];

const QUICK_AI = [
  { path: '/ai/triage-alerts',    title: 'Triage Open Alerts',  desc: 'Rank P1–P4 with rationale and next steps',  accent: '#22d3ee' },
  { path: '/ai/build-hunt',       title: 'Build a Hunt',        desc: 'Hypothesis → MITRE-mapped queries',         accent: '#a78bfa' },
  { path: '/ai/enrich-ioc',       title: 'Enrich IOC',          desc: 'Context, actors, malware, pivot queries',   accent: '#22c55e' },
  { path: '/ai/executive-brief',  title: 'Executive Brief',     desc: 'CISO-ready posture summary',                accent: '#f59e0b' },
  { path: '/ai/shift-handover',   title: 'Shift Handover',      desc: 'Briefing for incoming SOC shift',           accent: '#0ea5e9' },
  { path: '/ai/breach-narrative', title: 'Breach Narrative',    desc: 'Executive incident story from raw events',  accent: '#ec4899' },
];

const FEATURE_GROUPS = [
  {
    title: 'Operations',
    items: [
      { path: '/alerts',       label: 'Alerts',          desc: 'Triage detections across SIEM, EDR, IDS.' },
      { path: '/incidents',    label: 'Incidents',       desc: 'Track investigations and SLA risk.' },
      { path: '/playbooks',    label: 'Playbooks',       desc: 'SOAR runbooks and IR procedures.' },
      { path: '/runbooks',     label: 'Runbooks',        desc: 'Step-by-step IR runbooks.' },
      { path: '/shift-roster', label: 'Shift Roster',    desc: 'Analyst rotation and on-call.' },
    ],
  },
  {
    title: 'Threat Intelligence',
    items: [
      { path: '/iocs',              label: 'IOC Library',  desc: 'Indicators with source and confidence.' },
      { path: '/threat-intel-feed', label: 'Threat Intel', desc: 'Curated actors, TTPs, indicators.' },
      { path: '/allowlists',        label: 'Allowlists',   desc: 'Trusted IPs, domains, hashes.' },
      { path: '/blocklists',        label: 'Blocklists',   desc: 'Blocked IPs, domains, hashes.' },
    ],
  },
  {
    title: 'Asset & Identity',
    items: [
      { path: '/assets',          label: 'Asset Inventory', desc: 'Hosts, owners, criticality.' },
      { path: '/vulnerabilities', label: 'Vulnerabilities', desc: 'CVEs with CVSS scoring.' },
      { path: '/certificates',    label: 'Certificates',    desc: 'PKI lifecycle tracking.' },
      { path: '/secrets-vault',   label: 'Secrets Vault',   desc: 'Rotation due-date tracking.' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { path: '/exceptions',       label: 'Exceptions',       desc: 'Control exceptions and expiry.' },
      { path: '/change-requests',  label: 'Change Requests',  desc: 'Approval workflow.' },
      { path: '/vendor-risk',      label: 'Vendor Risk',      desc: 'Third-party risk scoring.' },
      { path: '/evidence-library', label: 'Evidence Library', desc: 'Control evidence collection.' },
      { path: '/audit-log',        label: 'Audit Log',        desc: 'Every action — actor / target / result.' },
    ],
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = getUser() || { name: 'Analyst' };
  const now = new Date();

  useEffect(() => {
    getDashboardStats()
      .then((d) => { setStats(d); setLoading(false); })
      .catch((e) => { setError(e?.message || 'Failed to load stats'); setLoading(false); });
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div className="dashboard-hero-bg" />
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-eyebrow">
            <span className="status-dot" /> ALL SYSTEMS OPERATIONAL · {now.toLocaleString()}
          </div>
          <h1>Welcome back, {(user.name || 'Analyst').split(' ')[0]}</h1>
          <p>
            Your security operations command center. {STAT_DEFS.length} live metrics, {QUICK_AI.length} AI copilots,
            full coverage across 18 SOC workflows. Click any tile to dive in.
          </p>
        </div>
      </div>

      <div className="dashboard-stats-grid">
        {STAT_DEFS.map((d) => {
          const v = stats?.[d.key];
          return (
            <div className="stat-card-pro" key={d.key} style={{ borderLeftColor: d.accent }}>
              <div className="stat-card-top">
                <span className="stat-card-icon" style={{ background: `${d.accent}20`, color: d.accent }}>{d.icon}</span>
                <span className="stat-card-label">{d.label}</span>
              </div>
              <div className="stat-card-value">
                {loading ? '…' : (v?.open ?? v?.total ?? 0).toLocaleString()}
              </div>
              <div className="stat-card-sub">{v ? d.sub(stats) : (error ? 'unavailable' : 'loading…')}</div>
            </div>
          );
        })}
      </div>

      <div className="section-header">
        <h2>AI Copilots</h2>
        <span>Click any card to run</span>
      </div>
      <div className="quick-ai-grid">
        {QUICK_AI.map((q) => (
          <div
            className="quick-ai-card"
            key={q.path}
            onClick={() => navigate(q.path)}
            style={{ borderColor: `${q.accent}40` }}
          >
            <div className="quick-ai-glow" style={{ background: `radial-gradient(circle at top right, ${q.accent}30, transparent 70%)` }} />
            <div className="quick-ai-badge" style={{ color: q.accent, borderColor: `${q.accent}50` }}>AI</div>
            <h3>{q.title}</h3>
            <p>{q.desc}</p>
            <div className="quick-ai-arrow" style={{ color: q.accent }}>→</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2>All Features</h2>
        <span>Operations, intel, governance</span>
      </div>
      <div className="feature-groups">
        {FEATURE_GROUPS.map((g) => (
          <div className="feature-group" key={g.title}>
            <h3 className="feature-group-title">{g.title}</h3>
            <div className="feature-group-items">
              {g.items.map((it) => (
                <div className="feature-item" key={it.path} onClick={() => navigate(it.path)}>
                  <div className="feature-item-label">{it.label}</div>
                  <div className="feature-item-desc">{it.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
