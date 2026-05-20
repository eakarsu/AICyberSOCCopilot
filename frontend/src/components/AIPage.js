import React, { useState, useEffect } from 'react';
import AIResultDisplay from './AIResultDisplay';
import { aiHistory, aiSamples } from '../services/api';

function AIPage({ title, description, inputs, runner, defaultInput, feature }) {
  const [body, setBody] = useState(defaultInput || {});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyView, setHistoryView] = useState(null); // selected row to view

  // Sample Fill scenarios (fetched once on mount per `feature`)
  const [samples, setSamples] = useState([]);
  const [samplesError, setSamplesError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!feature) return undefined;
    aiSamples(feature)
      .then((r) => { if (!cancelled) setSamples(Array.isArray(r?.samples) ? r.samples : []); })
      .catch((e) => { if (!cancelled) setSamplesError(e.message); });
    return () => { cancelled = true; };
  }, [feature]);

  const onChange = (k, v) => setBody((p) => ({ ...p, [k]: v }));

  // Replace the form body with the sample's values (only keys present in the
  // sample are set, so empty-values samples are a no-op for input-less pages).
  const applySample = (sample) => {
    setBody({ ...(sample && sample.values ? sample.values : {}) });
  };

  const hasInputs = Array.isArray(inputs) && inputs.length > 0;

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await runner(body);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryView(null);
    try {
      const rows = await aiHistory(feature, 25);
      setHistory(rows);
    } catch (e) {
      setHistoryError(e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={openHistory}>History</button>
        </div>
      </div>

      <div className="ai-page-grid two-col">
        <div className="ai-input-card">
          <h3>Run AI Copilot</h3>
          <p className="desc">Inputs are optional - leave blank to use defaults / live DB data.</p>

          {hasInputs && samples.length > 0 && (
            <div className="sample-fill-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#666', alignSelf: 'center', marginRight: 4 }}>Sample Fill:</span>
              {samples.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn-secondary btn-sample"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => applySample(s)}
                  title={`Fill form with: ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {samplesError && (
            <div style={{ fontSize: 12, color: '#a00', marginBottom: 8 }}>
              Could not load samples: {samplesError}
            </div>
          )}

          {(inputs || []).map((f) => (
            <div key={f.name} className="form-group">
              <label>{f.label}</label>
              {f.kind === 'textarea'
                ? <textarea value={body[f.name] || ''} onChange={(e) => onChange(f.name, e.target.value)} placeholder={f.placeholder || ''} />
                : <input type="text" value={body[f.name] || ''} onChange={(e) => onChange(f.name, e.target.value)} placeholder={f.placeholder || ''} />
              }
            </div>
          ))}

          <div style={{ marginTop: 14 }}>
            <button className="btn-ai" onClick={run} disabled={loading}>
              {loading ? 'Running...' : 'Run AI Copilot'}
            </button>
          </div>
        </div>

        <div>
          {!result && !loading && !error && (
            <div className="empty-card">Run the copilot to see structured AI results here.</div>
          )}
          <AIResultDisplay result={result} loading={loading} error={error} />
        </div>
      </div>

      {historyOpen && (
        <div className="modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI Result History {feature ? `— ${feature}` : ''}</h3>
              <button className="modal-close" onClick={() => setHistoryOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {historyLoading && <div className="ai-loading"><div className="spinner" /><p>Loading history...</p></div>}
              {historyError && <div className="ai-error">{historyError}</div>}
              {!historyLoading && !historyError && history.length === 0 && (
                <div className="empty-card">No past results for this feature yet.</div>
              )}
              {!historyLoading && !historyError && history.length > 0 && !historyView && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th>Feature</th>
                      <th>By</th>
                      <th>When</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.id}</td>
                        <td>{h.feature}</td>
                        <td>{h.created_by || '—'}</td>
                        <td>{new Date(h.created_at).toLocaleString()}</td>
                        <td><button className="btn-icon" onClick={() => setHistoryView(h)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {historyView && (
                <div>
                  <button className="btn-icon" onClick={() => setHistoryView(null)} style={{ marginBottom: 12 }}>← Back to list</button>
                  {historyView.input && Object.keys(historyView.input || {}).length > 0 && (
                    <div className="ai-section">
                      <div className="ai-section-title">Input</div>
                      <pre className="ai-raw-pre">{JSON.stringify(historyView.input, null, 2)}</pre>
                    </div>
                  )}
                  <AIResultDisplay result={historyView.result} loading={false} error={null} />
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setHistoryOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIPage;
