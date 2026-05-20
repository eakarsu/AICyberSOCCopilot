import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../services/api';
import NotificationsBell from './NotificationsBell';

const links = [
  { path: '/',                    label: 'Dashboard' },
  // Original CRUD
  { path: '/alerts',              label: 'Alerts' },
  { path: '/incidents',           label: 'Incidents' },
  { path: '/assets',              label: 'Assets' },
  { path: '/playbooks',           label: 'Playbooks' },
  { path: '/iocs',                label: 'IOCs' },
  { path: '/threat-intel-feed',   label: 'Threat Intel' },
  { path: '/shift-roster',        label: 'Roster' },
  { path: '/audit-log',           label: 'Audit Log' },
  // New CRUD (10)
  { path: '/vulnerabilities',     label: 'Vulns' },
  { path: '/exceptions',          label: 'Exceptions' },
  { path: '/change-requests',     label: 'CRs' },
  { path: '/vendor-risk',         label: 'Vendors' },
  { path: '/certificates',        label: 'Certs' },
  { path: '/secrets-vault',       label: 'Secrets' },
  { path: '/runbooks',            label: 'Runbooks' },
  { path: '/evidence-library',    label: 'Evidence' },
  { path: '/allowlists',          label: 'Allow' },
  { path: '/blocklists',          label: 'Block' },
  // Original AI
  { path: '/ai/triage-alerts',    label: 'Triage' },
  { path: '/ai/build-hunt',       label: 'Hunt' },
  { path: '/ai/enrich-ioc',       label: 'Enrich' },
  { path: '/ai/executive-brief',  label: 'Brief' },
  { path: '/ai/draft-playbook',   label: 'Draft PB' },
  { path: '/ai/shift-handover',   label: 'Handover' },
  // New AI (10)
  { path: '/ai/red-team',              label: 'RedTeam' },
  { path: '/ai/phishing-classifier',   label: 'Phish' },
  { path: '/ai/policy-diff',           label: 'PolicyDiff' },
  { path: '/ai/mitre-mapper',          label: 'MITRE' },
  { path: '/ai/compromise-assess',     label: 'Compromise' },
  { path: '/ai/remediation-estimator', label: 'Remediate' },
  { path: '/ai/log-anomaly',           label: 'LogAnom' },
  { path: '/ai/identity-risk',         label: 'IdRisk' },
  { path: '/ai/supply-chain-scan',     label: 'Supply' },
  { path: '/ai/breach-narrative',      label: 'Breach' },
  // Cross-cutting admin
  { path: '/webhooks',                 label: 'Webhooks' },
];

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getUser();

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
        <h1>AI CyberSOC Copilot</h1>
        <span className="navbar-tag">SOC</span>
      </Link>

      <button
        className="navbar-burger"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className={`navbar-nav ${mobileOpen ? 'open' : ''}`}>
        {links.map((l) => (
          <Link
            key={l.path}
            to={l.path}
            onClick={() => setMobileOpen(false)}
            className={`nav-link ${location.pathname === l.path ? 'active' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="navbar-user">
        <NotificationsBell />
        {user && <span className="navbar-user-name">{user.email}{user.role ? ` · ${user.role}` : ''}</span>}
        <button className="btn-icon" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
