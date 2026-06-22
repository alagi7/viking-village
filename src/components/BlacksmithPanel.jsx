import React, { useState } from 'react';
import { RECIPES, MATERIALS, QUALITY, RES_LABEL, PROFESSIONS, EQUIP_SLOTS } from '../constants/game.js';
import { genEquip, rollQ } from '../utils/helpers.js';

const SLOT_TABS = [
  { key: 'weapon',   label: '武器', emoji: '⚔️' },
  { key: 'offhand',  label: '副手', emoji: '🗡️' },
  { key: 'armor',    label: '护甲', emoji: '🛡️' },
  { key: 'shoes',    label: '鞋子', emoji: '👢' },
  { key: 'ring',     label: '戒指', emoji: '💍' },
  { key: 'necklace', label: '项链', emoji: '📿' },
];

const STAT_LABEL = { atk: '攻+', def: '防+', maxHpBonus: '血+', crit: '暴击+', dodge: '闪避+', atkSpeed: '攻速+' };

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
  const [slotTab, setSlotTab] = useState('weapon');

  const handleCraft = recipe => {
    if (!canAfford(recipe, resources, materials)) return;
    const quality = rollQ(recipe.qw);
    const item = genEquip(recipe.slot, quality, recipe.forProfession || null, recipe.name, recipe.emoji);
    setLastResult({ item, recipe });
    onCraft(recipe, item);
  };

  const filtered = RECIPES.filter(r => r.slot === slotTab);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={SS} onClick={e => e.stopPropagation()}>
        <div style={SH}>
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>🔨 铁匠铺 — 装备制造</span>
          <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        {/* Slot category tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0, overflowX: 'auto' }}>
          {SLOT_TABS.map(t => (
            <button key={t.key} onClick={() => { setSlotTab(t.key); setLastResult(null); }}
              style={{ flex: 1, minWidth: 64, background: slotTab === t.key ? '#1d4ed8' : 'transparent', border: 'none', color: slotTab === t.key ? 'white' : '#64748b', padding: '8px 4px', cursor: 'pointer', fontWeight: slotTab === t.key ? 'bold' : 'normal', fontSize: 12, borderBottom: slotTab === t.key ? '2px solid #60a5fa' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {lastResult && (
          <div style={{ margin: '10px 14px 0', background: '#1e293b', border: `2px solid ${QUALITY[lastResult.item.quality].color}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 28 }}>{lastResult.item.emoji}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: QUALITY[lastResult.item.quality].color, fontSize: 13 }}>
                ✅ 制造成功！{lastResult.item.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {Object.entries(lastResult.item.stats).map(([k, v]) => (
                  <span key={k} style={{ marginRight: 8 }}>
                    {STAT_LABEL[k] || k}{k === 'atkSpeed' ? v.toFixed(2) : v}{k === 'crit' || k === 'dodge' ? '%' : k === 'atkSpeed' ? '/s' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#4b5563', padding: 40, fontSize: 13 }}>暂无配方</div>
          )}
          {filtered.map(recipe => {
            const affordable = canAfford(recipe, resources, materials);
            return (
              <div key={recipe.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 36, flexShrink: 0 }}>{recipe.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>{recipe.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{recipe.desc}</div>
                    {/* Base stats (COMMON quality) */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      {Object.entries(EQUIP_SLOTS[recipe.slot]?.baseStats || {}).map(([k, v]) => {
                        const sfx = k === 'crit' || k === 'dodge' ? '%' : k === 'atkSpeed' ? '/s' : '';
                        return <span key={k} style={{ fontSize: 11, color: '#60a5fa' }}>{STAT_LABEL[k] || k}{Number.isInteger(v) ? v : v.toFixed(2)}{sfx}</span>;
                      })}
                      <span style={{ fontSize: 10, color: '#64748b' }}>(普通品质)</span>
                    </div>
                    {recipe.forProfession && (() => { const p = PROFESSIONS[recipe.forProfession]; return <div style={{ fontSize: 10, color: '#fbbf24', marginBottom: 6 }}>{p.emoji} 仅限{p.name}装备</div>; })()}

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
                    <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
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
