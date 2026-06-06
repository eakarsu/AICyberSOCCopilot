import React, { useState } from 'react';

const rows = [
  ['SIEM Ingestion Coverage', 'Data Pipeline', 'Log source onboarding, parser health, dropped events, and coverage gaps', 'Implemented surface'],
  ['SOAR Action Guardrails', 'Automation', 'Approval gates, rollback steps, retry queues, and human-in-loop containment', 'Implemented surface'],
  ['Detection Engineering Backlog', 'Detection', 'Rule lifecycle, test evidence, MITRE coverage, and false-positive tuning', 'Implemented surface'],
  ['Threat Hunt Program', 'Hunting', 'Hypotheses, query packs, evidence capture, and conversion into detections', 'Implemented surface'],
  ['Identity Response Queue', 'IAM', 'Risky sign-ins, MFA reset, privileged access review, and account containment', 'Implemented surface'],
  ['Endpoint Containment', 'EDR', 'Host isolation, malware triage, restoration approvals, and evidence capture', 'Implemented surface'],
  ['Cloud Posture Findings', 'Cloud', 'Misconfigurations, IAM drift, exposed services, and remediation ownership', 'Implemented surface'],
  ['Vulnerability Remediation SLAs', 'Risk', 'SLA aging, patch exceptions, compensating controls, and closure evidence', 'Implemented surface'],
  ['Control Evidence Collection', 'Governance', 'SOC 2, ISO, PCI, HIPAA, and internal evidence with auditor status', 'Implemented surface'],
  ['SOC Shift Quality', 'Operations', 'Shift handover QA, unresolved alerts, escalation notes, and staffing coverage', 'Implemented surface'],
  ['Incident Communications', 'Response', 'Executive updates, legal holds, customer notices, and comms approvals', 'Implemented surface'],
  ['Tabletop Exercise Tracker', 'Readiness', 'Scenarios, injects, findings, owners, and remediation status', 'Implemented surface'],
  ['Threat Intel Scoring', 'Intel', 'Source confidence, sightings, enrichment, and block/allow decisions', 'Implemented surface'],
  ['Metrics and SLO Dashboard', 'Analytics', 'MTTA, MTTR, false positive rate, backlog, and containment time', 'Implemented surface'],
  ['Production Security Hardening', 'Platform', 'SSO/MFA, audit logs, secrets, backups, deployment runbooks, and regression tests', 'Implemented surface'],
];

export default function ProductionGapsPage() {
  const [selected, setSelected] = useState(rows[0]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>SOC Production Gaps</h1>
          <p>Production SOC capabilities now organized as implemented workspaces and control records.</p>
        </div>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card"><span>Seeded Gaps</span><strong>{rows.length}</strong><small>Production records</small></div>
        <div className="kpi-card"><span>Highest Risk</span><strong>SOAR</strong><small>Containment guardrails</small></div>
        <div className="kpi-card"><span>Readiness</span><strong>Implemented</strong><small>Controls need live credentials</small></div>
      </section>

      <section className="panel">
        <h2>{selected[0]}</h2>
        <p><strong>Domain:</strong> {selected[1]}</p>
        <p>{selected[2]}</p>
        <p><strong>Status:</strong> {selected[3]}</p>
      </section>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Domain</th>
              <th>Production Capability</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} onClick={() => setSelected(row)}>
                <td><strong>{row[0]}</strong></td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
