import {
  ZONE_DEFS, PROFESSIONS, PERSONALITIES, QUALITY, EQUIP_SLOTS, EQ_NAMES, MONSTER_DEFS,
  NAMES, PKEYS, HT, TILE, BSIZE, XP_PER_LEVEL,
} from '../constants/game.js';

export const calcLevel = xp => {
  let level = 1, rem = xp;
  for (const needed of XP_PER_LEVEL) {
    if (rem < needed || level >= 10) break;
    rem -= needed; level++;
  }
  return level;
};
export const xpIntoLevel = (xp, level) => {
  let rem = xp;
  for (let i = 1; i < level && i <= XP_PER_LEVEL.length; i++) rem -= XP_PER_LEVEL[i - 1];
  return Math.max(0, rem);
};

export const dst = (ax, ay, bx, by) => Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

export const moveTo = (cx, cy, tx, ty, spd) => {
  const dx = tx - cx, dy = ty - cy, d = Math.sqrt(dx * dx + dy * dy);
  if (d < spd) return { x: tx, y: ty, arrived: true };
  return { x: cx + dx / d * spd, y: cy + dy / d * spd, arrived: false };
};

export const zoneBounds = z => {
  const zd = ZONE_DEFS[z] || ZONE_DEFS.VILLAGE;
  return { x1: zd.tx + 3, y1: zd.ty + 3, x2: zd.tx + HT - 3, y2: zd.ty + HT - 3 };
};

export const randInZone = z => {
  const b = zoneBounds(z);
  return { tx: b.x1 + Math.random() * (b.x2 - b.x1), ty: b.y1 + Math.random() * (b.y2 - b.y1) };
};

export const clampZone = (tx, ty, z) => {
  const b = zoneBounds(z);
  return { tx: Math.max(b.x1, Math.min(b.x2, tx)), ty: Math.max(b.y1, Math.min(b.y2, ty)) };
};

export const tileZone = (tx, ty) =>
  tx < HT && ty < HT ? 'VILLAGE' : tx >= HT && ty < HT ? 'ICE' : tx < HT && ty >= HT ? 'FOREST' : 'MOUNTAIN';

export const hMaxHp = h =>
  100 + Object.values(h.equipment || {}).reduce((s, i) => s + (i?.stats?.maxHpBonus || 0), 0);

export const getStats = h => {
  const prof = PROFESSIONS[h.profession], p = PERSONALITIES[h.personality] || {};
  let ea = 0, ed = 0, em = 0, ec = 0, edo = 0;
  Object.values(h.equipment || {}).forEach(i => {
    if (!i?.stats) return;
    ea += i.stats.atk || 0; ed += i.stats.def || 0; em += i.stats.maxHpBonus || 0;
    ec += i.stats.crit || 0; edo += i.stats.dodge || 0;
  });
  const lv = Math.max(1, h.level || 1);
  return {
    atk: Math.round((prof.atk + ea + (lv - 1)) * (p.atkMul || 1)),
    def: prof.def + ed + Math.floor((lv - 1) * 0.5),
    maxHp: 100 + em,
    atkSpd: +((prof.atkSpd * (p.atkSpdMul || 1)).toFixed(1)),
    crit: Math.max(0, prof.crit + (p.critAdd || 0) + ec),
    dodge: Math.max(0, prof.dodge + (p.dodgeAdd || 0) + edo),
    dmgMul: p.dmgMul || 1,
    hungerMul: p.hungerMul || 1,
    goldMul: p.goldMul || 1,
    coward: p.coward || false,
    neverFlee: p.neverFlee || false,
  };
};

export const randName = () => NAMES[Math.floor(Math.random() * NAMES.length)];

const ZONE_LEVEL_RANGE = { ICE: [1, 5], MOUNTAIN: [5, 10], FOREST: [10, 15] };

const randMonsterLevel = zone => {
  const [min, max] = ZONE_LEVEL_RANGE[zone] || [1, 5];
  return min + Math.floor(Math.random() * (max - min + 1));
};

const scaleMonster = (def, level) => {
  const mul = 1 + (level - 1) * 0.15;
  return {
    maxHp: Math.round(def.maxHp * mul),
    atk:   Math.round(def.atk   * mul),
  };
};

