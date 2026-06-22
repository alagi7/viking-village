import React, { useState } from 'react';
import { MATERIALS, MAT_PRICES } from '../constants/game.js';

const ALL_MATS = Object.keys(MATERIALS);
const QTY_OPTIONS = [
  { label: '×10',   value: 10 },
  { label: '×100',  value: 100 },
  { label: '×1000', value: 1000 },
  { label: '无限',   value: Infinity },
];

export default function TradingPanel({ tradeOrders, setTradeOrders, onClose, SS, SH }) {
  const [picking, setPicking] = useState(null); // matKey awaiting qty selection

  const placeOrder = (k, qty) => {
    const price = MAT_PRICES[k] || 10;
    setTradeOrders(o => ({ ...o, [k]: { price, qty, collected: 0 } }));
    setPicking(null);
  };

  const stopOrder = k => setTradeOrders(o => { const n = { ...o }; delete n[k]; return n; });

  const activeCount = Object.keys(tradeOrders).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={picking ? () => setPicking(null) : onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>🏪 收购所</span>
            {activeCount > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#22d3ee' }}>({activeCount}项收购中)</span>}
          </div>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: '8px 14px 6px', fontSize: 11, color: '#64748b', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          猎人回城后自动在此出售对应材料，按固定价格收购
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {ALL_MATS.map(k => {
              const mat = MATERIALS[k];
              const order = tradeOrders[k];
              const isActive = !!order;
              const price = MAT_PRICES[k] || 10;
              const isPicking = picking === k;
              return (
                <div key={k} style={{ background: isActive ? 'rgba(34,211,238,0.08)' : '#1e293b', border: `2px solid ${isActive ? '#22d3ee55' : '#334155'}`, borderRadius: 10, padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                  {isActive && (
                    <div onClick={() => stopOrder(k)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9, color: 'white', fontWeight: 'bold' }}>
                      ✕
                    </div>
                  )}

                  <span style={{ fontSize: 28 }}>{mat?.emoji}</span>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#e2e8f0', textAlign: 'center' }}>{mat?.name}</div>
                  <div style={{ fontSize: 10, color: '#fbbf24' }}>💰{price}/个</div>

                  {isActive && (
                    <div style={{ fontSize: 9, color: '#22d3ee', textAlign: 'center' }}>
                      {order.qty === Infinity ? '无限收购' : `剩余 ${Math.max(0, order.qty - (order.collected || 0))} 个`}
                    </div>
                  )}

                  {isPicking ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', marginTop: 2 }}>
                      {QTY_OPTIONS.map(q => (
                        <button key={q.value} onClick={() => placeOrder(k, q.value)}
                          style={{ background: '#1d4ed8', border: 'none', color: 'white', padding: '4px 0', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 'bold', width: '100%' }}>
                          {q.label}
                        </button>
                      ))}
                      <button onClick={() => setPicking(null)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#64748b', padding: '3px 0', borderRadius: 4, cursor: 'pointer', fontSize: 10, width: '100%' }}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setPicking(k)}
                      style={{ marginTop: 2, width: '100%', background: isActive ? '#0f4c44' : '#1e293b', border: `1px solid ${isActive ? '#22d3ee44' : '#334155'}`, color: isActive ? '#22d3ee' : '#94a3b8', padding: '4px 0', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 'bold' }}>
                      {isActive ? '修改' : '收购'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
