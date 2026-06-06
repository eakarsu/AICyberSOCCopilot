import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../services/api';
import NotificationsBell from './NotificationsBell';

// Sectioned nav — groups are always visible, no collapsing.
const SECTIONS = [
  {
    title: 'Overview',
    icon: '◆',
    items: [
      { path: '/', label: 'Dashboard', hint: 'Live SOC posture' },
      { path: '/custom-views', label: 'SOC Views', hint: 'Timeline · MITRE · IR report · Rules' },
    ],
  },
  {
    title: 'Operations',
    icon: '🛡',
    items: [
      { path: '/alerts',        label: 'Alerts',           hint: 'SIEM / EDR / IDS detections' },
      { path: '/incidents',     label: 'Incidents',        hint: 'Investigations & SLA' },
      { path: '/playbooks',     label: 'Playbooks',        hint: 'SOAR runbooks' },
      { path: '/runbooks',      label: 'Runbooks',         hint: 'IR procedures' },
      { path: '/shift-roster',  label: 'Shift Roster',     hint: 'Analyst rotation' },
      { path: '/on-call',       label: 'On-Call',          hint: 'Escalation policies + pages' },
    ],
  },
  {
    title: 'Threat Intelligence',
    icon: '👁',
    items: [
      { path: '/iocs',                label: 'IOC Library',     hint: 'Indicators with confidence' },
      { path: '/threat-intel-feed',   label: 'Threat Intel',    hint: 'Actors, TTPs, indicators' },
      { path: '/allowlists',          label: 'Allowlists',      hint: 'Trusted IPs / domains / hashes' },
      { path: '/blocklists',          label: 'Blocklists',      hint: 'Blocked IPs / domains / hashes' },
    ],
  },
  {
    title: 'Asset & Identity',
    icon: '🖥',
    items: [
      { path: '/assets',         label: 'Asset Inventory',  hint: 'Hosts, owners, criticality' },
      { path: '/vulnerabilities',label: 'Vulnerabilities',  hint: 'CVEs with CVSS' },
      { path: '/certificates',   label: 'Certificates',     hint: 'PKI lifecycle' },
      { path: '/secrets-vault',  label: 'Secrets Vault',    hint: 'Secret rotation tracking' },
    ],
  },
  {
    title: 'Governance',
    icon: '⚖',
    items: [
      { path: '/exceptions',       label: 'Exceptions',         hint: 'Control exceptions' },
      { path: '/change-requests',  label: 'Change Requests',    hint: 'Approval workflow' },
      { path: '/vendor-risk',      label: 'Vendor Risk',        hint: 'Third-party assessments' },
      { path: '/evidence-library', label: 'Evidence Library',   hint: 'Control evidence collection' },
      { path: '/audit-log',        label: 'Audit Log',          hint: 'Every SOC action logged' },
    ],
  },
  {
    title: 'AI · Triage & Response',
    icon: '✨',
    items: [
      { path: '/ai/triage-alerts',          label: 'Triage Alerts',        hint: 'Rank P1–P4 with rationale' },
      { path: '/ai/false-positive-reducer', label: 'FP Reducer',           hint: 'Score alert as FP + suppression rule' },
      { path: '/ai/draft-playbook',         label: 'Draft Playbook',       hint: 'Generate SOAR steps' },
      { path: '/ai/playbook-recommend',     label: 'Recommend Playbook',   hint: 'Rank existing playbooks vs incident' },
      { path: '/ai/remediation-estimator',  label: 'Remediation Estimate', hint: 'Cost + time + resources' },
      { path: '/ai/breach-narrative',       label: 'Breach Narrative',     hint: 'Executive incident story' },
      { path: '/ai/post-incident-report',   label: 'Post-Incident RCA',    hint: 'RCA + lessons + action items' },
      { path: '/ai/shift-handover',         label: 'Shift Handover',       hint: 'Incoming-shift brief' },
      { path: '/ai/executive-brief',        label: 'Executive Brief',      hint: 'CISO posture summary' },
    ],
  },
  {
    title: 'AI · Threat Hunting',
    icon: '🎯',
    items: [
      { path: '/ai/build-hunt',          label: 'Build Hunt',          hint: 'Hypothesis → queries' },
      { path: '/ai/log-query-copilot',   label: 'Log Query Co-Pilot',  hint: 'NL → SPL / KQL / Lucene / Sigma' },
      { path: '/ai/enrich-ioc',          label: 'Enrich IOC',          hint: 'Add context + pivots' },
      { path: '/ai/mitre-mapper',        label: 'MITRE Mapper',        hint: 'TTP → ATT&CK technique' },
      { path: '/ai/compromise-assess',   label: 'Compromise Assess',   hint: 'Likelihood + IOC list' },
      { path: '/ai/log-anomaly',         label: 'Log Anomaly',         hint: 'Anomaly clusters' },
      { path: '/ai/identity-risk',       label: 'Identity Risk',       hint: 'User risk + anomalies' },
    ],
  },
  {
    title: 'AI · Adversarial & Risk',
    icon: '🔴',
    items: [
      { path: '/ai/red-team',             label: 'Red Team',             hint: 'Attack plan generator' },
      { path: '/ai/tabletop-exercise',    label: 'Tabletop Exercise',    hint: 'Scenario + injects + facilitator notes' },
      { path: '/ai/phishing-classifier',  label: 'Phishing Classifier',  hint: 'Phish score + indicators' },
      { path: '/ai/policy-diff',          label: 'Policy Diff',          hint: 'Semantic policy diff' },
      { path: '/ai/supply-chain-scan',    label: 'Supply Chain Scan',    hint: '3rd-party risk' },
    ],
  },
  {
    title: 'Admin',
    icon: '⚙',
    items: [
      { path: '/webhooks',     label: 'Webhooks',     hint: 'Outbound integrations' },
      { path: '/integrations', label: 'Integrations', hint: 'SIEM/EDR + ticketing surfaces' },
      { path: '/production-gaps', label: 'Production Gaps', hint: 'Missing SOC production capabilities' },
      { path: '/production-controls', label: 'Production Controls', hint: 'Production SOC launch controls' },
    ],
  },
];

