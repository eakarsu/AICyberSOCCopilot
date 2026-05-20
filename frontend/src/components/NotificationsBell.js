import React, { useEffect, useState, useCallback } from 'react';
import { notificationsApi } from '../services/api';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const c = await notificationsApi.unreadCount();
      setCount(c.count || 0);
    } catch (_) { /* swallow */ }
  }, []);

  const loadList = async () => {
    try { setItems(await notificationsApi.list()); }
    catch (_) { /* swallow */ }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000); // poll
    return () => clearInterval(id);
  }, [refresh]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await loadList();
  };

  const markAll = async () => {
    try { await notificationsApi.markAllRead(); await refresh(); await loadList(); }
    catch (_) { /* swallow */ }
  };

  return (
    <div className="notif-bell">
      <button className="btn-icon" onClick={toggle} title="Notifications" style={{ position: 'relative' }}>
        Bell
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: '#dc2626', color: '#fff',
            borderRadius: 8, fontSize: 10, padding: '1px 5px', fontWeight: 700,
          }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 10, top: 60, background: '#0f172a', color: '#e2e8f0',
          border: '1px solid #1e293b', borderRadius: 8, minWidth: 360, maxWidth: 460,
          maxHeight: 480, overflowY: 'auto', zIndex: 1000, padding: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Notifications</strong>
            <button className="btn-icon" onClick={markAll}>Mark all read</button>
          </div>
          {items.length === 0 && <div style={{ color: '#64748b', padding: 14, textAlign: 'center' }}>No notifications.</div>}
          {items.map((n) => (
            <div key={n.id} style={{
              padding: 8, marginBottom: 6, borderRadius: 6,
              background: n.read ? 'transparent' : '#1e293b',
              borderLeft: `3px solid ${n.read ? '#475569' : '#3b82f6'}`,
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {n.type} · {new Date(n.created_at).toLocaleString()}
              </div>
              <div>{n.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
