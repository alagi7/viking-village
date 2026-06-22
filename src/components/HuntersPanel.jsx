import React, { useState } from 'react';
import { PROFESSIONS, PERSONALITIES, PCOLOR, QUALITY, ZONE_DEFS, ZONE_CHAIN, MATERIALS, SKILL_DEFS, PROF_SKILLS, SKILL_LEVEL_XP } from '../constants/game.js';
import { getStats, hMaxHp, xpIntoLevel } from '../utils/helpers.js';
import { NameEditor } from './atoms.jsx';

const XP_TABLE = [100,180,280,400,540,700,880,1080,1300];

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
      <span style={{ fontSize: item ? 20 : 14, color: item ? 'inherit' : '#1e293b' }}>{item ? item.emoji : '·'}</span>
      <span style={{ fontSize: 9, color: item ? q.color : '#334155' }}>{label}</span>
      {item && (
        <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', lineHeight: 1 }}>×</div>
      )}
    </div>
  );
};

// Shared detail content — used both in HuntersPanel and the map overlay
export function HunterDetailContent({ h, onUnequip, rp, locLabel, tab, setTab, onLearnSkill }) {
  const prof = PROFESSIONS[h.profession], pd = PERSONALITIES[h.personality];
  const st = getStats(h), mhp = hMaxHp(h);
  const lv = h.level || 1;
  const xpNeed = lv < 10 ? XP_TABLE[lv - 1] : 1;
  const xpProgress = lv < 10 ? xpIntoLevel(h.xp || 0, lv) : xpNeed;
  const profSkills = (PROF_SKILLS[h.profession] || []).map(sk => SKILL_DEFS[sk] ? { id: sk, ...SKILL_DEFS[sk] } : null).filter(Boolean);
  const learnedSkills = h.skills || [];

  const tabBtn = (key, label) => (
    <div onClick={() => setTab(key)} style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13, cursor: 'pointer', borderBottom: tab === key ? '2px solid #60a5fa' : '2px solid transparent', color: tab === key ? '#f1f5f9' : '#64748b', fontWeight: tab === key ? 'bold' : 'normal' }}>
      {label}
    </div>
  );

  return (
    <>
      {/* Top bar */}
      <div style={{ background: '#1e293b', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#f1f5f9' }}><NameEditor h={h} big {...rp} /></div>
          <div style={{ fontSize: 11, color: PCOLOR[pd.type], marginTop: 1 }}>{pd.emoji} {pd.name} · {locLabel(h)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 'bold', color: '#b45309', background: '#fefce8', border: '1px solid #ca8a04', borderRadius: 6, padding: '4px 10px' }}>
          💰 {h.wallet || 0}
        </div>
      </div>

      {/* Equipment + Avatar */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px', gap: 8, padding: '12px 14px', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <EquipSlot label="武器" item={h.equipment?.weapon}  slotKey="weapon"  onUnequip={k => onUnequip(h.id, k)} />
          <EquipSlot label="护甲" item={h.equipment?.armor}   slotKey="armor"   onUnequip={k => onUnequip(h.id, k)} />
          <EquipSlot label="鞋子" item={h.equipment?.shoes}   slotKey="shoes"   onUnequip={k => onUnequip(h.id, k)} />
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
          <span style={{ fontSize: 44 }}>{prof.emoji}</span>
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{prof.name} · Lv{lv}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <EquipSlot label="副手" item={h.equipment?.offhand}  slotKey="offhand"  onUnequip={k => onUnequip(h.id, k)} />
          <EquipSlot label="戒指" item={h.equipment?.ring}     slotKey="ring"     onUnequip={k => onUnequip(h.id, k)} />
          <EquipSlot label="项链" item={h.equipment?.necklace} slotKey="necklace" onUnequip={k => onUnequip(h.id, k)} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #0f172a', background: '#1e293b', flexShrink: 0 }}>
        {tabBtn('stats', '属性')}
        {tabBtn('skills', '技能')}
        {tabBtn('bag', '背包')}
      </div>

      <div style={{ overflowY: 'auto', padding: 14, flex: 1 }}>
        {/* Stats tab */}
        {tab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
        )}

        {/* Skills tab */}
        {tab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {profSkills.map((sk, i) => {
              const learned = learnedSkills.includes(sk.id);
              const unlocked = lv >= sk.reqLevel;
              const isPending = !learned && h.pendingSkillLearn;
              const skLv = learned ? ((h.skillLevel?.[sk.id]) || 1) : null;
              const skXp = learned ? ((h.skillXp?.[sk.id]) || 0) : 0;
              const xpToNext = skLv && skLv < 5 ? SKILL_LEVEL_XP[skLv - 1] : null;
              const xpPrev = skLv && skLv > 1 ? SKILL_LEVEL_XP[skLv - 2] : 0;
              const xpPct = xpToNext ? Math.min(100, ((skXp - xpPrev) / (xpToNext - xpPrev)) * 100) : 100;
              return (
                <div key={sk.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', position: 'relative', borderBottom: i < profSkills.length - 1 ? '1px solid #1e293b' : 'none' }}>
                  {i < profSkills.length - 1 && (
                    <div style={{ position: 'absolute', left: 17, bottom: -1, width: 2, height: 10, background: learned ? sk.color : '#334155', opacity: 0.5 }} />
                  )}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${learned ? sk.color : unlocked ? '#60a5fa' : '#334155'}`, background: learned ? sk.color + '22' : unlocked ? '#1e3a5f' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {learned ? sk.emoji : unlocked ? sk.emoji : '🔒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: learned ? sk.color : unlocked ? '#e2e8f0' : '#64748b' }}>{sk.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{sk.desc}</div>
                    {learned && (
                      <div style={{ marginTop: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                          <span style={{ color: sk.color, fontWeight: 'bold' }}>Lv{skLv}</span>
                          {xpToNext ? <span>{skXp - xpPrev}/{xpToNext - xpPrev} XP</span> : <span style={{ color: '#fbbf24' }}>满级</span>}
                        </div>
                        <div style={{ height: 3, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: sk.color, width: `${xpPct}%`, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {learned
                    ? null
                    : unlocked
                      ? isPending
                        ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1d4ed8', flexShrink: 0 }}>前往中…</span>
                        : <button onClick={() => onLearnSkill?.(h.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}>去学习</button>
                      : <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: '#1e293b', color: '#475569', border: '1px solid #334155', flexShrink: 0 }}>Lv{sk.reqLevel}</span>
                  }
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
                  if (!entry) return <div key={i} style={{ aspectRatio: '1', border: '1px dashed #1e293b', borderRadius: 8, background: '#0f172a' }} />;
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
    </>
  );
}

const PCTS = [0.2, 0.4, 0.6, 0.8];

export default function HuntersPanel({ hunters, onClose, dispatch, locLabel, onUnequip, rp, SS, SH, onTrack, onLearnSkill, unlockedZones, strategy, setStrategy }) {
  const [did, setDid] = useState(null);
  const [tab, setTab] = useState('stats');
  const dh = hunters.find(h => h.id === did);
  const close = () => { onClose(); setDid(null); };

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={close}>
      <div style={SS} onClick={e => e.stopPropagation()}>

        {/* ── List view ── */}
        {!did && (<>
          <div style={SH}>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>👥 猎人 ({hunters.length})</span>
            <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={close}>✕</span>
          </div>

          {/* ── 行动策略 ── */}
          {strategy && setStrategy && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', background: '#0d1424' }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#60a5fa', marginBottom: 8 }}>⚙️ 行动策略（全体生效）</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { key: 'fleeHpPct', label: '❤️ 血量低于此值撤退回村', cur: strategy.fleeHpPct },
                  { key: 'fleeHungerPct', label: '🍖 饱食度低于此值撤退回村', cur: strategy.fleeHungerPct },
                ].map(({ key, label, cur }) => (
                  <div key={key}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {PCTS.map(p => (
                        <button key={p} onClick={() => setStrategy(s => ({ ...s, [key]: p }))}
                          style={{ flex: 1, padding: '5px 0', borderRadius: 5, border: `2px solid ${Math.abs(p - cur) < 0.01 ? '#60a5fa' : '#334155'}`, background: Math.abs(p - cur) < 0.01 ? '#1d4ed8' : '#1e293b', color: Math.abs(p - cur) < 0.01 ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                          {p * 100}%
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ overflowY: 'auto', padding: 12 }}>
            {hunters.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>还没有猎人</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {hunters.map(h => {
              const prof = PROFESSIONS[h.profession], pd = PERSONALITIES[h.personality];
              const isGhost = h.isGhost, mhp = hMaxHp(h);
              const hpPct = Math.max(0, Math.min(1, h.hp / mhp));
              const hungerPct = Math.max(0, Math.min(1, h.hunger / h.maxHunger));
              return (
                <div key={h.id} onClick={() => setDid(h.id)}
                  style={{ background: '#1e293b', border: `1px solid ${isGhost ? '#4b5563' : '#334155'}`, borderRadius: 12, padding: '12px', cursor: 'pointer', opacity: isGhost ? 0.65 : 1, display: 'flex', flexDirection: 'column', gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#263548'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = isGhost ? '#4b5563' : '#334155'; }}>

                  {/* 顶部：头像 + 名字/等级 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {isGhost ? '👻' : prof.emoji}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 13, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <NameEditor h={h} {...rp} />
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                        {prof.name} · <span style={{ color: PCOLOR[pd.type] }}>{pd.name}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: '#fbbf24', background: '#1c1400', border: '1px solid #92400e', borderRadius: 5, padding: '2px 6px', flexShrink: 0, fontWeight: 'bold' }}>Lv{h.level}</span>
                  </div>

                  {/* HP 条 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
                      <span>❤️ HP</span>
                      <span style={{ color: hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f97316' : '#ef4444' }}>{Math.floor(h.hp)}/{mhp}</span>
                    </div>
                    <div style={{ height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f97316' : '#ef4444', width: `${hpPct * 100}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* 饱食度条 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
                      <span>🍖 饱食</span>
                      <span style={{ color: '#f97316' }}>{Math.floor(h.hunger)}/{h.maxHunger}</span>
                    </div>
                    <div style={{ height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: '#f97316', width: `${hungerPct * 100}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* 当前状态 */}
                  <div style={{ fontSize: 10, color: '#64748b', background: '#0f172a', borderRadius: 6, padding: '4px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📍 {locLabel(h)}
                  </div>

                  {/* 按钮行 */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button onClick={e => { e.stopPropagation(); onTrack(h); close(); }}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: '#0f3460', border: '1px solid #1d4ed8', color: '#60a5fa', cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                      🎯 追踪
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDid(h.id); }}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: '#1e293b', border: '1px solid #475569', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                      📋 详情
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </>)}

      </div>
    </div>

    {/* ── Detail overlay (centered, same size as action bar detail) ── */}
    {did && dh && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
        onClick={() => { setDid(null); setTab('stats'); }}>
        <div style={{ background: '#0f172a', border: '2px solid #3b82f6', borderRadius: 16, width: 546, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ cursor: 'pointer', color: '#60a5fa', fontSize: 13 }} onClick={() => { setDid(null); setTab('stats'); }}>← 返回列表</span>
            <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={close}>✕</span>
          </div>
          <HunterDetailContent h={dh} onUnequip={onUnequip} rp={rp} locLabel={locLabel} tab={tab} setTab={setTab} onLearnSkill={onLearnSkill} />
        </div>
      </div>
    )}
    </>
  );
}
