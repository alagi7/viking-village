import React, { useState } from 'react';
import { PROFESSIONS, PERSONALITIES, PCOLOR, QUALITY, EQUIP_SLOTS, ZONE_DEFS, MATERIALS } from '../constants/game.js';
import { getStats, hMaxHp } from '../utils/helpers.js';
import { Bar, Stat, NameEditor } from './atoms.jsx';

export default function HuntersPanel({ hunters, onClose, dispatch, locLabel, onUnequip, rp, SS, SH, onTrack, dispatchAll }) {
  const [did, setDid] = useState(null);
  const dh = hunters.find(h => h.id === did);
  const close = () => { onClose(); setDid(null); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={close}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          {did
            ? <span style={{ cursor: 'pointer', color: '#60a5fa', fontSize: 13 }} onClick={() => setDid(null)}>← 返回</span>
            : <span style={{ fontWeight: 'bold', fontSize: 15 }}>👥 猎人 ({hunters.length})</span>}
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={close}>✕</span>
        </div>

        {!did && (
          <div style={{ overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, padding: '6px 8px', background: '#1e293b', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>全体派遣</span>
              {Object.values(ZONE_DEFS).map(z => (
                <button key={z.key} onClick={() => dispatchAll(z.key)}
                  style={{ flex: 1, background: z.wild ? '#991b1b' : '#166534', border: 'none', color: 'white', padding: '5px 2px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 'bold' }}>
                  {z.name}
                </button>
              ))}
            </div>
            {hunters.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>还没有猎人</p>}
            {hunters.map(h => {
              const prof = PROFESSIONS[h.profession], pd = PERSONALITIES[h.personality];
              const isGhost = h.isGhost;
              return (
                <div key={h.id} onClick={() => !isGhost && setDid(h.id)}
                  style={{ background: '#1e293b', border: `1px solid ${isGhost ? '#4b5563' : '#334155'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8, cursor: isGhost ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isGhost ? 0.45 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#263548'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{prof.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 13 }}><NameEditor h={h} {...rp} /></div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
                        <span>{prof.name}</span>
                        <span style={{ color: PCOLOR[pd.type], background: 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 4px' }}>{pd.emoji}{pd.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>{locLabel(h)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {!isGhost && <button onClick={e => { e.stopPropagation(); onTrack(h); }} style={{ background: '#334155', border: 'none', color: 'white', padding: '3px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🎯</button>}
                  {isGhost && <span style={{ fontSize: 14 }}>👻</span>}
                    <div style={{ color: h.hp / hMaxHp(h) > 0.5 ? '#22c55e' : '#ef4444' }}>❤️{Math.floor(h.hp)}</div>
                    <div style={{ color: '#94a3b8', fontSize: 14 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {did && dh && (() => {
          const h = dh, prof = PROFESSIONS[h.profession], pd = PERSONALITIES[h.personality], st = getStats(h), mhp = hMaxHp(h);
          return (
            <div style={{ overflowY: 'auto', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: '#1e293b', borderRadius: 8, padding: 12 }}>
                <span style={{ fontSize: 38 }}>{prof.emoji}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 16 }}><NameEditor h={h} big {...rp} /></div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{prof.name} · Lv{h.level} · {locLabel(h)}</div>
                </div>
              </div>

              <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 26 }}>{pd.emoji}</span>
                <div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 'bold', fontSize: 13, color: PCOLOR[pd.type] }}>{pd.name}</span>
                    <span style={{ fontSize: 10, background: PCOLOR[pd.type] + '22', color: PCOLOR[pd.type], borderRadius: 3, padding: '1px 4px' }}>
                      {{ positive: '积极', neutral: '中性', negative: '消极' }[pd.type]}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{pd.desc}</div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Bar label="❤️ 生命" cur={h.hp} max={mhp} color="#ef4444" />
                <Bar label="🍖 饱食" cur={h.hunger} max={h.maxHunger} color="#f97316" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6, padding: '0 2px' }}>
                  <span>💰 钱包: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{h.wallet || 0}</span></span>
                </div>
                {Object.keys(h.backpack || {}).filter(k => h.backpack[k] > 0).length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 4 }}>🎒 背包</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(h.backpack || {}).filter(([, v]) => v > 0).map(([k, v]) => {
                        const mat = MATERIALS[k];
                        return (
                          <span key={k} style={{ fontSize: 10, background: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 4, padding: '2px 6px' }}>
                            {mat?.emoji}{mat?.name} ×{v}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: '#1e293b', borderRadius: 8, padding: '4px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 'bold', padding: '8px 0 4px' }}>战斗属性</div>
                <Stat label="⚔️ 攻击力"   value={st.atk}                          color="#f87171" />
                <Stat label="🛡️ 防御力"   value={st.def}                          color="#60a5fa" />
                <Stat label="⚡ 攻击速度"  value={`${st.atkSpd.toFixed(1)}/秒`}    color="#fbbf24" />
                <Stat label="💥 暴击率"   value={`${st.crit}%`}                    color="#e879f9" />
                <Stat label="🌀 闪避率"   value={`${st.dodge}%`}                   color="#34d399" />
                <Stat label="❤️ 最大生命"  value={mhp}                             color="#f87171" />
              </div>

              <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 'bold', marginBottom: 8 }}>装备栏</div>
                {[{ key: 'weapon', label: '⚔️ 武器' }, { key: 'armor', label: '🛡️ 护甲' }, { key: 'accessory', label: '💍 饰品' }].map(s => {
                  const item = h.equipment?.[s.key], q = item ? QUALITY[item.quality] : null;
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
                      <div style={{ width: 36, height: 36, background: '#0f172a', border: `1px ${item ? 'solid' : 'dashed'} ${item ? q.color : '#334155'}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {item ? item.emoji : ''}
                      </div>
                      {item ? (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 'bold', color: q.color }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            {Object.entries(item.stats).map(([k, v]) => {
                              const L = { atk: '攻+', def: '防+', maxHpBonus: '血+', crit: '暴击+', dodge: '闪避+' };
                              return <span key={k} style={{ marginRight: 6 }}>{L[k] || k}{v}{k === 'crit' || k === 'dodge' ? '%' : ''}</span>;
                            })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: '#374151' }}>（空）</div>
                        </div>
                      )}
                      {item && <button onClick={() => onUnequip(h.id, s.key)} style={{ background: '#374151', border: 'none', color: '#94a3b8', padding: '3px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>卸下</button>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {Object.values(ZONE_DEFS).filter(z => z.key !== h.location && !(h.location === 'TRAVELING' && h.destZone === z.key)).map(z => (
                  <button key={z.key} onClick={() => dispatch(h.id, z.key)}
                    style={{ background: z.wild ? '#991b1b' : '#166534', border: 'none', color: 'white', padding: '6px 0', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                    {z.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
