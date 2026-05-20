import React, { useEffect, useState } from 'react';
import { webhooksApi, isAdmin } from '../services/api';

export default function WebhooksPage() {
  const [items, setItems] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [form, setForm] = useState({ url: '', event_types_csv: '*', status: 'active' });
  const [error, setError] = useState(null);
  const admin = isAdmin();

  const reload = async () => {
    try {
      setItems(await webhooksApi.list());
      setDeliveries(await webhooksApi.deliveries());
      setError(null);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { reload(); }, []);

  const create = async () => {
    try {
      const event_types = form.event_types_csv.split(',').map((s) => s.trim()).filter((s) => s && s !== '*');
      await webhooksApi.create({ url: form.url, event_types, status: form.status });
      setForm({ url: '', event_types_csv: '*', status: 'active' });
      reload();
    } catch (e) { alert(e.message); }
  };

  const test = async () => {
    try { await webhooksApi.test('test.ping', { source: 'webhooks-page' }); alert('Test fired.'); reload(); }
    catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete webhook ${id}?`)) return;
    try { await webhooksApi.remove(id); reload(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Webhooks</h2>
          <p>Outbound HMAC-signed event delivery. Fired on high-signal CRUD writes and AI completions.</p>
        </div>
        {admin && (
          <div className="page-actions">
            <button className="btn-secondary" onClick={test}>Fire Test Event</button>
          </div>
        )}
      </div>

      {error && <div className="ai-error" style={{ marginBottom: 14 }}>{error}</div>}

      {admin && (
        <div className="ai-input-card" style={{ marginBottom: 20 }}>
          <h3>New Webhook</h3>
          <div className="form-group"><label>Target URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.example.com/soc" /></div>
          <div className="form-group"><label>Event types (comma; * = all)</label>
            <input value={form.event_types_csv} onChange={(e) => setForm({ ...form, event_types_csv: e.target.value })} placeholder="incidents.created, alerts.created, ai.triage-alerts.completed" /></div>
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">active</option><option value="paused">paused</option>
            </select></div>
          <button className="btn-primary" onClick={create} disabled={!form.url}>Create</button>
        </div>
      )}

      <h3>Subscriptions</h3>
      <div className="data-table-container" style={{ marginBottom: 30 }}>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>URL</th><th>Events</th><th>Status</th><th>Created</th>{admin && <th></th>}</tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={admin ? 6 : 5} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>No webhooks configured.</td></tr>
            )}
            {items.map((w) => (
              <tr key={w.id}>
                <td>{w.id}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{w.url}</td>
                <td>{(w.event_types || []).join(', ') || '* (all)'}</td>
                <td><span className={`status-badge st-${w.status}`}>{w.status}</span></td>
                <td>{new Date(w.created_at).toLocaleString()}</td>
                {admin && (<td><button className="btn-icon danger" onClick={() => remove(w.id)}>Del</button></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Recent Deliveries</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Hook</th><th>Event</th><th>Status</th><th>Code</th><th>When</th></tr>
          </thead>
          <tbody>
            {deliveries.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>No deliveries yet.</td></tr>
            )}
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.webhook_id}</td>
                <td>{d.event_type}</td>
                <td><span className={`status-badge st-${d.success ? 'success' : 'failed'}`}>{d.success ? 'ok' : 'fail'}</span></td>
                <td>{d.status_code}</td>
                <td>{new Date(d.delivered_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
