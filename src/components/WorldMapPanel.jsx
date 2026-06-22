import React from 'react';
import { ZONE_CHAIN, ZONE_DEFS, ZONE_UNLOCK_KILLS } from '../constants/game.js';

const ZONE_ICONS = {
  VILLAGE: '🏘️', ICE_1: '🧊', ICE_2: '🧊', MOUNTAIN_1: '⛰️', MOUNTAIN_2: '⛰️',
  FOREST_1: '🌲', FOREST_2: '🌲', FOREST_3: '🌲',
};
const ZONE_DESCS = {
  VILLAGE: '你的家园', ICE_1: '危险的冰雪荒原', ICE_2: '更深处的冰原，有霜巨人',
  MOUNTAIN_1: '险峻雪山，雪怪出没', MOUNTAIN_2: '雪山深处，冰龙守护',
  FOREST_1: '阴暗密林，巨狼游荡', FOREST_2: '深林腹地，山精与巨狼', FOREST_3: '黑暗禁地，最危险之地',
};

export default function WorldMapPanel({ zoneKills, unlockedZones, viewZone, setViewZone, onClose, SS, SH }) {
  // Figure out which zone the next unlock requires kills in
  const getUnlockInfo = (zoneKey) => {
    const idx = ZONE_CHAIN.indexOf(zoneKey);
    if (idx <= 0) return null;
    const prevZone = ZONE_CHAIN[idx - 1];
    const needed = ZONE_UNLOCK_KILLS[zoneKey];
    const current = zoneKills[prevZone] || 0;
    return { prevZone, needed, current };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>🗺️ 世界地图</span>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ZONE_CHAIN.map((zk, idx) => {
              const zd = ZONE_DEFS[zk];
              const isUnlocked = unlockedZones.has(zk);
              const isCurrent = viewZone === zk;
              const info = getUnlockInfo(zk);
              const pct = info ? Math.min(100, Math.round((info.current / info.needed) * 100)) : 100;

              return (
                <div key={zk}
                  onClick={() => isUnlocked && setViewZone(zk)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: isCurrent ? 'rgba(59,130,246,0.15)' : isUnlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
                    border: `2px solid ${isCurrent ? '#3b82f6' : isUnlocked ? '#334155' : '#1e293b'}`,
                    borderRadius: 10, padding: '10px 14px',
                    cursor: isUnlocked ? 'pointer' : 'default', opacity: isUnlocked ? 1 : 0.55,
                  }}>
                  {/* Zone color swatch */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: zd.fill, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {ZONE_ICONS[zk]}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 13, color: isCurrent ? '#60a5fa' : '#e2e8f0' }}>
                        {idx + 1}. {zd.name}
                      </span>
                      {isCurrent && <span style={{ fontSize: 10, background: '#1d4ed8', padding: '1px 5px', borderRadius: 3, color: '#93c5fd' }}>当前</span>}
                      {!isUnlocked && <span style={{ fontSize: 18 }}>🔒</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{ZONE_DESCS[zk]}</div>
                    {!isUnlocked && info && (
                      <div style={{ marginTop: 5 }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                          需在 {ZONE_DEFS[info.prevZone]?.name} 击杀 {info.needed} 只怪物解锁
                          （{info.current}/{info.needed}）
                        </div>
                        <div style={{ height: 4, background: '#1e293b', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 2 }} />
                        </div>
                      </div>
                    )}
                    {isUnlocked && zk !== 'VILLAGE' && (
                      <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>
                        ✅ 已解锁 · 击杀 {zoneKills[zk] || 0} 只
                      </div>
                    )}
                  </div>

                  {isUnlocked && (
                    <div style={{ fontSize: 11, color: isCurrent ? '#60a5fa' : '#64748b', fontWeight: 'bold' }}>
                      {isCurrent ? '查看中' : '→ 前往'}
                    </div>
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
