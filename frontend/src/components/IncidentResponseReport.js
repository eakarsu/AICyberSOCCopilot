import React, { useEffect, useState } from 'react';
import { customViewsApi } from '../services/api';

// NON-VIZ #1 — Incident Response report (printable / save-as-PDF).
export default function IncidentResponseReport() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [incidentId, setIncidentId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (id) => {
    setLoading(true);
    setErr(null);
    customViewsApi.irReport(id || undefined)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || 'IR-Report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family: ui-monospace, Menlo, monospace; padding:24px;">${
      data.content.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    }</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div
      data-testid="ir-report"
      style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Incident Response Report</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Incident id (optional)"
            value={incidentId}
            onChange={(e) => setIncidentId(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(148,163,184,0.3)',
              color: '#e2e8f0',
              fontSize: 12,
            }}
          />
          <button
            onClick={() => load(incidentId)}
            data-testid="ir-report-reload"
            style={{
              padding: '6px 12px', borderRadius: 6, background: '#0ea5e9',
              border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <button
            onClick={handleDownload}
            disabled={!data}
            data-testid="ir-report-download"
            style={{
              padding: '6px 12px', borderRadius: 6, background: '#22c55e',
              border: 'none', color: '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            Download .txt
          </button>
          <button
            onClick={handlePrint}
            disabled={!data}
            style={{
              padding: '6px 12px', borderRadius: 6, background: '#f59e0b',
              border: 'none', color: '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Generating report…</div>}
      {err && <div style={{ color: '#fda4af' }}>Error: {err}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: '#cbd5e1' }}>
            <span>Incident: <strong>{data.incident.incident_id}</strong></span>
            <span>Severity: <strong>{(data.incident.severity || '—').toUpperCase()}</strong></span>
            <span>Status: <strong>{data.incident.status || '—'}</strong></span>
            <span>Lines: <strong>{data.stats.lines}</strong></span>
            <span>Alerts: <strong>{data.stats.alerts}</strong></span>
            <span>IOCs: <strong>{data.stats.iocs}</strong></span>
          </div>
          <pre
            data-testid="ir-report-content"
            style={{
              background: '#0b1220',
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 8,
              padding: 14,
              color: '#e2e8f0',
              fontSize: 12,
              maxHeight: 360,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.content}
          </pre>
        </>
      )}
    </div>
  );
}
