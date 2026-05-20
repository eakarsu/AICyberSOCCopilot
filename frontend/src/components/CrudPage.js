import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { canWrite } from '../services/api';
import AttachmentsWidget from './AttachmentsWidget';

const SEVERITY_OPTS = ['low', 'medium', 'high', 'critical'];
const PAGE_SIZE = 25;

function fmtCell(field, value, row) {
  if (value === null || value === undefined || value === '') return '—';

  if (field.kind === 'severity') {
    return <span className={`severity-badge sev-${value}`}>{value}</span>;
  }
  if (field.kind === 'status') {
    return <span className={`status-badge st-${value}`}>{value}</span>;
  }
  if (field.kind === 'criticality') {
    return <span className={`severity-badge crit-${value}`}>{value}</span>;
  }
  if (field.kind === 'result') {
    return <span className={`status-badge st-${value}`}>{value}</span>;
  }
  if (field.kind === 'bool') {
    return value ? <span className="status-badge st-success">yes</span> : <span style={{ color: '#64748b' }}>no</span>;
  }
  if (field.kind === 'datetime') {
    try { return new Date(value).toLocaleString(); } catch (_) { return String(value); }
  }
  if (field.kind === 'confidence') {
    const n = Number(value);
    return <span className="confidence-badge st-investigating">{n.toFixed(2)}</span>;
  }
  if (field.kind === 'truncate') {
    const s = String(value);
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  }
  return String(value);
}

function FieldInput({ field, value, onChange }) {
  const v = value ?? '';
  if (field.kind === 'severity') {
    return (
      <select value={v || 'medium'} onChange={(e) => onChange(field.name, e.target.value)}>
        {SEVERITY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.kind === 'criticality') {
    return (
      <select value={v || 'medium'} onChange={(e) => onChange(field.name, e.target.value)}>
        {SEVERITY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.kind === 'bool') {
    return (
      <select value={v ? 'true' : 'false'} onChange={(e) => onChange(field.name, e.target.value === 'true')}>
        <option value="false">no</option>
        <option value="true">yes</option>
      </select>
    );
  }
  if (field.options) {
    return (
      <select value={v} onChange={(e) => onChange(field.name, e.target.value)}>
        <option value="">(none)</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.kind === 'number' || field.kind === 'confidence') {
    return (
      <input
        type="number"
        step={field.kind === 'confidence' ? '0.01' : '1'}
        value={v}
        onChange={(e) => onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }
  if (field.kind === 'textarea') {
    return <textarea value={v} onChange={(e) => onChange(field.name, e.target.value)} />;
  }
  return <input type="text" value={v} onChange={(e) => onChange(field.name, e.target.value)} />;
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  let s;
  if (typeof v === 'object') {
    try { s = JSON.stringify(v); } catch (_) { s = String(v); }
  } else {
    s = String(v);
  }
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename, rows, fields) {
  const cols = fields.map((f) => f.name);
  const header = fields.map((f) => csvEscape(f.label || f.name)).join(',');
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function CrudPage({
  title,
  description,
  api,
  fields,
  emptyRow,
  attachmentCollection,
}) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const fileInputRef = useRef(null);
  const writable = canWrite();

  const reload = useCallback(async () => {
    try {
      const data = await api.list();
      setItems(data);
      setError(null);
    } catch (e) { setError(e.message); }
  }, [api]);

  useEffect(() => { reload(); }, [reload]);

  const tableFields = fields.filter((f) => !f.hideInTable);
  const formFields = fields.filter((f) => !f.hideInForm);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((row) =>
      Object.values(row).some((v) => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'object') {
          try { return JSON.stringify(v).toLowerCase().includes(q); } catch (_) { return false; }
        }
        return String(v).toLowerCase().includes(q);
      })
    );
  }, [items, search]);

  useEffect(() => { setPage(1); }, [search, items.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const onChange = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const openNew = () => { setForm({ ...emptyRow }); setShowNew(true); setEditing(null); };
  const openEdit = (row) => { setForm({ ...row }); setEditing(row); setShowNew(false); };
  const close = () => { setEditing(null); setShowNew(false); setForm({}); };

  const save = async () => {
    try {
      if (editing) await api.update(editing.id, form);
      else await api.create(form);
      close();
      reload();
    } catch (e) { alert(e.message); }
  };

  const del = async (row) => {
    if (!window.confirm(`Delete this record (${row.id})?`)) return;
    try { await api.remove(row.id); reload(); } catch (e) { alert(e.message); }
  };

  const exportCsv = () => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsv(`${slug}-${ts}.csv`, filtered, fields);
  };

  const onImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const result = await api.bulkImport(file);
      alert(`Imported ${result.inserted}/${result.total} rows.${result.errors?.length ? ` (${result.errors.length} errors)` : ''}`);
      reload();
    } catch (err) { alert(err.message); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV
          </button>
          {writable && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={onImportFile}
              />
              <button className="btn-secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                Import CSV
              </button>
              <button className="btn-new" onClick={openNew}>+ New</button>
            </>
          )}
        </div>
      </div>

      <div className="crud-toolbar">
        <input
          className="crud-search"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="crud-toolbar-meta">
          {filtered.length} {filtered.length === 1 ? 'row' : 'rows'}
          {search && items.length !== filtered.length && ` (of ${items.length})`}
          {!writable && <span style={{ marginLeft: 12, color: '#94a3b8' }}>(read-only)</span>}
        </div>
      </div>

      {error && <div className="ai-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {tableFields.map((f) => <th key={f.name}>{f.label}</th>)}
              {writable && <th style={{ width: 120 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={tableFields.length + (writable ? 1 : 0)} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>
                {items.length === 0 ? 'No records yet.' : 'No rows match your search.'}
              </td></tr>
            )}
            {pageRows.map((row) => (
              <tr key={row.id} onClick={() => writable && openEdit(row)} style={{ cursor: writable ? 'pointer' : 'default' }}>
                {tableFields.map((f) => <td key={f.name}>{fmtCell(f, row[f.name], row)}</td>)}
                {writable && (
                  <td className="row-inline-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn-icon danger" onClick={() => del(row)}>Del</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="crud-pagination">
        <button
          className="btn-icon"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
        >Prev</button>
        <span className="crud-page-info">Page {safePage} of {pageCount}</span>
        <button
          className="btn-icon"
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={safePage >= pageCount}
        >Next</button>
      </div>

      {(showNew || editing) && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}</h3>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                {formFields.map((f) => (
                  <div key={f.name} className={`form-group ${f.kind === 'textarea' ? 'full' : ''}`}>
                    <label>{f.label}{f.required && ' *'}</label>
                    <FieldInput field={f} value={form[f.name]} onChange={onChange} />
                  </div>
                ))}
                {editing && attachmentCollection && (
                  <AttachmentsWidget ownerCollection={attachmentCollection} ownerId={editing.id} />
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={save}>Save</button>
              <button className="btn-secondary" onClick={close}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrudPage;
