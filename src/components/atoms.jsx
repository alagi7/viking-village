import React from 'react';

export const Stat = ({ label, value, color = '#e2e8f0' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
    <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 'bold', color }}>{value}</span>
  </div>
);

export const Bar = ({ label, cur, max, color }) => (
  <div style={{ marginBottom: 7 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2, color: '#94a3b8' }}>
      <span>{label}</span><span>{Math.floor(cur)}/{max}</span>
    </div>
    <div style={{ background: '#1e293b', borderRadius: 3, height: 6 }}>
      <div style={{ background: color, width: `${Math.max(0, (cur / max) * 100)}%`, height: '100%', borderRadius: 3 }} />
    </div>
  </div>
);

export const NameEditor = ({ h, big = false, renamingId, renameVal, setRenamingId, setRenameVal, onSave }) =>
  renamingId === h.id
    ? <input value={renameVal} onChange={e => setRenameVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') setRenamingId(null); }}
        onBlur={onSave} autoFocus onClick={e => e.stopPropagation()}
        style={{ background: '#0f172a', border: '1px solid #60a5fa', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: big ? 15 : 13, width: 110 }} />
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {h.name}
        <span style={{ cursor: 'pointer', fontSize: 10, opacity: 0.55 }}
          onClick={e => { e.stopPropagation(); setRenamingId(h.id); setRenameVal(h.name); }}>✏️</span>
      </span>;