let mid = 1;
export const spawnMonster = zone => {
  const es = Object.entries(MONSTER_DEFS).filter(([, d]) => d.zone === zone);
  const [tk, def] = es[Math.floor(Math.random() * es.length)];
  const level = randMonsterLevel(zone);
  const scaled = scaleMonster(def, level);
  const p = randInZone(zone), w = randInZone(zone);
  return {
    id: mid++, zone, typeKey: tk, name: def.name, emoji: def.emoji, level,
    hp: scaled.maxHp, maxHp: scaled.maxHp, atk: scaled.atk, loot: def.loot,
    tx: p.tx, ty: p.ty, wtx: w.tx, wty: w.ty,
    nextWander: Date.now() + Math.random() * 800, targetHunterId: null,
  };
};

export const spawnZone = (zone, count) => {
  const es = Object.entries(MONSTER_DEFS).filter(([, d]) => d.zone === zone);
  const b = zoneBounds(zone), bw = b.x2 - b.x1, bh = b.y2 - b.y1, G = 4, cW = bw / G, cH = bh / G;
  const cells = [];
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) cells.push([r, c]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, count).map(([r, c]) => {
    const [tk, def] = es[Math.floor(Math.random() * es.length)], w = randInZone(zone);
    const level = randMonsterLevel(zone);
    const scaled = scaleMonster(def, level);
    return {
      id: mid++, zone, typeKey: tk, name: def.name, emoji: def.emoji, level,
      hp: scaled.maxHp, maxHp: scaled.maxHp, atk: scaled.atk, loot: def.loot,
      tx: b.x1 + c * cW + (0.15 + Math.random() * 0.7) * cW,
      ty: b.y1 + r * cH + (0.15 + Math.random() * 0.7) * cH,
      wtx: w.tx, wty: w.ty,
      nextWander: Date.now() + Math.random() * 800, targetHunterId: null,
    };
  });
};

let eqId = 1;
export const genEquip = (slot, quality, forProfession = null) => {
  const q = QUALITY[quality], s = EQUIP_SLOTS[slot];
  const name = EQ_NAMES[slot][Math.floor(Math.random() * EQ_NAMES[slot].length)];
  const stats = {};
  Object.entries(s.baseStats).forEach(([k, v]) => { stats[k] = Math.round(v * q.mult); });
  return { id: eqId++, slot, quality, name: `${q.name}·${name}`, emoji: s.emoji, stats, color: q.color, ...(forProfession ? { forProfession } : {}) };
};

let candId = 8000;
export const genCandidate = () => {
  const pk = Object.keys(PROFESSIONS)[Math.floor(Math.random() * 3)];
  const pers = PKEYS[Math.floor(Math.random() * PKEYS.length)];
  const pos = randInZone('VILLAGE');
  return {
    id: candId++,
    name: randName(),
    profession: pk,
    personality: pers,
    level: 1,
    location: 'VILLAGE',
    hp: 100, maxHp: 100, hunger: 100, maxHunger: 100,
    tx: pos.tx, ty: pos.ty,
    wtx: null, nextWander: 0,
    combatTargetId: null, savedDest: null,
    prevZone: null, recoverType: null, recoverUntil: null,
    complaint: null, complaintUntil: null,
    equipment: { weapon: null, armor: null, accessory: null },
    wallet: 0, backpack: {}, isGhost: false, isExiled: false,
    xp: 0, skills: [], attackCount: 0, pendingSkillLearn: false,
  };
};

export const rollQ = w => {
  const ks = Object.keys(w).filter(k => w[k] > 0);
  let r = Math.random() * ks.reduce((s, k) => s + w[k], 0);
  for (const k of ks) { r -= w[k]; if (r <= 0) return k; }
  return ks[0];
};

export const rollLoot = def => {
  const d = def?.dt, items = [], mats = {};
  if (!d) return { items, mats };
  if (Math.random() < d.mc) mats[d.mk] = 1;
  if (Math.random() < d.ec) {
    const q = rollQ(d.w), slots = ['weapon', 'armor', 'accessory'];
    items.push(genEquip(slots[Math.floor(Math.random() * 3)], q));
  }
  return { items, mats };
};
