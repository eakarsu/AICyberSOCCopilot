import React, { useEffect, useState } from 'react';
import { customViewsApi } from '../services/api';

// NON-VIZ #2 — SOC playbook rules editor (CRUD alert → action).
const EMPTY = {
  name: '',
  alert_pattern: '',
  severity: 'medium',
  action: 'isolate_host',
  target: 'SOAR',
  enabled: true,
  notes: '',
};

export default function PlaybookRulesEditor() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // rule id or 'new'
  const [draft, setDraft] = useState(EMPTY);

  const load = () => {
    setLoading(true); setErr(null);
    customViewsApi.rules.list()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  };
  useEffect(load, []);

  const startNew = () => { setEditing('new'); setDraft(EMPTY); };
  const startEdit = (r) => { setEditing(r.id); setDraft({
    name: r.name, alert_pattern: r.alert_pattern, severity: r.severity,
    action: r.action, target: r.target, enabled: r.enabled, notes: r.notes,
  }); };
  const cancel = () => { setEditing(null); setDraft(EMPTY); };

  const save = async () => {
    try {
      if (editing === 'new') {
        await customViewsApi.rules.create(draft);
      } else {
        await customViewsApi.rules.update(editing, draft);
      }
      cancel();
      load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete rule?')) return;
    try { await customViewsApi.rules.remove(id); load(); }
    catch (e) { setErr(e.message); }
  };

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div
      data-testid="playbook-rules-editor"
      style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>SOC Playbook Rules</h3>
        <button
          onClick={startNew}
          data-testid="rule-new"
          style={{
            padding: '6px 12px', borderRadius: 6, background: '#0ea5e9',
            border: 'none', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}
        >
          + New rule
        </button>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading rules…</div>}
      {err     && <div style={{ color: '#fda4af', marginBottom: 8 }}>Error: {err}</div>}

      {data && (
        <>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            {data.total} rules · alert → action mapping
          </div>

          {editing !== null && (
            <div
              style={{
                background: 'rgba(2,6,23,0.7)',
                border: '1px solid rgba(14,165,233,0.4)',
                borderRadius: 10,
                padding: 12,
                marginBottom: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              <label style={{ fontSize: 11, color: '#94a3b8' }}>
                Name
                <input
                  value={draft.name}
                  onChange={(e) => setField('name', e.target.value)}
                  data-testid="rule-field-name"
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>
                Alert pattern
                <input
                  value={draft.alert_pattern}
                  onChange={(e) => setField('alert_pattern', e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>
                Severity
                <select value={draft.severity} onChange={(e) => setField('severity', e.target.value)} style={inputStyle}>
                  {data.severities.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>
                Action
                <select value={draft.action} onChange={(e) => setField('action', e.target.value)} style={inputStyle}>
                  {data.actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>
                Target
                <input value={draft.target} onChange={(e) => setField('target', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={!!draft.enabled}
                  onChange={(e) => setField('enabled', e.target.checked)}
                />
                Enabled
              </label>
              <label style={{ fontSize: 11, color: '#94a3b8', gridColumn: '1 / -1' }}>
                Notes
                <textarea
                  value={draft.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                <button onClick={save} data-testid="rule-save" style={btnPrimary}>Save</button>
                <button onClick={cancel} style={btnGhost}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Pattern</th>
                  <th style={th}>Severity</th>
                  <th style={th}>Action</th>
                  <th style={th}>Target</th>
                  <th style={th}>On</th>
                  <th style={th}>—</th>
                </tr>
              </thead>
              <tbody>
                {data.rules.map((r) => (
                  <tr key={r.id} data-testid={`rule-row-${r.id}`} style={{ borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                    <td style={td}>{r.name}</td>
                    <td style={td}><code style={{ color: '#a7f3d0' }}>{r.alert_pattern || '—'}</code></td>
                    <td style={td}><span style={sevBadge(r.severity)}>{r.severity}</span></td>
                    <td style={td}>{r.action}</td>
                    <td style={td}>{r.target}</td>
                    <td style={td}>{r.enabled ? 'yes' : 'no'}</td>
                    <td style={td}>
                      <button onClick={() => startEdit(r)} style={btnSmall}>edit</button>{' '}
                      <button onClick={() => remove(r.id)} style={{ ...btnSmall, background: '#7f1d1d' }}>del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  marginTop: 4,
  padding: '6px 8px',
  borderRadius: 6,
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(148,163,184,0.3)',
  color: '#e2e8f0',
  fontSize: 12,
};
const btnPrimary = {
  padding: '6px 14px', borderRadius: 6, background: '#22c55e',
  border: 'none', color: '#0f172a', fontWeight: 700, fontSize: 12, cursor: 'pointer',
};
const btnGhost = {
  padding: '6px 14px', borderRadius: 6, background: 'transparent',
  border: '1px solid rgba(148,163,184,0.4)', color: '#cbd5e1', fontSize: 12, cursor: 'pointer',
};
const btnSmall = {
  padding: '3px 8px', borderRadius: 4, background: '#334155',
  border: 'none', color: '#e2e8f0', fontSize: 11, cursor: 'pointer',
};
const th = { padding: '6px 8px', fontWeight: 600 };
const td = { padding: '6px 8px', color: '#e2e8f0' };
const SEVERITY_BG = {
  critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#38bdf8',
};
const sevBadge = (s) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  background: SEVERITY_BG[s] || '#64748b', color: '#0f172a',
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
});