const ROLE_COLORS = {
  admin:   { fg: '#fda4af', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)'  },
  analyst: { fg: '#a7f3d0', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)' },
  viewer:  { fg: '#bae6fd', bg: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.35)' },
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getUser() || { name: 'Analyst', email: '—', role: 'viewer' };

  const filteredSections = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (it) => it.label.toLowerCase().includes(q) || (it.hint || '').toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [query]);

  const totalCount = SECTIONS.reduce((a, s) => a + s.items.length, 0);
  const aiCount = SECTIONS.filter((s) => s.title.startsWith('AI')).reduce((a, s) => a + s.items.length, 0);
  const opsCount = totalCount - aiCount - 1; // minus Dashboard
  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.viewer;

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <>
      <button
        className="sidebar-burger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          <div className="brand-logo">◆</div>
          <div className="brand-text">
            <div className="brand-title">SOC COPILOT</div>
            <div className="brand-sub">{opsCount} ops · {aiCount} AI</div>
          </div>
          <NotificationsBell />
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <span className="sidebar-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Status pill */}
        <div className="sidebar-status">
          <span className="status-dot" />
          <span>All systems operational</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {filteredSections.map((section) => (
            <div className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">
                <span className="sidebar-section-icon">{section.icon}</span>
                <span>{section.title}</span>
                <span className="sidebar-section-count">{section.items.length}</span>
              </div>
              {section.items.map((it) => {
                const active = location.pathname === it.path;
                return (
                  <Link
                    key={it.path}
                    to={it.path}
                    className={`sidebar-item ${active ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    title={it.hint}
                  >
                    <span className="sidebar-item-label">{it.label}</span>
                    {it.hint && <span className="sidebar-item-hint">{it.hint}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
          {filteredSections.length === 0 && (
            <div className="sidebar-empty">No matches for &ldquo;{query}&rdquo;</div>
          )}
        </nav>

        {/* User footer */}
        <div className="sidebar-user">
          <div className="user-avatar">{(user.name || 'A').charAt(0).toUpperCase()}</div>
          <div className="user-meta">
            <div className="user-name">{user.name || user.email}</div>
            <span
              className="user-role"
              style={{
                color: roleStyle.fg,
                background: roleStyle.bg,
                borderColor: roleStyle.border,
              }}
            >
              {(user.role || 'viewer').toUpperCase()}
            </span>
          </div>
          <button className="user-logout" onClick={handleLogout} title="Sign out">⎋</button>
        </div>
      </aside>
    </>
  );
}
