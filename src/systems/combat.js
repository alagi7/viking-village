import { MONSTER_DEFS, ZONE_DEFS, HEALER_FEE, TAVERN_FEE, XP_PER_LEVEL, SKILL_LEVEL_XP, SKILL_DEFS, PROF_SKILLS, M_ATK, PORTAL_TX_LEFT, PORTAL_TX_RIGHT, PORTAL_TY, ZONE_CHAIN, H_SIGHT } from '../constants/game.js';
import { dst, hMaxHp, getStats, randInZone, calcLevel } from '../utils/helpers.js';

// 从村庄逐段走传送门回野外区（只走一步，portalFinalTarget 处理后续段）
const goBackWild = (h, pz) => {
  const nextZone = ZONE_CHAIN[1]; // 第一步始终到 ICE_1（VILLAGE右侧第一个）
  const hasMore = nextZone !== pz;
  return {
    location: 'TRAVELING',
    destZone: 'VILLAGE',
    destTx: PORTAL_TX_RIGHT,
    destTy: PORTAL_TY,
    portalTarget: nextZone,
    portalFinalTarget: hasMore ? pz : null,
    combatTargetId: null,
  };
};

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

const addSkillXp = (h, skillId, amount, logs) => {
  if (!hasSkill(h, skillId)) return;
  if (!h.skillXp) h.skillXp = {};
  if (!h.skillLevel) h.skillLevel = {};
  const cur = h.skillXp[skillId] || 0;
  const lv = h.skillLevel[skillId] || 1;
  if (lv >= 5) return; // max level
  h.skillXp[skillId] = cur + amount;
  // Check level up
  let newLv = lv;
  let xpAcc = h.skillXp[skillId];
  for (let i = 0; i < SKILL_LEVEL_XP.length; i++) {
    if (xpAcc >= SKILL_LEVEL_XP[i]) newLv = i + 2;
    else break;
  }
  if (newLv > lv) {
    h.skillLevel[skillId] = newLv;
    const sk = SKILL_DEFS[skillId];
    if (logs) logs.push(`✨ ${h.name} 【${sk.name}】升至 Lv${newLv}！`);
  }
};

