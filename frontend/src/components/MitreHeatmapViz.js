import React, { useEffect, useState } from 'react';
import { customViewsApi } from '../services/api';

// VIZ #2 — MITRE ATT&CK technique heatmap. Tactic columns x technique rows
// where each cell color intensity = score / max_score.
function intensityColor(i) {
  // i in [0,1] → blue (#0ea5e9) at 0 → red (#ef4444) at 1
  const r = Math.round(14 + (239 - 14) * i);
  const g = Math.round(165 + (68 - 165) * i);
  const b = Math.round(233 + (68 - 233) * i);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function MitreHeatmapViz() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    customViewsApi.mitreHeatmap()
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <div data-testid="mitre-heatmap-loading" style={{ padding: 16, color: '#94a3b8' }}>Loading MITRE heatmap…</div>;
  if (err)     return <div data-testid="mitre-heatmap-error"   style={{ padding: 16, color: '#fda4af' }}>Error: {err}</div>;
  if (!data || !data.tactics) {
    return <div data-testid="mitre-heatmap-empty" style={{ padding: 16, color: '#94a3b8' }}>No data.</div>;
  }

  const { tactics, techniques_per_tactic, cells } = data;
  // Build cell lookup
  const byKey = {};
  cells.forEach((c) => { byKey[`${c.tactic}::${c.technique}`] = c; });

  const maxRows = Math.max(...tactics.map((t) => techniques_per_tactic[t].length));

  return (
    <div
      data-testid="mitre-heatmap-viz"
      style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>MITRE ATT&amp;CK Technique Heatmap</h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {data.evidence.alert_count} alerts · {data.evidence.ioc_count} IOCs analysed
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 4,
            minWidth: 720,
          }}
        >
          <thead>
            <tr>
              {tactics.map((t) => (
                <th
                  key={t}
                  style={{
                    fontSize: 11,
                    color: '#cbd5e1',
                    padding: '6px 4px',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid rgba(148,163,184,0.25)',
                  }}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {tactics.map((tactic) => {
                  const tech = techniques_per_tactic[tactic][rowIdx];
                  if (!tech) {
                    return <td key={tactic + rowIdx} style={{ padding: 0 }} />;
                  }
                  const cell = byKey[`${tactic}::${tech}`];
                  const intensity = cell ? cell.intensity : 0;
                  return (
                    <td
                      key={tactic + tech}
                      data-tactic={tactic}
                      data-technique={tech}
                      data-intensity={intensity}
                      title={`${tactic} · ${tech} · score ${cell?.score ?? 0}`}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: intensityColor(intensity),
                        color: intensity > 0.55 ? '#fff' : '#0f172a',
                        fontSize: 11,
                        fontWeight: 600,
                        minWidth: 70,
                        textAlign: 'center',
                      }}
                    >
                      {tech}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
        <span>low</span>
        <div
          style={{
            flex: '0 0 220px',
            height: 8,
            borderRadius: 4,
            background: 'linear-gradient(to right, rgb(14,165,233), rgb(239,68,68))',
          }}
        />
        <span>high</span>
      </div>
    </div>
  );
}
