import { TS, WS, WILD_WS, MS, H_SIGHT, M_SIGHT, M_ATK, SEP } from '../constants/game.js';
import { dst, moveTo, randInZone, clampZone, tileZone } from '../utils/helpers.js';

const hasSkill = (h, sk) => (h.skills || []).includes(sk);
const hunterSight = h => hasSkill(h, 'prophecy') ? H_SIGHT * 5 : hasSkill(h, 'eagle_eye') ? H_SIGHT * 1.3 : H_SIGHT;

export const procHunterMove = (hunters, curM, buildings, now) => hunters.map(h => {
  if (h.location === 'TRAVELING') {
    const r = moveTo(h.tx, h.ty, h.destTx, h.destTy, TS);
    if (r.arrived) {
      const a = {
        ...h, tx: r.x, ty: r.y,
        location: h.destZone,
        destZone: null, destTx: null, destTy: null,
        wtx: null, nextWander: now + 500,
        combatTargetId: null, savedDest: null,
      };
      if (h.destZone === 'VILLAGE') {
        a.visitTradingPost = true;

        // Exiled hunter reaches gate — mark for removal (disappears at gate)
        if (h.isExiled) {
          return { ...a, _remove: true };
        }
      }
      return a;
    }
    if (!h.recoverType && !h.isGhost) {
      const cz = tileZone(h.tx, h.ty);
      if (cz !== 'VILLAGE') {
        const sight = hunterSight(h);
        const vm = curM.filter(m => m.zone === cz && m.hp > 0).find(m => dst(h.tx, h.ty, m.tx, m.ty) <= sight);
        if (vm) return {
          ...h, tx: r.x, ty: r.y, location: cz,
          destZone: null, destTx: null, destTy: null,
          combatTargetId: vm.id, wtx: null, nextWander: now + 3000,
          savedDest: h.savedDest ?? { zone: h.destZone, tx: h.destTx, ty: h.destTy },
        };
      }
    }
    return { ...h, tx: r.x, ty: r.y, combatTargetId: null };
  }

  if (h.location === 'VILLAGE') {
    if (h.recoverUntil) return h; // don't move during fast recovery
    // Ghost rushes to altar; recoverUntil is set by combat.js (once/sec) to avoid race
    if (h.isGhost && !h.recoverUntil) {
      const altar = (buildings || []).find(b => b.type === 'ALTAR');
      if (altar) {
        const atx = altar.tx + 2, aty = altar.ty + 2;
        if (dst(h.tx, h.ty, atx, aty) > 4) {
          return { ...h, location: 'TRAVELING', destZone: 'VILLAGE', destTx: atx, destTy: aty, wtx: null, nextWander: 0 };
        }
        return h; // at altar — stay put, combat.js will set recoverUntil
      }
      // No altar: wander as ghost (fall through to wander logic below)
    }
    // Rush to healing/tavern building at full travel speed (TRAVELING state → yellow dot)
    if (h.recoverType && !h.recoverUntil) {
      const bldgType = h.recoverType === 'HP' ? 'HEALER' : 'TAVERN';
      const bldg = (buildings || []).find(b => b.type === bldgType);
      if (bldg) {
        const btx = bldg.tx + 2, bty = bldg.ty + 2;
        if (dst(h.tx, h.ty, btx, bty) > 4) {
          return { ...h, location: 'TRAVELING', destZone: 'VILLAGE', destTx: btx, destTy: bty, wtx: null, nextWander: 0, combatTargetId: null };
        }
        return h; // already at building — combat.js proximity check will fire
      }
      // No building: head to HQ and wait for HP/hunger to recover (combat.js passive regen handles dispatch)
      const hq = (buildings || []).find(b => b.type === 'HEADQUARTERS');
      const htx = hq ? hq.tx + 2 : 59, hty = hq ? hq.ty + 2 : 59;
      if (dst(h.tx, h.ty, htx, hty) > 4) {
        return { ...h, location: 'TRAVELING', destZone: 'VILLAGE', destTx: htx, destTy: hty, wtx: null, nextWander: 0, combatTargetId: null };
      }
      return h; // at HQ — stay put, combat.js okHP/okHunger will clear recoverType and dispatch
    }
    if (!h.wtx || !h.nextWander || now > h.nextWander) {
      const w = randInZone('VILLAGE');
      return { ...h, wtx: w.tx, wty: w.ty, nextWander: now + 2000 + Math.random() * 3000 };
    }
    const r = moveTo(h.tx, h.ty, h.wtx, h.wty, WS * 0.6);
    return { ...h, tx: r.x, ty: r.y, ...(r.arrived ? { nextWander: now + 1500 + Math.random() * 2500 } : {}) };
  }

  const sight = hunterSight(h);
  const vm = curM.filter(m => m.zone === h.location && m.hp > 0)
    .sort((a, b) => dst(h.tx, h.ty, a.tx, a.ty) - dst(h.tx, h.ty, b.tx, b.ty))
    .find(m => dst(h.tx, h.ty, m.tx, m.ty) <= sight);
  if (vm) return { ...h, combatTargetId: vm.id };

  if (h.savedDest) {
    if (h.savedDest.zone === h.location) return { ...h, savedDest: null, combatTargetId: null };
    return { ...h, location: 'TRAVELING', destZone: h.savedDest.zone, destTx: h.savedDest.tx, destTy: h.savedDest.ty, savedDest: null, combatTargetId: null };
  }

  if (!h.wtx || !h.nextWander || now > h.nextWander) {
    const w = randInZone(h.location);
    return { ...h, wtx: w.tx, wty: w.ty, nextWander: now + 2000 + Math.random() * 3000, combatTargetId: null };
  }
  const r = moveTo(h.tx, h.ty, h.wtx, h.wty, WILD_WS);
  return { ...h, tx: r.x, ty: r.y, combatTargetId: null, ...(r.arrived ? { nextWander: now + 1000 + Math.random() * 2000 } : {}) };
});

