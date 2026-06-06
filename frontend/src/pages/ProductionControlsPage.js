import React, { useState } from 'react';

const controls = [
  ['SOC Identity & Access', 'IAM', 'SSO/MFA rollout, analyst roles, privileged action review, break-glass access, and quarterly access certification', 'Implemented surface'],
  ['Security Data Connector Ops', 'Integrations', 'SIEM, EDR, cloud, IAM, ticketing, threat intel, and SOAR connector ownership with retry queues', 'Implemented surface'],
  ['SOC Audit Export Center', 'Governance', 'Analyst decisions, containment actions, approvals, evidence, and compliance export packages', 'Implemented surface'],
  ['Notification Delivery Ledger', 'Response', 'Paging, chat, email, webhook, ticket escalation, failed delivery retries, and acknowledgements', 'Implemented surface'],
  ['Observability & Runbooks', 'Operations', 'Ingestion lag, automation failures, queue depth, model latency, and incident support runbooks', 'Implemented surface'],
  ['Release Test Harness', 'Quality', 'Detection tests, playbook checks, permission regression, connector smoke tests, and browser gates', 'Implemented surface'],
];

export default function ProductionControlsPage() {
  const [selected, setSelected] = useState(controls[0]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>SOC Production Controls</h1>
          <p>Operational controls needed to run the SOC copilot with production integrations, governance, and release gates.</p>
        </div>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card"><span>Controls</span><strong>{controls.length}</strong><small>Production workspaces</small></div>
        <div className="kpi-card"><span>Critical Path</span><strong>SIEM</strong><small>Ingestion and SOAR</small></div>
        <div className="kpi-card"><span>Launch Gate</span><strong>Active</strong><small>Tests and audit evidence</small></div>
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
            {controls.map((row) => (
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
