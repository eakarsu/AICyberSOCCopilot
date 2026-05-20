import React, { useEffect, useRef, useState } from 'react';
import { attachmentsApi, canWrite } from '../services/api';

export default function AttachmentsWidget({ ownerCollection, ownerId }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const writable = canWrite();

  const reload = async () => {
    if (!ownerCollection || ownerId === undefined || ownerId === null) return;
    try { setItems(await attachmentsApi.list(ownerCollection, ownerId)); setError(null); }
    catch (e) { setError(e.message); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [ownerCollection, ownerId]);

  const onPick = () => fileRef.current && fileRef.current.click();
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try { await attachmentsApi.upload(f, ownerCollection, ownerId); reload(); }
    catch (err) { alert(err.message); }
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!ownerCollection || ownerId === undefined || ownerId === null) return null;

  return (
    <div className="form-group full" style={{ marginTop: 12, borderTop: '1px solid #1e293b', paddingTop: 10 }}>
      <label>Attachments</label>
      {error && <div className="ai-error" style={{ marginBottom: 8 }}>{error}</div>}
      {items.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No attachments yet.</div>}
      {items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0', fontSize: 13 }}>
          {items.map((a) => (
            <li key={a.id} style={{ padding: '4px 0' }}>
              <a href={attachmentsApi.fileUrl(a.id)} target="_blank" rel="noreferrer">{a.filename}</a>
              <span style={{ color: '#64748b', marginLeft: 8 }}>
                {(a.size / 1024).toFixed(1)} KB · {a.mime || 'unknown'} · {a.uploaded_by}
              </span>
            </li>
          ))}
        </ul>
      )}
      {writable && (
        <div style={{ marginTop: 8 }}>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFile} />
          <button type="button" className="btn-secondary" onClick={onPick}>Upload File</button>
        </div>
      )}
    </div>
  );
}