export const procMonsterMove = (monsters, curH, now) => {
  const upd = monsters.map(m => {
    // Monsters never leave their zone — target must still have tiles within this zone
    const ag = m.targetHunterId
      ? curH.find(h => h.id === m.targetHunterId && !isNaN(h.tx) && !h.isGhost && tileZone(h.tx, h.ty) === m.zone)
      : null;
    // Taunt: warriors with taunt in sight range take priority as targets
    // Ghosts are invisible to monsters
    const inSight = !ag ? curH.filter(h => h.location === m.zone && !isNaN(h.tx) && !h.isGhost && dst(m.tx, m.ty, h.tx, h.ty) <= M_SIGHT) : [];
    const tauntHunter = inSight.find(h => h.profession === 'WARRIOR' && hasSkill(h, 'taunt'));
    const si = !ag ? (tauntHunter || inSight.sort((a, b) => dst(m.tx, m.ty, a.tx, a.ty) - dst(m.tx, m.ty, b.tx, b.ty))[0] || null) : null;
    const tg = ag || si;
    if (tg) {
      const d = dst(m.tx, m.ty, tg.tx, tg.ty);
      if (d <= M_ATK) return { ...m, targetHunterId: tg.id };
      const fleeing = tg.location === 'TRAVELING';
      const spd = fleeing ? MS * 2.2 : ag ? MS * 1.8 : MS * 1.4;
      const r = moveTo(m.tx, m.ty, tg.tx, tg.ty, spd);
      // Clamp monster to its own zone
      const clamped = clampZone(r.x, r.y, m.zone);
      return { ...m, tx: clamped.tx, ty: clamped.ty, targetHunterId: tg.id };
    }
    // No target — patrol the whole zone at higher speed, commit to long paths
    let nm = { ...m, targetHunterId: null };
    if (!nm.wtx || !nm.nextWander || now > nm.nextWander) {
      const w = randInZone(m.zone);
      nm = { ...nm, wtx: w.tx, wty: w.ty, nextWander: now + 10000 + Math.random() * 10000 };
    }
    const r = moveTo(nm.tx, nm.ty, nm.wtx, nm.wty, MS * 1.5);
    if (r.arrived) {
      const w = randInZone(m.zone);
      return { ...nm, tx: r.x, ty: r.y, wtx: w.tx, wty: w.ty, nextWander: now + 800 + Math.random() * 1200 };
    }
    return { ...nm, tx: r.x, ty: r.y };
  });

  return upd.map((m, i) => {
    let sx = 0, sy = 0;
    upd.forEach((o, j) => {
      if (i === j) return;
      const dx = m.tx - o.tx, dy = m.ty - o.ty, d = Math.sqrt(dx * dx + dy * dy);
      if (d < SEP) {
        if (d < 0.2) { sx += (Math.random() - 0.5) * 1.5; sy += (Math.random() - 0.5) * 1.5; }
        else { sx += dx / d * (SEP - d) * 0.2; sy += dy / d * (SEP - d) * 0.2; }
      }
    });
    if (!sx && !sy) return m;
    return { ...m, ...clampZone(m.tx + sx, m.ty + sy, m.zone) };
  });
};
