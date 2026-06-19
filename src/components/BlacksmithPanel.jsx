import React, { useState } from 'react';
import { RECIPES, MATERIALS, QUALITY, RES_LABEL, PROFESSIONS } from '../constants/game.js';
import { genEquip, rollQ } from '../utils/helpers.js';

function canAfford(recipe, resources, materials) {
  for (const [k, v] of Object.entries(recipe.costRes || {})) {
    if ((resources[k] || 0) < v) return false;
  }
  for (const [k, v] of Object.entries(recipe.costMat || {})) {
    if ((materials[k] || 0) < v) return false;
  }
  return true;
}

export default function BlacksmithPanel({ resources, materials, onCraft, onClose, SS, SH }) {
  const [lastResult, setLastResult] = useState(null);

  const handleCraft = recipe => {
    if (!canAfford(recipe, resources, materials)) return;
    const quality = rollQ(recipe.qw);
    const item = genEquip(recipe.slot, quality, recipe.forProfession || null);
    setLastResult({ item, recipe });
    onCraft(recipe, item);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>🔨 铁匠铺 — 装备制造</span>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        {lastResult && (
          <div style={{ margin: '10px 14px 0', background: '#1e293b', border: `2px solid ${QUALITY[lastResult.item.quality].color}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{lastResult.item.emoji}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: QUALITY[lastResult.item.quality].color, fontSize: 13 }}>
                ✅ 制造成功！{lastResult.item.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {Object.entries(lastResult.item.stats).map(([k, v]) => {
                  const L = { atk: '攻+', def: '防+', maxHpBonus: '血+', crit: '暴击+', dodge: '闪避+' };
                  return <span key={k} style={{ marginRight: 8 }}>{L[k]||k}{v}{k==='crit'||k==='dodge'?'%':''}</span>;
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RECIPES.map(recipe => {
            const affordable = canAfford(recipe, resources, materials);
            return (
              <div key={recipe.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 36, flexShrink: 0 }}>{recipe.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>{recipe.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{recipe.desc}</div>
                    {recipe.forProfession && (() => { const p = PROFESSIONS[recipe.forProfession]; return <div style={{ fontSize: 10, color: '#fbbf24', marginBottom: 8 }}>{p.emoji} 仅限{p.name}装备</div>; })()}

                    {/* Costs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {Object.entries(recipe.costRes || {}).map(([k, v]) => {
                        const have = resources[k] || 0;
                        const ok = have >= v;
                        return (
                          <span key={k} style={{ fontSize: 11, background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: ok ? '#22c55e' : '#ef4444', border: `1px solid ${ok ? '#22c55e44' : '#ef444444'}`, borderRadius: 4, padding: '2px 7px' }}>
                            {RES_LABEL[k]} ×{v} <span style={{ opacity: 0.7 }}>({have})</span>
                          </span>
                        );
                      })}
                      {Object.entries(recipe.costMat || {}).map(([k, v]) => {
                        const have = materials[k] || 0;
                        const ok = have >= v;
                        const mat = MATERIALS[k];
                        return (
                          <span key={k} style={{ fontSize: 11, background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: ok ? '#22c55e' : '#ef4444', border: `1px solid ${ok ? '#22c55e44' : '#ef444444'}`, borderRadius: 4, padding: '2px 7px' }}>
                            {mat?.emoji}{mat?.name} ×{v} <span style={{ opacity: 0.7 }}>({have})</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Quality preview */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                      {Object.entries(recipe.qw).filter(([, w]) => w > 0).map(([q, w]) => (
                        <div key={q} style={{ fontSize: 10, color: QUALITY[q].color, background: QUALITY[q].color + '18', borderRadius: 3, padding: '1px 5px' }}>
                          {QUALITY[q].name} {w}%
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCraft(recipe)}
                  disabled={!affordable}
                  style={{ width: '100%', background: affordable ? '#7c3aed' : '#1f2937', border: `1px solid ${affordable ? '#a855f7' : '#374151'}`, color: affordable ? 'white' : '#4b5563', padding: '8px 0', borderRadius: 6, cursor: affordable ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: 13 }}>
                  {affordable ? '🔨 开始锻造' : '材料不足'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
