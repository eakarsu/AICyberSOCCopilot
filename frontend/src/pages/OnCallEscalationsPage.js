import React, { useEffect, useState } from 'react';
import { onCallApi, canWrite } from '../services/api';

export default function OnCallEscalationsPage() {
  const [policies, setPolicies] = useState([]);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);
  const writer = canWrite();

  const [polForm, setPolForm] = useState({ name: '', chain_csv: '', ack_window_minutes: 10 });
  const [pageForm, setPageForm] = useState({ policy_id: '', incident_id: '', severity: 'P2', message: '' });
  const [overrideId, setOverrideId] = useState(null);
  const [overrideTo, setOverrideTo] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const reload = async () => {
    try {
      const [p, pg] = await Promise.all([onCallApi.policies.list(), onCallApi.pages.list()]);
      setPolicies(p);
      setPages(pg);
      setError(null);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { reload(); }, []);

  const createPolicy = async () => {
    try {
      const chain = polForm.chain_csv.split(',').map((s) => s.trim()).filter(Boolean);
      await onCallApi.policies.create({
        name: polForm.name || 'Default policy',
        chain,
        ack_window_minutes: parseInt(polForm.ack_window_minutes, 10) || 10,
        status: 'active',
      });
      setPolForm({ name: '', chain_csv: '', ack_window_minutes: 10 });
      reload();
    } catch (e) { alert(e.message); }
  };

  const removePolicy = async (id) => {
    if (!window.confirm(`Delete policy ${id}?`)) return;
    try { await onCallApi.policies.remove(id); reload(); } catch (e) { alert(e.message); }
  };

  const firePage = async () => {
    try {
      await onCallApi.pages.page({
        policy_id: pageForm.policy_id,
        incident_id: pageForm.incident_id || null,
        severity: pageForm.severity,
        message: pageForm.message || 'Auto-paged from SOC Copilot',
      });
      setPageForm({ policy_id: '', incident_id: '', severity: 'P2', message: '' });
      reload();
    } catch (e) { alert(e.message); }
  };

  const ack       = async (id) => { try { await onCallApi.pages.ack(id);       reload(); } catch (e) { alert(e.message); } };
  const escalate  = async (id) => { try { await onCallApi.pages.escalate(id);  reload(); } catch (e) { alert(e.message); } };
  const resolve   = async (id) => { try { await onCallApi.pages.resolve(id);   reload(); } catch (e) { alert(e.message); } };
  const submitOverride = async () => {
    try {
      await onCallApi.pages.override(overrideId, overrideTo, overrideReason);
      setOverrideId(null); setOverrideTo(''); setOverrideReason('');
      reload();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>On-Call Escalations</h2>
          <p>Escalation policies (chain + ack window) and live page events on top of the shift roster.</p>
        </div>
      </div>

      {error && <div className="ai-error" style={{ marginBottom: 14 }}>{error}</div>}

      {writer && (
        <div className="ai-input-card" style={{ marginBottom: 20 }}>
          <h3>New Policy</h3>
          <div className="form-group"><label>Name</label>
            <input value={polForm.name} onChange={(e) => setPolForm({ ...polForm, name: e.target.value })} placeholder="P1-Critical chain" /></div>
          <div className="form-group"><label>Chain (comma-separated analyst handles)</label>
            <input value={polForm.chain_csv} onChange={(e) => setPolForm({ ...polForm, chain_csv: e.target.value })} placeholder="primary-soc-l2, ir-lead, ciso-on-call" /></div>
          <div className="form-group"><label>Ack window (minutes)</label>
            <input type="number" value={polForm.ack_window_minutes} onChange={(e) => setPolForm({ ...polForm, ack_window_minutes: e.target.value })} /></div>
          <button className="btn-primary" onClick={createPolicy}>Create policy</button>
        </div>
      )}

      <h3>Escalation Policies</h3>
      <div className="data-table-container" style={{ marginBottom: 30 }}>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Policy ID</th><th>Name</th><th>Chain</th><th>Ack window</th><th>Status</th>{writer && <th></th>}</tr>
          </thead>
          <tbody>
            {policies.length === 0 && (
              <tr><td colSpan={writer ? 7 : 6} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>No policies configured.</td></tr>
            )}
            {policies.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.policy_id}</td>
                <td>{p.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{(Array.isArray(p.chain) ? p.chain : []).join(' → ') || '(empty)'}</td>
                <td>{p.ack_window_minutes} min</td>
                <td><span className={`status-badge st-${p.status}`}>{p.status}</span></td>
                {writer && (<td><button className="btn-icon danger" onClick={() => removePolicy(p.id)}>Del</button></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {writer && (
        <div className="ai-input-card" style={{ marginBottom: 20 }}>
          <h3>Fire a Page</h3>
          <div className="form-group"><label>Policy ID</label>
            <select value={pageForm.policy_id} onChange={(e) => setPageForm({ ...pageForm, policy_id: e.target.value })}>
              <option value="">— pick a policy —</option>
              {policies.map((p) => <option key={p.id} value={p.policy_id}>{p.policy_id} — {p.name}</option>)}
            </select></div>
          <div className="form-group"><label>Incident ID (optional)</label>
            <input value={pageForm.incident_id} onChange={(e) => setPageForm({ ...pageForm, incident_id: e.target.value })} placeholder="INC-1042" /></div>
          <div className="form-group"><label>Severity</label>
            <select value={pageForm.severity} onChange={(e) => setPageForm({ ...pageForm, severity: e.target.value })}>
              <option>P1</option><option>P2</option><option>P3</option><option>P4</option>
            </select></div>
          <div className="form-group"><label>Message</label>
            <input value={pageForm.message} onChange={(e) => setPageForm({ ...pageForm, message: e.target.value })} placeholder="Ransomware suspected on FILE-SRV-02" /></div>
          <button className="btn-primary" onClick={firePage} disabled={!pageForm.policy_id}>Fire page</button>
        </div>
      )}

      <h3>Page Events</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Page ID</th><th>Policy</th><th>Sev</th><th>Step</th><th>Status</th><th>Ack deadline</th><th>Notes</th>{writer && <th></th>}</tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr><td colSpan={writer ? 9 : 8} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>No pages fired yet.</td></tr>
            )}
            {pages.map((p) => {
              const chain = Array.isArray(p.chain_snapshot)
                ? p.chain_snapshot
                : (() => { try { return JSON.parse(p.chain_snapshot || '[]'); } catch (_) { return []; } })();
              return (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.page_id}</td>
                  <td>{p.policy_id}</td>
                  <td>{p.severity}</td>
                  <td>{(p.current_step || 0) + 1} / {chain.length || '?'} <small>({chain[p.current_step] || '—'})</small></td>
                  <td><span className={`status-badge st-${p.status}`}>{p.status}</span></td>
                  <td>{p.ack_deadline ? new Date(p.ack_deadline).toLocaleString() : '—'}</td>
                  <td style={{ fontSize: 12 }}>
                    {p.acked_by && <div>acked by {p.acked_by}</div>}
                    {p.override_to && <div>overridden → {p.override_to}</div>}
                    {p.resolved_by && <div>resolved by {p.resolved_by}</div>}
                  </td>
                  {writer && (
                    <td>
                      {p.status === 'firing' || p.status === 'escalated' ? (
                        <>
                          <button className="btn-icon" onClick={() => ack(p.id)}>Ack</button>{' '}
                          <button className="btn-icon" onClick={() => escalate(p.id)}>Esc</button>{' '}
                          <button className="btn-icon" onClick={() => setOverrideId(p.id)}>Ovr</button>{' '}
                        </>
                      ) : null}
                      {p.status !== 'resolved' && <button className="btn-icon" onClick={() => resolve(p.id)}>Res</button>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {overrideId && (
        <div className="ai-input-card" style={{ marginTop: 20 }}>
          <h3>Override page #{overrideId}</h3>
          <div className="form-group"><label>Override to (analyst handle)</label>
            <input value={overrideTo} onChange={(e) => setOverrideTo(e.target.value)} placeholder="ir-lead-backup" /></div>
          <div className="form-group"><label>Reason</label>
            <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Primary on PTO; backup taking page." /></div>
          <button className="btn-primary" onClick={submitOverride} disabled={!overrideTo}>Submit override</button>{' '}
          <button className="btn-secondary" onClick={() => setOverrideId(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
