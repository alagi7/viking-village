import { MONSTER_DEFS, ZONE_DEFS, HEALER_FEE, TAVERN_FEE, XP_PER_LEVEL, SKILL_DEFS, PROF_SKILLS, M_ATK } from '../constants/game.js';
import { dst, hMaxHp, getStats, randInZone, calcLevel } from '../utils/helpers.js';
import { H_SIGHT } from '../constants/game.js';

let lootId = 1000;

const rollMat = def => {
  const d = def?.dt;
  if (!d || Math.random() >= d.mc) return null;
  return d.mk;
};

const HP_COMPLAINTS   = ['需要治疗所!', '我受伤了!', '快死了!', '救救我!'];
const HNG_COMPLAINTS  = ['需要酒馆!',  '快饿死了!', '好饿啊!', '有食物吗?'];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const hasSkill = (h, sk) => (h.skills || []).includes(sk);

export const procCombat = ({ hunters, monsters, resources, buildings, tickCount, now }) => {
  const H = hunters.map(h => ({ ...h }));
  const M = monsters.map(m => ({ ...m }));
  const R = { ...resources };
  const logs = [], respawn = [], newLootDrops = [], attackEvents = [];

  H.forEach(h => {
    const st = getStats(h), isTrav = h.location === 'TRAVELING';
    const maxHp = hMaxHp(h);
    const sk = h.skills || [];

    // ── Ghost / revival logic ──────────────────────────────────────────
    // Ghost: revival is handled in App.jsx movement interval to avoid race conditions.
    // Only emit "需要祭坛" complaint here.
    if (h.isGhost) {
      if (h.location === 'VILLAGE' && !h.recoverUntil && tickCount % 5 === 0) {
        const altar = buildings.find(b => b.type === 'ALTAR');
        if (!altar) { h.complaint = '需要祭坛!'; h.complaintUntil = now + 3500; }
      }
      return;
    }

    // ── Village logic ──────────────────────────────────────────────────
    if (h.location === 'VILLAGE') {
      // SKILL_HALL proximity — learn pending skills
      if (h.pendingSkillLearn) {
        const hall = buildings.find(b => b.type === 'SKILL_HALL');
        if (hall && dst(h.tx, h.ty, hall.tx + 2, hall.ty + 2) <= 5) {
          const level = h.level || 1;
          const learnable = (PROF_SKILLS[h.profession] || []).filter(
            s => SKILL_DEFS[s].reqLevel <= level && !sk.includes(s)
          );
          if (learnable.length > 0) {
            h.skills = [...sk, ...learnable];
            h.complaint = `学会了${learnable.map(s => SKILL_DEFS[s].name).join('、')}!`;
            h.complaintUntil = now + 5000;
            logs.push(`📚 ${h.name} 学会了【${learnable.map(s => SKILL_DEFS[s].name).join('、')}】！`);
          }
          h.pendingSkillLearn = false;
        }
      }

      // Fast recovery
      if (h.recoverType && h.recoverUntil) {
        if (now >= h.recoverUntil) {
          const pz = h.pendingZone || h.prevZone;
          if (h.recoverType === 'HP') h.hp = maxHp;
          else h.hunger = h.maxHunger;
          h.recoverType = null; h.recoverUntil = null; h.prevZone = null; h.pendingZone = null;
          h.complaint = null; h.complaintUntil = null;
          if (pz && pz !== 'VILLAGE') {
            const d = randInZone(pz);
            Object.assign(h, { location: 'TRAVELING', destZone: pz, destTx: d.tx, destTy: d.ty, combatTargetId: null });
            logs.push(`💪 ${h.name} 恢复完毕，前往${ZONE_DEFS[pz].name}`);
          }
        }
        return;
      }

      // Slow passive HP regen
      h.hp = Math.min(maxHp, h.hp + 2);

      // Proximity-based building recovery
      if (h.recoverType && !h.recoverUntil) {
        const bldgType = h.recoverType === 'HP' ? 'HEALER' : 'TAVERN';
        const bldg = buildings.find(b => b.type === bldgType);
        if (bldg && dst(h.tx, h.ty, bldg.tx + 2, bldg.ty + 2) <= 5) {
          const fee = h.recoverType === 'HP' ? HEALER_FEE : TAVERN_FEE;
          h.recoverUntil = now + 5000;
          h.wallet = Math.max(0, (h.wallet || 0) - fee);
          h.complaint = null; h.complaintUntil = null;
        } else if (!bldg && tickCount % 5 === 0) {
          h.complaint = pick(h.recoverType === 'HP' ? HP_COMPLAINTS : HNG_COMPLAINTS);
          h.complaintUntil = now + 3500;
        }
        const okHP = h.recoverType === 'HP' && h.hp >= maxHp * 0.75 && !bldg;
        if (okHP) {
          const pz = h.pendingZone || h.prevZone;
          h.recoverType = null; h.prevZone = null; h.pendingZone = null;
          h.complaint = null; h.complaintUntil = null;
          if (pz && pz !== 'VILLAGE') {
            const d = randInZone(pz);
            Object.assign(h, { location: 'TRAVELING', destZone: pz, destTx: d.tx, destTy: d.ty, combatTargetId: null });
            logs.push(`🏃 ${h.name} 缓慢恢复，前往${ZONE_DEFS[pz].name}`);
          }
        }
      }

      // Shaman Heal aura (heals village hunters too)
      if (h.profession === 'SHAMAN' && hasSkill(h, 'heal') && tickCount % 8 === 0) {
        H.forEach(ally => {
          if (ally.id !== h.id && !ally.isGhost && ally.location === 'VILLAGE' &&
              dst(h.tx, h.ty, ally.tx, ally.ty) <= 18) {
            ally.hp = Math.min(hMaxHp(ally), ally.hp + 8);
          }
        });
      }
      return;
    }

    // ── Hunger drain ──────────────────────────────────────────────────
    if (tickCount % 5 === 0) h.hunger = Math.max(0, h.hunger - 1 * st.hungerMul);

    // ── Shaman Heal in wild zones ──────────────────────────────────────
    if (h.profession === 'SHAMAN' && hasSkill(h, 'heal') && tickCount % 8 === 0 && !isTrav) {
      H.forEach(ally => {
        if (ally.id !== h.id && !ally.isGhost && ally.location === h.location &&
            dst(h.tx, h.ty, ally.tx, ally.ty) <= 18) {
          ally.hp = Math.min(hMaxHp(ally), ally.hp + 8);
        }
      });
      // Push heal visual (reuse attack event system with type 'heal')
      attackEvents.push({ id: ++lootId, profession: 'SHAMAN', type: 'heal', fromTx: h.tx, fromTy: h.ty, toTx: h.tx, toTy: h.ty, crit: false, startTime: now, duration: 800 });
    }

    // ── Combat ────────────────────────────────────────────────────────
    if (h.combatTargetId) {
      const sightRange = hasSkill(h, 'eagle_eye') ? H_SIGHT * 1.3 : hasSkill(h, 'prophecy') ? H_SIGHT * 5 : H_SIGHT;
      let t = M.find(m => m.id === h.combatTargetId && m.hp > 0);
      if (!t && !isTrav)
        t = M.filter(m => m.zone === h.location && m.hp > 0 && dst(h.tx, h.ty, m.tx, m.ty) <= sightRange)
          .sort((a, b) => dst(h.tx, h.ty, a.tx, a.ty) - dst(h.tx, h.ty, b.tx, b.ty))[0];

      if (t) {
        // War Cry: check if any nearby warrior has war_cry
        const warCryBonus = H.some(o => o.profession === 'WARRIOR' && hasSkill(o, 'war_cry') && !o.isGhost &&
          o.location === h.location && dst(h.tx, h.ty, o.tx, o.ty) <= 22) ? 1.08 : 1;

        // Heavy Strike: force crit every 5th attack
        const newAtkCount = (h.attackCount || 0) + 1;
        h.attackCount = newAtkCount;
        const forceCrit = hasSkill(h, 'heavy_strike') && newAtkCount % 5 === 0;

        const ic = forceCrit || Math.random() * 100 < st.crit;
        const critMul = hasSkill(h, 'lethal') ? 2.5 : 2;  // Lethal: 2.5× crit
        const curseMul = hasSkill(h, 'curse') ? 1.18 : 1;  // Curse: -15% def = ~+18% dmg

        const dmg = Math.round((st.atk + Math.floor(Math.random() * 8)) * (ic ? critMul : 1) * warCryBonus * curseMul);
        const recv = Math.random() * 100 < st.dodge
          ? 0
          : Math.round(Math.max(1, t.atk - st.def + Math.floor(Math.random() * 5) - 2) * st.dmgMul);

        t.hp -= dmg; h.hp = Math.max(0, h.hp - recv);
        if (t.hp > 0) t.targetHunterId = h.id;

        attackEvents.push({ id: ++lootId, profession: h.profession, fromTx: h.tx, fromTy: h.ty, toTx: t.tx, toTy: t.ty, crit: ic, startTime: now, duration: 550 });

        // Rapid Fire: 25% chance for a bonus attack
        if (hasSkill(h, 'rapid_fire') && Math.random() < 0.25 && t.hp > 0) {
          const dmg2 = Math.round((st.atk + Math.floor(Math.random() * 6)) * warCryBonus);
          t.hp -= dmg2;
          attackEvents.push({ id: ++lootId, profession: h.profession, fromTx: h.tx, fromTy: h.ty, toTx: t.tx, toTy: t.ty, crit: false, startTime: now + 120, duration: 400 });
        }

        if (t.hp <= 0) {
          const gold = Math.round((t.loot.gold || 0) * st.goldMul);
          if (gold > 0) newLootDrops.push({ id: ++lootId, tx: t.tx + (Math.random() - 0.5) * 3, ty: t.ty + (Math.random() - 0.5) * 3, zone: t.zone, type: 'gold', amount: gold, killerId: h.id, spawnTime: now, state: 'ground' });
          const matKey = rollMat(MONSTER_DEFS[t.typeKey]);
          if (matKey) newLootDrops.push({ id: ++lootId, tx: t.tx + (Math.random() - 0.5) * 3, ty: t.ty + (Math.random() - 0.5) * 3, zone: t.zone, type: 'material', matKey, amount: 1, killerId: h.id, spawnTime: now, state: 'ground' });

          // ── XP & level up ────────────────────────────────────────────
          const xpGain = MONSTER_DEFS[t.typeKey]?.xp || 20;
          const newXp = (h.xp || 0) + xpGain;
          const oldLevel = h.level || 1;
          const newLevel = Math.min(10, calcLevel(newXp));
          h.xp = newXp;
          if (newLevel > oldLevel) {
            h.level = newLevel;
            logs.push(`⬆️ ${h.name} 升至 Lv${newLevel}！`);
            const newSkills = (PROF_SKILLS[h.profession] || []).filter(s => SKILL_DEFS[s].reqLevel === newLevel);
            if (newSkills.length > 0) {
              h.complaint = `新技能可学!`;
              h.complaintUntil = now + 7000;
              logs.push(`📚 ${h.name} 解锁新技能【${newSkills.map(s => SKILL_DEFS[s].name).join('、')}】，前往技能所学习！`);
            }
          }

          logs.push(`${ic ? '💥 暴击！' : '⚔️'} ${h.name} 斩杀${t.emoji}${t.name}！(+${xpGain}XP)`);
          respawn.push(t.zone);
          t.hp = -999;
        }
      }
    }

    if (isTrav) return;

    // ── Death check ───────────────────────────────────────────────────
    if (h.hp <= 0) {
      const altar = buildings.find(b => b.type === 'ALTAR');
      const dp = altar ? { tx: altar.tx + 2, ty: altar.ty + 2 } : randInZone('VILLAGE');
      const prevZ = h.location !== 'TRAVELING' ? h.location : (h.destZone || h.prevZone || null);
      Object.assign(h, { isGhost: true, hp: 0, location: 'TRAVELING', destZone: 'VILLAGE', destTx: dp.tx, destTy: dp.ty, combatTargetId: null, savedDest: null, recoverType: null, recoverUntil: null, prevZone: null, complaint: null, complaintUntil: null, ghostPrevZone: prevZ });
      logs.push(`💀 ${h.name} 阵亡！以幽灵身份返回${altar ? '祭坛' : '村庄'}...`);
      return;
    }

    // ── Flee check ────────────────────────────────────────────────────
    const fhp = st.coward ? maxHp * 0.4 : 30;
    if (!st.neverFlee && (h.hp < fhp || h.hunger < 20)) {
      const rt = h.hp < fhp ? 'HP' : 'HUNGER';
      const bldg = buildings.find(b => b.type === (rt === 'HP' ? 'HEALER' : 'TAVERN'));
      const dp = bldg ? { tx: bldg.tx + 2, ty: bldg.ty + 2 } : randInZone('VILLAGE');
      logs.push(st.coward ? `😰 ${h.name} 胆小鬼逃跑！` : rt === 'HP' ? `🏥 ${h.name} 受伤撤退！` : `🍖 ${h.name} 饥饿撤退！`);
      Object.assign(h, { prevZone: h.location, recoverType: rt, location: 'TRAVELING', destZone: 'VILLAGE', destTx: dp.tx, destTy: dp.ty, combatTargetId: null, savedDest: null, complaint: null, complaintUntil: null });
    }
  });

  // ── Monster attacks hunters (runs regardless of hunter combatTargetId) ──
  M.forEach(m => {
    if (m.hp <= 0 || !m.targetHunterId) return;
    const h = H.find(x => x.id === m.targetHunterId);
    if (!h || h.isGhost || h.hp <= 0) return;
    if (dst(h.tx, h.ty, m.tx, m.ty) > M_ATK + 1.5) return; // must be close enough
    const st = getStats(h);
    const dodged = Math.random() * 100 < st.dodge;
    if (dodged) return;
    const dmg = Math.max(1, m.atk - st.def + Math.floor(Math.random() * 5) - 2);
    h.hp = Math.max(0, h.hp - dmg);

    // Death check for this hunter (may have just been killed by monster)
    if (h.hp <= 0 && !h.isGhost) {
      const altar = buildings.find(b => b.type === 'ALTAR');
      const dp = altar ? { tx: altar.tx + 2, ty: altar.ty + 2 } : randInZone('VILLAGE');
      const prevZ2 = h.prevZone || (h.location !== 'TRAVELING' ? h.location : null);
      Object.assign(h, { isGhost: true, hp: 0, location: 'TRAVELING', destZone: 'VILLAGE', destTx: dp.tx, destTy: dp.ty, combatTargetId: null, savedDest: null, recoverType: null, recoverUntil: null, prevZone: null, complaint: null, complaintUntil: null, ghostPrevZone: prevZ2 });
      logs.push(`💀 ${h.name} 在逃跑中被击倒！以幽灵身份返回${altar ? '祭坛' : '村庄'}...`);
    }
  });

  return { newHunters: H, newMonsters: M.filter(m => m.hp > 0), newResources: R, logs, respawn, newLootDrops, attackEvents };
};