export const procCombat = ({ hunters, monsters, resources, buildings, tickCount, now, strategy }) => {
  const H = hunters.map(h => ({ ...h }));
  const M = monsters.map(m => ({ ...m }));
  const R = { ...resources };
  const logs = [], respawn = [], newLootDrops = [], attackEvents = [], zoneKillDelta = {};

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
          const resumeZone = h.pendingZone || h.prevZone;
          h.pendingSkillLearn = false;
          h.pendingZone = null;
          h.prevZone = null;
          if (resumeZone && resumeZone !== 'VILLAGE') {
            Object.assign(h, goBackWild(h, resumeZone));
          }
        }
      }

      // Fast recovery
      if (h.recoverType && h.recoverUntil) {
        if (now >= h.recoverUntil) {
          const pz = h.pendingZone || h.prevZone;
          if (h.recoverType === 'HP') h.hp = maxHp;
          else h.hunger = h.maxHunger;
          h.recoverType = null; h.recoverUntil = null; h.hungerGiveUpAt = null;
          h.complaint = null; h.complaintUntil = null;
          if (h.pendingSkillLearn) {
            // Go to skill hall first, then resume zone
            const hall = buildings.find(b => b.type === 'SKILL_HALL');
            if (hall) {
              Object.assign(h, { location: 'TRAVELING', destZone: 'VILLAGE', destTx: hall.tx + 2, destTy: hall.ty + 2, combatTargetId: null });
              // keep pendingSkillLearn, prevZone, pendingZone so skill hall handler can resume correctly
            } else {
              h.pendingSkillLearn = false;
              h.prevZone = null; h.pendingZone = null;
              if (pz && pz !== 'VILLAGE') {
                Object.assign(h, goBackWild(h, pz));
              }
            }
          } else {
            h.prevZone = null; h.pendingZone = null;
            if (pz && pz !== 'VILLAGE') {
              Object.assign(h, goBackWild(h, pz));
              logs.push(`💪 ${h.name} 恢复完毕，前往${ZONE_DEFS[pz].name}`);
            }
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
          const paid = Math.min(fee, h.wallet || 0);
          h.recoverUntil = now + 5000;
          h.wallet = Math.max(0, (h.wallet || 0) - paid);
          R.gold += paid;
          h.complaint = null; h.complaintUntil = null;
        } else if (!bldg && tickCount % 5 === 0) {
          h.complaint = pick(h.recoverType === 'HP' ? HP_COMPLAINTS : HNG_COMPLAINTS);
          h.complaintUntil = now + 3500;
        }
        const okHP = h.recoverType === 'HP' && h.hp >= maxHp * 0.75 && h.hunger >= 30 && !bldg;
        // 没有酒馆时，饥饿猎人在 HQ 等 15 秒后强制出发（饥饿不会被动回复）
        if (h.recoverType === 'HUNGER' && !bldg && !h.hungerGiveUpAt) h.hungerGiveUpAt = now + 15000;
        const okHunger = h.recoverType === 'HUNGER' && !bldg && h.hungerGiveUpAt && now >= h.hungerGiveUpAt;
        if (okHP || okHunger) {
          h.hungerGiveUpAt = null;
          const pz = h.pendingZone || h.prevZone;
          h.recoverType = null;
          h.complaint = null; h.complaintUntil = null;
          if (h.pendingSkillLearn) {
            const hall = buildings.find(b => b.type === 'SKILL_HALL');
            if (hall) {
              Object.assign(h, { location: 'TRAVELING', destZone: 'VILLAGE', destTx: hall.tx + 2, destTy: hall.ty + 2, combatTargetId: null });
            } else {
              h.pendingSkillLearn = false;
              h.prevZone = null; h.pendingZone = null;
              if (pz && pz !== 'VILLAGE') {
                Object.assign(h, goBackWild(h, pz));
              }
            }
          } else {
            h.prevZone = null; h.pendingZone = null;
            if (pz && pz !== 'VILLAGE') {
              Object.assign(h, goBackWild(h, pz));
              logs.push(`🏃 ${h.name} 缓慢恢复，前往${ZONE_DEFS[pz].name}`);
            }
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
      let healed = false;
      H.forEach(ally => {
        if (!ally.isGhost && ally.location === h.location &&
            dst(h.tx, h.ty, ally.tx, ally.ty) <= 18) {
          const before = ally.hp;
          ally.hp = Math.min(hMaxHp(ally), ally.hp + 8);
          if (ally.hp > before) healed = true;
        }
      });
      attackEvents.push({ id: ++lootId, zone: h.location, profession: 'SHAMAN', type: 'heal', fromTx: h.tx, fromTy: h.ty, toTx: h.tx, toTy: h.ty, crit: false, startTime: now, duration: 1000, healed });
      addSkillXp(h, 'heal', 1, logs);
    }

    // ── Combat ────────────────────────────────────────────────────────
    if (h.combatTargetId) {
      const sightRange = hasSkill(h, 'eagle_eye') ? H_SIGHT * 1.3 : hasSkill(h, 'prophecy') ? H_SIGHT * 5 : H_SIGHT;
      let t = M.find(m => m.id === h.combatTargetId && m.hp > 0);
      if (!t && !isTrav)
        t = M.filter(m => m.zone === h.location && m.hp > 0 && dst(h.tx, h.ty, m.tx, m.ty) <= sightRange)
          .sort((a, b) => dst(h.tx, h.ty, a.tx, a.ty) - dst(h.tx, h.ty, b.tx, b.ty))[0];

      if (t) {
        // War Cry: check if any nearby warrior has war_cry, grant them XP
        let warCryBonus = 1;
        const warCryWarrior = H.find(o => o.profession === 'WARRIOR' && hasSkill(o, 'war_cry') && !o.isGhost &&
          o.location === h.location && dst(h.tx, h.ty, o.tx, o.ty) <= 22);
        if (warCryWarrior) { warCryBonus = 1.08; addSkillXp(warCryWarrior, 'war_cry', 1, logs); }

        // Heavy Strike: force crit every 5th attack
        const newAtkCount = (h.attackCount || 0) + 1;
        h.attackCount = newAtkCount;
        const forceCrit = hasSkill(h, 'heavy_strike') && newAtkCount % 5 === 0;
        if (forceCrit) addSkillXp(h, 'heavy_strike', 1, logs);

        const ic = forceCrit || Math.random() * 100 < st.crit;
        const critMul = hasSkill(h, 'lethal') ? 2.5 : 2;  // Lethal: 2.5× crit
        const curseMul = hasSkill(h, 'curse') ? 1.18 : 1;  // Curse: -15% def = ~+18% dmg
        if (hasSkill(h, 'curse')) addSkillXp(h, 'curse', 1, logs);
        if (ic && hasSkill(h, 'lethal')) addSkillXp(h, 'lethal', 1, logs);
        if (hasSkill(h, 'taunt')) addSkillXp(h, 'taunt', 1, logs);
        if (hasSkill(h, 'eagle_eye')) addSkillXp(h, 'eagle_eye', 1, logs);
        if (hasSkill(h, 'prophecy')) addSkillXp(h, 'prophecy', 1, logs);

        const dmg = Math.round((st.atk + Math.floor(Math.random() * 8)) * (ic ? critMul : 1) * warCryBonus * curseMul);
        const recv = Math.random() * 100 < st.dodge
          ? 0
          : Math.round(Math.max(1, t.atk - st.def + Math.floor(Math.random() * 5) - 2) * st.dmgMul);

        t.hp -= dmg; h.hp = Math.max(0, h.hp - recv);
        if (t.hp > 0) t.targetHunterId = h.id;

        attackEvents.push({ id: ++lootId, zone: h.location, profession: h.profession, fromTx: h.tx, fromTy: h.ty, toTx: t.tx, toTy: t.ty, crit: ic, startTime: now, duration: 550 });

        // Rapid Fire: 25% chance for a bonus attack
        if (hasSkill(h, 'rapid_fire') && Math.random() < 0.25 && t.hp > 0) {
          const dmg2 = Math.round((st.atk + Math.floor(Math.random() * 6)) * warCryBonus);
          t.hp -= dmg2;
          attackEvents.push({ id: ++lootId, zone: h.location, profession: h.profession, fromTx: h.tx, fromTy: h.ty, toTx: t.tx, toTy: t.ty, crit: false, startTime: now + 120, duration: 400 });
          addSkillXp(h, 'rapid_fire', 1, logs);
        }

        if (t.hp <= 0) {
          const goldTotal = Math.round((t.loot.gold || 0) * st.goldMul);
          if (goldTotal > 0) {
            const tax = Math.max(1, Math.round(goldTotal * 0.05));
            const gold = goldTotal - tax;
            R.gold += tax;
            if (gold > 0) newLootDrops.push({ id: ++lootId, tx: t.tx + (Math.random() - 0.5) * 3, ty: t.ty + (Math.random() - 0.5) * 3, zone: t.zone, type: 'gold', amount: gold, killerId: h.id, spawnTime: now, state: 'ground' });
          }
          const matKey = rollMat(MONSTER_DEFS[t.typeKey]);
          if (matKey) newLootDrops.push({ id: ++lootId, tx: t.tx + (Math.random() - 0.5) * 3, ty: t.ty + (Math.random() - 0.5) * 3, zone: t.zone, type: 'material', matKey, amount: 1, killerId: h.id, spawnTime: now, state: 'ground' });

          // ── XP & level up ────────────────────────────────────────────
          const baseXp = MONSTER_DEFS[t.typeKey]?.xp || 20;
          const xpGain = Math.round(baseXp * (1 + (t.level - 1) * 0.15));
          const newXp = (h.xp || 0) + xpGain;
          const oldLevel = h.level || 1;
          const newLevel = Math.min(100, calcLevel(newXp));
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
          zoneKillDelta[t.zone] = (zoneKillDelta[t.zone] || 0) + 1;
          t.hp = -999;
        }
      }
    }

    // ── Death check（TRAVELING 中被击杀也要处理）────────────────────────
    if (h.hp <= 0) {
      const altar = buildings.find(b => b.type === 'ALTAR');
      const hq = buildings.find(b => b.type === 'HEADQUARTERS');
      const dp = altar ? { tx: altar.tx + 2, ty: altar.ty + 2 } : hq ? { tx: hq.tx + 2, ty: hq.ty + 2 } : { tx: 59, ty: 59 };
      const prevZ = h.location !== 'TRAVELING' ? h.location : (h.destZone || h.prevZone || null);
      const ghostFromIdx = ZONE_CHAIN.indexOf(prevZ);
      if (prevZ && prevZ !== 'VILLAGE' && ghostFromIdx > 0) {
        const ghostNext = ZONE_CHAIN[ghostFromIdx - 1];
        const ghostHasMore = ghostNext !== 'VILLAGE';
        Object.assign(h, { isGhost: true, hp: 0, location: 'TRAVELING', destZone: prevZ, destTx: PORTAL_TX_LEFT, destTy: PORTAL_TY, portalTarget: ghostNext, portalFinalTarget: ghostHasMore ? 'VILLAGE' : null, combatTargetId: null, savedDest: null, recoverType: null, recoverUntil: null, prevZone: null, complaint: null, complaintUntil: null, ghostPrevZone: prevZ });
      } else {
        Object.assign(h, { isGhost: true, hp: 0, location: 'TRAVELING', destZone: 'VILLAGE', destTx: dp.tx, destTy: dp.ty, combatTargetId: null, savedDest: null, recoverType: null, recoverUntil: null, prevZone: null, complaint: null, complaintUntil: null, ghostPrevZone: prevZ });
      }
      logs.push(`💀 ${h.name} 阵亡！以幽灵身份返回${altar ? '祭坛' : '大本营'}...`);
      return;
    }

    // 已在逃跑途中，跳过撤退判定（死亡已在上面处理）
    if (isTrav) return;

    // ── Flee check ────────────────────────────────────────────────────
    const fleeHpPct = strategy?.fleeHpPct ?? 0.4;
    const fleeHungerPct = strategy?.fleeHungerPct ?? 0.4;
    const fhp = st.coward ? maxHp * 0.5 : maxHp * fleeHpPct;
    const fhunger = h.maxHunger * fleeHungerPct;
    if (!st.neverFlee && (h.hp < fhp || h.hunger < fhunger)) {
      const rt = h.hp < fhp ? 'HP' : 'HUNGER';
      const bldg = buildings.find(b => b.type === (rt === 'HP' ? 'HEALER' : 'TAVERN'));
      const hq = buildings.find(b => b.type === 'HEADQUARTERS');
      const dp = bldg ? { tx: bldg.tx + 2, ty: bldg.ty + 2 } : hq ? { tx: hq.tx + 2, ty: hq.ty + 2 } : { tx: 59, ty: 59 };
      logs.push(st.coward ? `😰 ${h.name} 胆小鬼逃跑！` : rt === 'HP' ? `🏥 ${h.name} 受伤撤退！` : `🍖 ${h.name} 饥饿撤退！`);
      const fleeZone = h.location;
      const fleeFromIdx = ZONE_CHAIN.indexOf(fleeZone);
      if (fleeFromIdx > 0) {
        // 野外区域：走传送门逐步回村
        const fleeNextZone = ZONE_CHAIN[fleeFromIdx - 1];
        const fleeHasMore = fleeNextZone !== 'VILLAGE';
        Object.assign(h, {
          prevZone: fleeZone, recoverType: rt,
          location: 'TRAVELING', destZone: fleeZone,
          destTx: PORTAL_TX_LEFT, destTy: PORTAL_TY,
          portalTarget: fleeNextZone,
          portalFinalTarget: fleeHasMore ? 'VILLAGE' : null,
          combatTargetId: null, savedDest: null, complaint: null, complaintUntil: null,
        });
      } else {
        // 已在村庄（理论上不应触发战斗撤退，保留兜底）
        Object.assign(h, { prevZone: fleeZone, recoverType: rt, location: 'TRAVELING', destZone: 'VILLAGE', destTx: dp.tx, destTy: dp.ty, combatTargetId: null, savedDest: null, complaint: null, complaintUntil: null });
      }
    }
  });

  // ── Monster attacks hunters (runs regardless of hunter combatTargetId) ──
  M.forEach(m => {
    if (m.hp <= 0 || !m.targetHunterId) return;
    const h = H.find(x => x.id === m.targetHunterId);
    if (!h || h.isGhost || h.hp <= 0) return;
    if (dst(h.tx, h.ty, m.tx, m.ty) > H_SIGHT) return; // 用视野范围作为攻击上限，避免 SEP 推挤导致近战怪物打不到猎人
    const st = getStats(h);
    const dodged = Math.random() * 100 < st.dodge;
    if (dodged) return;
    const dmg = Math.max(1, m.atk - st.def + Math.floor(Math.random() * 5) - 2);
    h.hp = Math.max(0, h.hp - dmg);

    // Death check for this hunter (may have just been killed by monster)
    if (h.hp <= 0 && !h.isGhost) {
      const altar = buildings.find(b => b.type === 'ALTAR');
      const hq2 = buildings.find(b => b.type === 'HEADQUARTERS');
      const dp = altar ? { tx: altar.tx + 2, ty: altar.ty + 2 } : hq2 ? { tx: hq2.tx + 2, ty: hq2.ty + 2 } : { tx: 59, ty: 59 };
      const prevZ2 = h.prevZone || (h.location !== 'TRAVELING' ? h.location : null);
      const ghost2FromIdx = ZONE_CHAIN.indexOf(prevZ2);
      if (prevZ2 && prevZ2 !== 'VILLAGE' && ghost2FromIdx > 0) {
        const ghost2Next = ZONE_CHAIN[ghost2FromIdx - 1];
        const ghost2HasMore = ghost2Next !== 'VILLAGE';
        Object.assign(h, { isGhost: true, hp: 0, location: 'TRAVELING', destZone: prevZ2, destTx: PORTAL_TX_LEFT, destTy: PORTAL_TY, portalTarget: ghost2Next, portalFinalTarget: ghost2HasMore ? 'VILLAGE' : null, combatTargetId: null, savedDest: null, recoverType: null, recoverUntil: null, prevZone: null, complaint: null, complaintUntil: null, ghostPrevZone: prevZ2 });
      } else {
        Object.assign(h, { isGhost: true, hp: 0, location: 'TRAVELING', destZone: 'VILLAGE', destTx: dp.tx, destTy: dp.ty, combatTargetId: null, savedDest: null, recoverType: null, recoverUntil: null, prevZone: null, complaint: null, complaintUntil: null, ghostPrevZone: prevZ2 });
      }
      logs.push(`💀 ${h.name} 在逃跑中被击倒！以幽灵身份返回${altar ? '祭坛' : '大本营'}...`);
    }
  });

  return { newHunters: H, newMonsters: M.filter(m => m.hp > 0), newResources: R, logs, respawn, newLootDrops, attackEvents, zoneKillDelta };
};
