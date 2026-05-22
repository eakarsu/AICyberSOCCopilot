import React, { useEffect, useState } from 'react';
import { integrationsStatus } from '../services/api';

function StatusTable({ title, rows }) {
  return (
    <>
      <h3 style={{ marginTop: 24 }}>{title}</h3>
      <div className="data-table-container" style={{ marginBottom: 20 }}>
        <table className="data-table">
          <thead>
            <tr><th>Vendor</th><th>Configured</th><th>URL</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>No surfaces.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.vendor}>
                <td style={{ fontWeight: 600 }}>{r.vendor}</td>
                <td>
                  <span className={`status-badge st-${r.configured ? 'active' : 'paused'}`}>
                    {r.configured ? 'credentialed' : 'NEEDS-CREDS'}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.url || `${r.push || ''}${r.push && r.pull ? '  ·  ' : ''}${r.pull || ''}`}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{r.note || (r.configured ? 'Live (signature verification on).' : '503 stub until env var provisioned.')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function IntegrationsPage() {
  const [siem, setSiem] = useState(null);
  const [ticketing, setTicketing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([integrationsStatus.siem(), integrationsStatus.ticketing()]);
        setSiem(s); setTicketing(t);
      } catch (e) { setError(e.message); }
    })();
  }, []);

  const siemRows = siem ? Object.entries(siem).map(([vendor, v]) => ({ vendor, ...v })) : [];
  const ticketingRows = ticketing ? Object.entries(ticketing).map(([vendor, v]) => ({ vendor, ...v })) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>External Integrations</h2>
          <p>
            SIEM/EDR vendor ingest + ticketing connectors. Each surface returns <code>503</code> with a
            clear <code>next_step</code> until the matching env credential is provisioned.
          </p>
        </div>
      </div>
      {error && <div className="ai-error" style={{ marginBottom: 14 }}>{error}</div>}
      <StatusTable title="SIEM / EDR Ingest (HMAC-verified)" rows={siemRows} />
      <StatusTable title="Ticketing Connectors (push / pull)" rows={ticketingRows} />
    </div>
  );
}
