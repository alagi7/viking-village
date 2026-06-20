import React, { useState } from 'react';
import { PROFESSIONS, PERSONALITIES, PCOLOR, QUALITY, ZONE_DEFS, MATERIALS, SKILL_DEFS, PROF_SKILLS } from '../constants/game.js';
import { getStats, hMaxHp, calcLevel, xpIntoLevel } from '../utils/helpers.js';
import { NameEditor } from './atoms.jsx';

const StatCard = ({ label, value, cur, max, color }) => (
  <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px' }}>
    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' }}>{value}</div>
    <div style={{ height: 4, background: '#0f172a', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 2, background: color, width: `${Math.min(100, Math.max(0, (cur / max) * 100))}%` }} />
    </div>
  </div>
);

const EquipSlot = ({ label, item, onUnequip, slotKey }) => {
  const q = item ? QUALITY[item.quality] : null;
  return (
    <div style={{ width: 52, height: 52, borderRadius: 8, border: `1px solid ${item ? q.color : '#334155'}`, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', cursor: item ? 'pointer' : 'default' }}
      onClick={() => item && onUnequip(slotKey)}>
      <span style={{ fontSize: item ? 20 : 16 }}>{item ? item.emoji : ''}</span>
      <span style={{ fontSize: 9, color: item ? q.color : '#334155' }}>{label}</span>
      {item && (
        <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', lineHeight: 1 }}>×</div>
      )}
    </div>
  );
};

export default function HuntersPanel({ hunters, onClose, dispatch, locLabel, onUnequip, rp, SS, SH, onTrack, dispatchAll }) {
  const [did, setDid] = useState(null);
  const [tab, setTab] = useState('stats');
  const dh = hunters.find(h => h.id === did);
  const close = () => { onClose(); setDid(null); };

  const openDetail = h => { setDid(h.id); setTab('stats'); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={close}>
      <div style={SS} onClick={e => e.stopPropagation()}>

        {/* ── List view ── */}
        {!did && (<>
          <div style={SH}>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>👥 猎人 ({hunters.length})</span>
            <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={close}>✕</span>
          </div>
          <div style={{ overflowY: 'auto', padding: 12 }}>
            {/* Dispatch all */}
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
              const isGhost = h.isGhost, mhp = hMaxHp(h);
              return (
                <div key={h.id} onClick={() => !isGhost && openDetail(h)}
                  style={{ background: '#1e293b', border: `1px solid ${isGhost ? '#374151' : '#334155'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: isGhost ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, opacity: isGhost ? 0.45 : 1 }}
                  onMouseEnter={e => { if (!isGhost) e.currentTarget.style.background = '#263548'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {isGhost ? '👻' : prof.emoji}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 13, color: '#f1f5f9' }}><NameEditor h={h} {...rp} /></span>
                      <span style={{ fontSize: 10, color: '#94a3b8', background: '#0f172a', borderRadius: 4, padding: '1px 5px' }}>Lv{h.level}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      {prof.name} · <span style={{ color: PCOLOR[pd.type] }}>{pd.name}</span>
                    </div>
                    {/* HP bar */}
                    <div style={{ marginTop: 5, height: 3, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: h.hp / mhp > 0.5 ? '#22c55e' : '#ef4444', width: `${(h.hp / mhp) * 100}%` }} />
                    </div>
                  </div>
                  {/* Right */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {!isGhost && (
                      <button onClick={e => { e.stopPropagation(); onTrack(h); close(); }}
                        style={{ background: '#1d4ed8', border: 'none', color: 'white', padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>🎯</button>
                    )}
                    <span style={{ fontSize: 10, color: '#64748b' }}>{locLabel(h)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ── Detail view ── */}
        {did && dh && (() => {
          const h = dh, prof = PROFESSIONS[h.profession], pd = PERSONALITIES[h.personality];
          const st = getStats(h), mhp = hMaxHp(h);
          const lv = h.level || 1, xpNeed = lv < 10 ? [100,180,280,400,540,700,880,1080,1300][lv-1] : 1;
          const xpProgress = lv < 10 ? (xpIntoLevel ? xpIntoLevel(h.xp || 0, lv) : (h.xp || 0) % xpNeed) : xpNeed;

          const slots = [
            { key: 'weapon', label: '武器' },
            { key: 'armor', label: '护甲' },
            { key: 'accessory', label: '饰品' },
          ];

          const profSkills = (PROF_SKILLS[h.profession] || []).map(sk => SKILL_DEFS[sk] ? { id: sk, ...SKILL_DEFS[sk] } : null).filter(Boolean);
          const learnedSkills = h.skills || [];

          const tabBtn = (key, label) => (
            <div onClick={() => setTab(key)} style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13, cursor: 'pointer', borderBottom: tab === key ? '2px solid #60a5fa' : '2px solid transparent', color: tab === key ? '#f1f5f9' : '#64748b', fontWeight: tab === key ? 'bold' : 'normal' }}>
              {label}
            </div>
          );

          return (<>
            {/* Top bar */}
            <div style={{ background: '#1e293b', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ cursor: 'pointer', color: '#60a5fa', fontSize: 13 }} onClick={() => setDid(null)}>← 返回</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' }}><NameEditor h={h} big {...rp} /></div>
                  <div style={{ fontSize: 11, color: PCOLOR[pd.type], marginTop: 1 }}>{pd.emoji} {pd.name} · {locLabel(h)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 'bold', color: '#b45309', background: '#fefce8', border: '1px solid #ca8a04', borderRadius: 6, padding: '4px 10px' }}>
                💰 {h.wallet || 0}
              </div>
            </div>

            {/* Equipment + Avatar */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px', gap: 8, padding: '12px 14px', alignItems: 'center' }}>
              {/* Left slot: weapon */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <EquipSlot label="武器" item={h.equipment?.weapon} slotKey="weapon" onUnequip={k => onUnequip(h.id, k)} />
                <EquipSlot label="护甲" item={h.equipment?.armor} slotKey="armor" onUnequip={k => onUnequip(h.id, k)} />
              </div>

              {/* Center: avatar */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
                <span style={{ fontSize: 44 }}>{prof.emoji}</span>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{prof.name} · Lv{lv}</div>
                {/* XP bar */}
                {lv < 10 && (
                  <div style={{ width: '80%' }}>
                    <div style={{ height: 3, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#fbbf24', borderRadius: 2, width: `${Math.min(100, (xpProgress / xpNeed) * 100)}%` }} />
                    </div>
                    <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 }}>{xpProgress}/{xpNeed} XP</div>
                  </div>
                )}
                {lv >= 10 && <div style={{ fontSize: 10, color: '#fbbf24' }}>已满级</div>}
              </div>

              {/* Right slot: accessory */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <EquipSlot label="饰品" item={h.equipment?.accessory} slotKey="accessory" onUnequip={k => onUnequip(h.id, k)} />
                <div style={{ width: 52, height: 52 }} /> {/* spacer */}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #0f172a', background: '#1e293b' }}>
              {tabBtn('stats', '属性')}
              {tabBtn('skills', '技能')}
              {tabBtn('bag', '背包')}
            </div>

            <div style={{ overflowY: 'auto', padding: 14 }}>

              {/* Stats tab */}
              {tab === 'stats' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <StatCard label="HP" value={`${Math.floor(h.hp)} / ${mhp}`} cur={h.hp} max={mhp} color="#22c55e" />
                    <StatCard label="饱食度" value={`${Math.floor(h.hunger)} / ${h.maxHunger}`} cur={h.hunger} max={h.maxHunger} color="#f97316" />
                    <StatCard label="攻击" value={st.atk} cur={st.atk} max={80} color="#ef4444" />
                    <StatCard label="防御" value={st.def} cur={st.def} max={40} color="#3b82f6" />
                    <StatCard label="暴击率" value={`${st.crit}%`} cur={st.crit} max={60} color="#a855f7" />
                    <StatCard label="闪避率" value={`${st.dodge}%`} cur={st.dodge} max={60} color="#06b6d4" />
                    <div style={{ gridColumn: 'span 2' }}>
                      <StatCard label="攻击速度" value={`${st.atkSpd.toFixed(1)} 次/秒`} cur={st.atkSpd} max={3} color="#78716c" />
                    </div>
                  </div>
                  {/* Dispatch buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {Object.values(ZONE_DEFS).filter(z => z.key !== h.location && !(h.location === 'TRAVELING' && h.destZone === z.key)).map(z => (
                      <button key={z.key} onClick={() => dispatch(h.id, z.key)}
                        style={{ background: z.wild ? '#7f1d1d' : '#14532d', border: `1px solid ${z.wild ? '#991b1b' : '#166534'}`, color: 'white', padding: '8px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                        {z.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills tab */}
              {tab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {profSkills.map((sk, i) => {
                    const learned = learnedSkills.includes(sk.id);
                    return (
                      <div key={sk.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', position: 'relative',
                        borderBottom: i < profSkills.length - 1 ? '1px solid #1e293b' : 'none' }}>
                        {/* Connector line */}
                        {i < profSkills.length - 1 && (
                          <div style={{ position: 'absolute', left: 17, bottom: -1, width: 2, height: 10, background: learned ? sk.color : '#334155', opacity: 0.5 }} />
                        )}
                        {/* Icon */}
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${learned ? sk.color : '#334155'}`, background: learned ? sk.color + '22' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          {sk.emoji}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 'bold', color: learned ? sk.color : '#64748b' }}>{sk.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{sk.desc}</div>
                        </div>
                        {/* Badge */}
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: learned ? sk.color + '22' : '#1e293b', color: learned ? sk.color : '#475569', border: `1px solid ${learned ? sk.color + '44' : '#334155'}`, flexShrink: 0 }}>
                          {learned ? '已习得' : `Lv${sk.reqLevel}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bag tab */}
              {tab === 'bag' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    {(() => {
                      const items = Object.entries(h.backpack || {}).filter(([, v]) => v > 0);
                      const slots = [...items, ...Array(Math.max(0, 12 - items.length)).fill(null)].slice(0, 12);
                      return slots.map((entry, i) => {
                        if (!entry) return (
                          <div key={i} style={{ aspectRatio: '1', border: '1px dashed #1e293b', borderRadius: 8, background: '#0f172a' }} />
                        );
                        const [k, v] = entry, mat = MATERIALS[k];
                        return (
                          <div key={k} style={{ aspectRatio: '1', border: '1px solid #334155', borderRadius: 8, background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 2 }}>
                            <span style={{ fontSize: 20 }}>{mat?.emoji}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>{mat?.name}</span>
                            <span style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 9, color: '#64748b' }}>×{v}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {Object.keys(h.backpack || {}).filter(k => h.backpack[k] > 0).length === 0 && (
                    <p style={{ color: '#475569', textAlign: 'center', padding: '20px 0', fontSize: 12 }}>背包是空的</p>
                  )}
                </div>
              )}

            </div>
          </>);
        })()}
      </div>
    </div>
  );
}
