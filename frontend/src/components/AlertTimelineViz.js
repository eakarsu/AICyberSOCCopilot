import React, { useEffect, useState } from 'react';
import { customViewsApi } from '../services/api';

// VIZ #1 — Severity-colored alert timeline. Renders alerts as colored dots on
// a horizontal time axis. Pure inline-SVG, no external chart libs.
export default function AlertTimelineViz() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    customViewsApi.alertTimeline()
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <div data-testid="alert-timeline-loading" style={{ padding: 16, color: '#94a3b8' }}>Loading alert timeline…</div>;
  if (err)     return <div data-testid="alert-timeline-error"   style={{ padding: 16, color: '#fda4af' }}>Error: {err}</div>;
  if (!data || !data.points || !data.points.length) {
    return <div data-testid="alert-timeline-empty" style={{ padding: 16, color: '#94a3b8' }}>No alerts.</div>;
  }

  const points = data.points;
  const W = 880;
  const H = 220;
  const PAD_L = 60;
  const PAD_R = 24;
  const PAD_T = 30;
  const PAD_B = 36;
  const minT = new Date(points[0].timestamp).getTime();
  const maxT = new Date(points[points.length - 1].timestamp).getTime();
  const span = Math.max(1, maxT - minT);

  const lanes = ['critical', 'high', 'medium', 'low', 'info'];
  const laneY = (sev) => {
    const i = lanes.indexOf(sev);
    return PAD_T + (i === -1 ? 2 : i) * ((H - PAD_T - PAD_B) / (lanes.length - 1));
  };

  return (
    <div
      data-testid="alert-timeline-viz"
      style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Alert Timeline</h3>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{data.total} alerts · severity-colored</div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Alert timeline">
        {/* lane lines */}
        {lanes.map((sev) => (
          <g key={sev}>
            <line
              x1={PAD_L} x2={W - PAD_R}
              y1={laneY(sev)} y2={laneY(sev)}
              stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3"
            />
            <text x={6} y={laneY(sev) + 4} fontSize="11" fill="#94a3b8">{sev}</text>
          </g>
        ))}

        {/* x-axis */}
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="rgba(148,163,184,0.4)" />
        <text x={PAD_L} y={H - 10} fontSize="11" fill="#94a3b8">
          {new Date(minT).toLocaleString()}
        </text>
        <text x={W - PAD_R} y={H - 10} fontSize="11" fill="#94a3b8" textAnchor="end">
          {new Date(maxT).toLocaleString()}
        </text>

        {/* points */}
        {points.map((p) => {
          const t = new Date(p.timestamp).getTime();
          const x = PAD_L + ((t - minT) / span) * (W - PAD_L - PAD_R);
          const y = laneY(p.severity);
          return (
            <g key={`${p.id}-${p.alert_id}`}>
              <circle
                cx={x} cy={y} r={6}
                fill={p.color}
                stroke="#0f172a" strokeWidth="1.5"
                data-severity={p.severity}
              >
                <title>{`[${p.severity.toUpperCase()}] ${p.alert_id} · ${p.title}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
        {Object.entries(data.severity_counts).map(([sev, count]) => (
          <span
            key={sev}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(30,41,59,0.7)',
              border: '1px solid rgba(148,163,184,0.25)',
              fontSize: 12,
              color: '#e2e8f0',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: data.severity_palette[sev] }} />
            {sev}: <strong>{count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
