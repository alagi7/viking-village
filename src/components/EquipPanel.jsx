import React, { useState } from 'react';
import { PROFESSIONS, QUALITY, EQUIP_SLOTS, MATERIALS } from '../constants/game.js';

export default function EquipPanel({ inventory, materials, hunters, onEquip, onClose, SS, SH }) {
  const [tab, setTab] = useState('stash');
  const [picked, setPicked] = useState(null);
  const mt = Object.values(materials).reduce((s, v) => s + v, 0);

  const TB = ({ k, label }) => (
    <button onClick={() => setTab(k)} style={{ flex: 1, background: tab === k ? '#1d4ed8' : 'transparent', border: 'none', color: tab === k ? 'white' : '#64748b', padding: '8px 0', cursor: 'pointer', fontWeight: tab === k ? 'bold' : 'normal', fontSize: 13, borderBottom: tab === k ? '2px solid #60a5fa' : '2px solid transparent' }}>
      {label}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>📦 仓库</span>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          <TB k="stash"     label={`⚔️ 装备 (${inventory.length})`} />
          <TB k="materials" label={`🧪 材料 (${mt})`} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 14 }}>
          {tab === 'stash' && (inventory.length === 0
            ? <div style={{ textAlign: 'center', color: '#4b5563', padding: 40 }}><div style={{ fontSize: 40 }}>⚔️</div><p style={{ marginTop: 8 }}>装备栏为空，在铁匠铺打造装备</p></div>
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {inventory.map(item => {
                  const q = QUALITY[item.quality], sel = picked?.id === item.id;
                  return (
                    <div key={item.id} onClick={() => setPicked(sel ? null : item)}
                      style={{ background: '#1e293b', border: `2px solid ${sel ? q.color : q.color + '44'}`, borderRadius: 8, padding: 10, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 22 }}>{item.emoji}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 'bold', color: q.color }}>{item.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, background: q.color + '22', color: q.color, borderRadius: 3, padding: '1px 4px' }}>{q.name}</span>
                            <span style={{ fontSize: 10, color: '#64748b' }}>{EQUIP_SLOTS[item.slot]?.name}</span>
                            {item.forProfession && <span style={{ fontSize: 10, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderRadius: 3, padding: '1px 4px' }}>{PROFESSIONS[item.forProfession]?.emoji}{PROFESSIONS[item.forProfession]?.name}专属</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        {Object.entries(item.stats).map(([k, v]) => {
                          const L = { atk: '⚔️攻击', def: '🛡️防御', maxHpBonus: '❤️生命', crit: '💥暴击', dodge: '🌀闪避' };
                          return <span key={k} style={{ marginRight: 5 }}>{L[k] || k}+{v}{k === 'crit' || k === 'dodge' ? '%' : ''}</span>;
                        })}
                      </div>
                      {sel && (
                        <div style={{ marginTop: 8, borderTop: '1px solid #334155', paddingTop: 8 }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>装备给哪位猎人？</div>
                          {hunters.length === 0 && <div style={{ fontSize: 11, color: '#4b5563' }}>还没有猎人</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {hunters.map(h => {
                              const cur = h.equipment?.[item.slot];
                              const locked = !!(item.forProfession && h.profession !== item.forProfession);
                              return (
                                <button key={h.id} onClick={e => { e.stopPropagation(); if (!locked) { onEquip(h.id, item); setPicked(null); } }}
                                  disabled={locked}
                                  title={locked ? `仅限${PROFESSIONS[item.forProfession]?.name}装备` : ''}
                                  style={{ background: locked ? '#0a0f1a' : '#0f172a', border: `1px solid ${locked ? '#4b2020' : '#334155'}`, color: locked ? '#4b5563' : 'white', padding: '5px 6px', borderRadius: 4, cursor: locked ? 'not-allowed' : 'pointer', fontSize: 10, textAlign: 'left' }}>
                                  {PROFESSIONS[h.profession].emoji} {h.name}
                                  {locked && <span style={{ color: '#ef4444', marginLeft: 2, fontSize: 9 }}>✗</span>}
                                  {!locked && cur && <span style={{ color: QUALITY[cur.quality]?.color, marginLeft: 3 }}>({QUALITY[cur.quality]?.name})</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          )}
          {tab === 'materials' && (mt === 0
            ? <div style={{ textAlign: 'center', color: '#4b5563', padding: 40 }}><div style={{ fontSize: 40 }}>🧪</div><p style={{ marginTop: 8 }}>击杀怪物获取材料</p></div>
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {Object.entries(materials).filter(([, v]) => v > 0).map(([key, count]) => {
                  const mat = MATERIALS[key]; if (!mat) return null;
                  return (
                    <div key={key} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 28 }}>{mat.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 'bold', color: '#e2e8f0', marginTop: 4 }}>{mat.name}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{mat.desc}</div>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#60a5fa', marginTop: 6 }}>×{count}</div>
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
