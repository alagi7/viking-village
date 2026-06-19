import React, { useState } from 'react';
import { MATERIALS, MAT_PRICES } from '../constants/game.js';

const ALL_MATS = Object.keys(MATERIALS);
const PRICE_PRESETS = [5, 8, 10, 15, 20, 30, 50];

export default function TradingPanel({ tradeOrders, setTradeOrders, onClose, SS, SH }) {
  const [editingMat, setEditingMat] = useState(null); // matKey being edited
  const [pendingPrice, setPendingPrice] = useState(0);

  const startEdit = k => {
    setEditingMat(k);
    setPendingPrice(tradeOrders[k] || MAT_PRICES[k] || 10);
  };

  const confirmOrder = () => {
    if (!editingMat || pendingPrice <= 0) { cancelEdit(); return; }
    setTradeOrders(o => ({ ...o, [editingMat]: pendingPrice }));
    setEditingMat(null);
  };

  const cancelEdit = () => setEditingMat(null);

  const stopOrder = k => setTradeOrders(o => { const n = { ...o }; delete n[k]; return n; });

  const activeCount = Object.keys(tradeOrders).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}
      onClick={editingMat ? cancelEdit : onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>🏪 收购所 — 收购委托</span>
            {activeCount > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#22d3ee' }}>({activeCount}项收购中)</span>}
          </div>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: '8px 14px 4px', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
          发布委托后，猎人每次回城会自动在此出售对应材料
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ALL_MATS.map(k => {
            const mat = MATERIALS[k];
            const price = tradeOrders[k];
            const isActive = price != null;
            const isEditing = editingMat === k;
            return (
              <div key={k} style={{ background: isActive ? 'rgba(34,211,238,0.08)' : '#1e293b', border: `1px solid ${isActive ? '#22d3ee55' : '#334155'}`, borderRadius: 10, padding: 12 }}>
                {isEditing ? (
                  /* Price editor */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 26 }}>{mat?.emoji}</span>
                      <span style={{ fontWeight: 'bold', fontSize: 14 }}>{mat?.name} — 设定收购价</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {PRICE_PRESETS.map(p => (
                        <button key={p} onClick={() => setPendingPrice(p)}
                          style={{ background: pendingPrice === p ? '#2563eb' : '#0f172a', border: `1px solid ${pendingPrice === p ? '#60a5fa' : '#334155'}`, color: 'white', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                          {p}💰
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={confirmOrder}
                        style={{ flex: 1, background: '#16a34a', border: 'none', color: 'white', padding: '7px 0', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
                        确认委托 ({pendingPrice}💰/个)
                      </button>
                      <button onClick={cancelEdit}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '7px 14px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal row */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{mat?.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 13 }}>{mat?.name}</div>
                      <div style={{ fontSize: 11, color: isActive ? '#22d3ee' : '#4b5563' }}>
                        {isActive ? `✅ 收购中 — ${price}💰/个` : '未设委托'}
                      </div>
                    </div>
                    {isActive ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(k)}
                          style={{ background: '#1e40af', border: 'none', color: 'white', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                          修改
                        </button>
                        <button onClick={() => stopOrder(k)}
                          style={{ background: '#7f1d1d', border: 'none', color: '#f87171', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                          停止
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(k)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>
                        + 设置委托
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
