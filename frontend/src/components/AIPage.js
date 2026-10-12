import React, { useEffect, useState } from 'react';
import AIFieldPresets, { completeExample } from './AIFieldPresets';
import AIResultDisplay from './AIResultDisplay';
import { protectPresetRequest } from './SampleIntegrity';
import useCancelableAI from './useCancelableAI';
import { aiHistory, aiSamples } from '../services/api';

function AIPage({ title, description, inputs, runner, defaultInput, feature }) {
  const [body, setBody] = useState(defaultInput || {});
  const aiRequest = useCancelableAI();
  const { loading, result, error, setResult, setError } = aiRequest;



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
  const presetInputs = (inputs || []).map(field => /JSON/i.test(field.label || '') ? { ...field, type: 'json' } : field);

  const applySample = (sample, index = 0) => {
    setBody(protectPresetRequest(completeExample(presetInputs, sample || {}, index, title, body), body));
    setResult(null); setError(null);
  };

  const run = async () => aiRequest.run((options) => runner(body, options));

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
    <div className="sr-ai-workspace">
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

          <AIFieldPresets
            fields={presetInputs}
            samples={samples}
            context={title}
            disabled={loading}
            onFill={applySample}
          />
          {aiRequest.notice && <div className="sr-notice" role="status">{aiRequest.notice}</div>}
          {samplesError && (
            <div style={{ fontSize: 12, color: '#a00', marginBottom: 8 }}>
              Could not load samples: {samplesError}
            </div>
          )}

          {(inputs || []).map((field) => {
            const fieldType = field.type || field.kind || 'text';
            return (
              <div key={field.name} className="form-group">
                <label htmlFor={`ai-field-${field.name}`}>{field.label}</label>
                {fieldType === 'textarea' ? (
                  <textarea
                    id={`ai-field-${field.name}`}
                    value={body[field.name] ?? ''}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    placeholder={field.placeholder || ''}
                  />
                ) : fieldType === 'select' ? (
                  <select
                    id={`ai-field-${field.name}`}
                    value={body[field.name] ?? ''}
                    onChange={(event) => onChange(field.name, event.target.value)}
                  >
                    {(field.options || []).map((option) => {
                      const value = typeof option === 'object' ? option.value ?? option.id ?? option.label : option;
                      const label = typeof option === 'object' ? option.label ?? value : option;
                      return <option key={String(value)} value={value}>{label}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    id={`ai-field-${field.name}`}
                    type={fieldType === 'number' ? 'number' : 'text'}
                    min={field.min}
                    max={field.max}
                    value={body[field.name] ?? ''}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    placeholder={field.placeholder || ''}
                  />
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn-ai" onClick={run} disabled={loading}>
              {loading ? 'Running...' : 'Generate with OpenRouter'}
            </button>
            {loading && (
              <button type="button" className="btn secondary btn-secondary" onClick={aiRequest.cancel}>
                Cancel
              </button>
            )}
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
