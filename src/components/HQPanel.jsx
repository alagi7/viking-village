import React from 'react';
import { PROFESSIONS, PERSONALITIES, PCOLOR, QUALITY } from '../constants/game.js';

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

export default function HQPanel({ candidates, candidatesRefreshAt, onRecruit, onRefresh, resources, hunterCount, maxHunters, onClose, SS, SH }) {
  const now = Date.now();
  const msLeft = Math.max(0, (candidatesRefreshAt || 0) - now);
  const minLeft = Math.floor(msLeft / 60000);
  const secLeft = Math.floor((msLeft % 60000) / 1000);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>🏰 大本营 — 招募猎人</span>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 10 }}>每次招募消耗 50💰</span>
          </div>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: '8px 14px', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>从三位候选人中选择一人招募
            {hunterCount >= maxHunters && <span style={{ color: '#ef4444', marginLeft: 8 }}>⚠️ 已达上限 {hunterCount}/{maxHunters}</span>}
          </span>
          <span style={{ color: msLeft > 0 ? '#60a5fa' : '#22c55e' }}>
            {msLeft > 0 ? `🔄 ${minLeft}分${secLeft}秒后刷新` : '✅ 可手动刷新'}
          </span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {candidates.map(c => {
            const prof = PROFESSIONS[c.profession];
            const pers = PERSONALITIES[c.personality];
            const canAfford = resources.gold >= 50 && hunterCount < maxHunters;
            return (
              <div key={c.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 48, height: 48, background: 'rgba(29,78,216,0.7)', border: '2px solid #3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    {prof.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 15 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {prof.emoji} {prof.name} &nbsp;·&nbsp;
                      <span style={{ color: PCOLOR[pers.type] }}>{pers.emoji} {pers.name}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[['⚔️ 攻击', prof.atk], ['🛡️ 防御', prof.def], ['💥 暴击', `${prof.crit}%`], ['🌀 闪避', `${prof.dodge}%`]].map(([l, v]) => (
                    <div key={l} style={{ background: '#0f172a', borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 'bold', color: '#e2e8f0' }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: PCOLOR[pers.type], background: PCOLOR[pers.type] + '18', borderRadius: 6, padding: '4px 8px', marginBottom: 10 }}>
                  {pers.emoji} {pers.desc}
                </div>

                <button
                  onClick={() => canAfford && onRecruit(c)}
                  disabled={!canAfford}
                  style={{ width: '100%', background: canAfford ? '#16a34a' : '#1f2937', border: `1px solid ${canAfford ? '#22c55e' : '#374151'}`, color: canAfford ? 'white' : '#4b5563', padding: '9px 0', borderRadius: 7, cursor: canAfford ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: 13 }}>
                  {hunterCount >= maxHunters ? `🚫 已达上限(${maxHunters}人)` : canAfford ? `✅ 招募 ${c.name} (50💰)` : '💰 金币不足'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}>
          <button onClick={onRefresh}
            style={{ flex: 1, background: '#1e40af', border: '1px solid #3b82f6', color: 'white', padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
            🔄 手动刷新候选人
          </button>
        </div>
      </div>
    </div>
  );
}
