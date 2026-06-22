import React, { useState, useEffect, useRef } from 'react';
import {
  TILE, MAP_PX, HPX, HT, BSIZE, ER, H_SIGHT, MOVE_MS,
  ZONE_DEFS, ZONE_CHAIN, ZONE_UNLOCK_KILLS, ZONE_MONSTER_POOL,
  PROFESSIONS, PERSONALITIES, PCOLOR, BUILDING_TYPES, MATERIALS, QUALITY,
  HEALER_FEE, TAVERN_FEE, GATE_TX, GATE_TY,
  PORTAL_TX_LEFT, PORTAL_TX_RIGHT, PORTAL_TY,
  SKILL_DEFS, PROF_SKILLS, XP_PER_LEVEL,
} from './constants/game.js';
import {
  randInZone, spawnZone, spawnMonster, randName, hMaxHp, dst, genEquip, rollQ, genCandidate, getStats, calcLevel, xpIntoLevel,
} from './utils/helpers.js';
import { procHunterMove, procMonsterMove } from './systems/movement.js';
import { procCombat } from './systems/combat.js';
import { Bar, NameEditor } from './components/atoms.jsx';
import HuntersPanel, { HunterDetailContent } from './components/HuntersPanel.jsx';
import EquipPanel from './components/EquipPanel.jsx';
import BlacksmithPanel from './components/BlacksmithPanel.jsx';
import TradingPanel from './components/TradingPanel.jsx';
import HQPanel from './components/HQPanel.jsx';
import WorldMapPanel from './components/WorldMapPanel.jsx';

const MINI = 150, msc = MINI / HPX;

// ── Combat Effect Renderer ─────────────────────────────────────────────
function CombatEffect({ eff }) {
  const now = Date.now();
  const progress = Math.min(1, (now - eff.startTime) / eff.duration);
  const opacity = progress < 0.25 ? progress / 0.25 : Math.max(0, 1 - (progress - 0.25) / 0.75);
  if (opacity <= 0) return null;

  const fx = eff.fromTx * TILE + TILE / 2, fy = eff.fromTy * TILE + TILE / 2;
  const tx = eff.toTx  * TILE + TILE / 2, ty = eff.toTy  * TILE + TILE / 2;

  if (eff.profession === 'WARRIOR') {
    // Arc slash centered on the warrior, aimed toward the monster
    const angle = Math.atan2(ty - fy, tx - fx);
    const sweep = 2.4, r = 18 + progress * 8;
    const x1 = fx + Math.cos(angle - sweep / 2) * r, y1 = fy + Math.sin(angle - sweep / 2) * r;
    const x2 = fx + Math.cos(angle + sweep / 2) * r, y2 = fy + Math.sin(angle + sweep / 2) * r;
    const color = eff.crit ? '#fb923c' : '#fde68a';
    return (
      <g opacity={opacity}>
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              stroke={color} strokeWidth={eff.crit ? 4.5 : 3} fill="none" strokeLinecap="round" />
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              stroke="white" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.3} />
      </g>
    );
  }

  if (eff.profession === 'HUNTER') {
    const ax = fx + (tx - fx) * progress, ay = fy + (ty - fy) * progress;
    const angle = Math.atan2(ty - fy, tx - fx) * 180 / Math.PI;
    return (
      <g opacity={opacity} transform={`translate(${ax},${ay}) rotate(${angle})`}>
        <line x1={-13} y1={0} x2={5} y2={0} stroke="#92400e" strokeWidth={2} />
        <polygon points="5,-3.5 14,0 5,3.5" fill="#d97706" />
        <line x1={-13} y1={0} x2={-9} y2={-4} stroke="#78350f" strokeWidth={1.5} />
        <line x1={-13} y1={0} x2={-9} y2={4}  stroke="#78350f" strokeWidth={1.5} />
      </g>
    );
  }

  if (eff.profession === 'SHAMAN' && eff.type === 'heal') {
    // Green expanding ring heal visual
    const r1 = progress * 36, r2 = progress * 24;
    return (
      <g opacity={opacity}>
        <circle cx={fx} cy={fy} r={r1} fill="none" stroke="#4ade80" strokeWidth={2.5} opacity={0.6} />
        <circle cx={fx} cy={fy} r={r2} fill="none" stroke="#86efac" strokeWidth={1.5} opacity={0.4} />
        <circle cx={fx} cy={fy} r={6} fill={eff.healed ? "#4ade80" : "#22c55e"} opacity={0.9} />
        <text x={fx} y={fy - 14} textAnchor="middle" fontSize={11} fill="#4ade80" fontWeight="bold" opacity={opacity}>💚</text>
      </g>
    );
  }

  if (eff.profession === 'SHAMAN') {
    const bx = fx + (tx - fx) * progress, by = fy + (ty - fy) * progress;
    const pulse = 5 + Math.sin(progress * Math.PI * 3) * 2;
    return (
      <g opacity={opacity}>
        <circle cx={bx} cy={by} r={pulse * 2.2} fill="rgba(168,85,247,0.15)" />
        <circle cx={bx} cy={by} r={pulse * 1.3} fill="rgba(168,85,247,0.4)" />
        <circle cx={bx} cy={by} r={pulse} fill="#a855f7" />
        <circle cx={bx - pulse * 0.3} cy={by - pulse * 0.3} r={pulse * 0.35} fill="rgba(255,255,255,0.65)" />
      </g>
    );
  }
  return null;
}

export default function App() {
  const [buildings, setBuildings]       = useState([{ id: 1, type: 'HEADQUARTERS', tx: 57, ty: 57, level: 1 }]);
  const [hunters, setHunters]           = useState([]);
  const [monsters, setMonsters]         = useState(() => [
    ...spawnZone('ICE_1', 10), ...spawnZone('ICE_2', 8),
    ...spawnZone('MOUNTAIN_1', 8), ...spawnZone('MOUNTAIN_2', 6),
    ...spawnZone('FOREST_1', 8), ...spawnZone('FOREST_2', 8), ...spawnZone('FOREST_3', 6),
  ]);
  const [resources, setResources]       = useState({ gold: 1000, food: 500, wood: 400, ore: 200 });
  const [inventory, setInventory]       = useState([]);
  const [materials, setMaterials]       = useState({});
  const [mapLoot, setMapLoot]           = useState([]);
  const [combatEffects, setCombatEffects] = useState([]);
  const [tradeOrders, setTradeOrders]   = useState({});  // { matKey: { price, qty, collected } }
  const [offset, setOffset]             = useState({ x: 0, y: 0 });
  const [placingBuilding, setPlacingBuilding] = useState(null);
  const [placingPos, setPlacingPos]     = useState(null);
  const [selectedHunterId, setSelectedHunterId] = useState(null);
  const [hunterAction, setHunterAction] = useState(null); // 'MOVE'|'LIFE'|'EXILE'|null
  const [gameLog, setGameLog]           = useState([{ id: 0, msg: '🎮 游戏开始！招募猎人，派遣去野外击杀怪物！', at: Date.now() }]);
  const [panel, setPanel]               = useState(null);
  const [smithBuilding, setSmithBuilding]   = useState(null);
  const [tradingBuilding, setTradingBuilding] = useState(null);
  const [renamingId, setRenamingId]     = useState(null);
  const [renameVal, setRenameVal]       = useState('');
  const [showHunterDetail, setShowHunterDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('stats');
  const [hqBuilding, setHqBuilding]     = useState(null);
  const [infoBldg, setInfoBldg]         = useState(null);
  const [candidates, setCandidates]     = useState(() => [genCandidate(), genCandidate(), genCandidate()]);
  const [candidatesRefreshAt, setCandidatesRefreshAt] = useState(() => Date.now() + 30 * 60 * 1000);
  const [skillHallBuilding, setSkillHallBuilding] = useState(null);
  const [viewZone, setViewZone]         = useState('VILLAGE');
  const [zoneKills, setZoneKills]       = useState({});
  const [unlockedZones, setUnlockedZones] = useState(() => new Set(['VILLAGE', 'ICE_1']));
  const [strategy, setStrategy] = useState({ fleeHpPct: 0.4, fleeHungerPct: 0.4 });
  const strategyRef = useRef({ fleeHpPct: 0.4, fleeHungerPct: 0.4 });
  const zoneKillsRef = useRef({});

  const drag = useRef(false), dragO = useRef({ x: 0, y: 0 }), dragOffO = useRef({ x: 0, y: 0 }), cRef = useRef(null);
  const boxDrag = useRef(false), boxDragStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const hRef = useRef(hunters), mRef = useRef(monsters), rRef = useRef(resources);
  const bRef = useRef(buildings), lootRef = useRef(mapLoot);
  const selectedHunterIdRef = useRef(null);
  const tradeOrdersRef = useRef({});
  const viewZoneRef = useRef('VILLAGE');

  useEffect(() => { hRef.current = hunters; },   [hunters]);
  useEffect(() => { mRef.current = monsters; },  [monsters]);
  useEffect(() => { rRef.current = resources; }, [resources]);
  useEffect(() => { bRef.current = buildings; }, [buildings]);
  useEffect(() => { lootRef.current = mapLoot; }, [mapLoot]);
  useEffect(() => { selectedHunterIdRef.current = selectedHunterId; }, [selectedHunterId]);
  useEffect(() => { viewZoneRef.current = viewZone; }, [viewZone]);
  useEffect(() => { strategyRef.current = strategy; }, [strategy]);
  useEffect(() => { tradeOrdersRef.current = tradeOrders; }, [tradeOrders]);

  // Auto-refresh candidates every 30 minutes
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      if (now >= candidatesRefreshAt) {
        setCandidates([genCandidate(), genCandidate(), genCandidate()]);
        setCandidatesRefreshAt(now + 30 * 60 * 1000);
      }
    }, 10000);
    return () => clearInterval(iv);
  }, [candidatesRefreshAt]);

  let _logId = useRef(1);
  const pushLog = msg => setGameLog(p => [...p.slice(-19), { id: _logId.current++, msg, at: Date.now() }]);
  const applyRename = () => {
    if (renameVal.trim()) setHunters(p => p.map(h => h.id === renamingId ? { ...h, name: renameVal.trim() } : h));
    setRenamingId(null);
  };

  // ── 合并 tick：移动(每次) + 战斗(每8次≈960ms)，消除两个独立 interval 的竞争条件 ──
  const tcRef = useRef(0);
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const cm = mRef.current, ch = hRef.current;
      let movedH = procHunterMove(ch, cm, bRef.current, now);
      let movedM = procMonsterMove(mRef.current, movedH, now);

      // Loot state machine: ground (3s) → flying (0.8s) → collected into hunter wallet/backpack
      const currentLoot = lootRef.current;
      if (currentLoot.length > 0) {
        const goldForHunter = {};
        const matsForHunter = {};
        let lootChanged = false;
        const updatedLoot = [];

        for (const loot of currentLoot) {
          if (loot.state === 'ground' && now - loot.spawnTime >= 3000) {
            updatedLoot.push({ ...loot, state: 'flying', flyStartTime: now });
            lootChanged = true;
          } else if (loot.state === 'flying' && now - loot.flyStartTime >= 800) {
            if (loot.type === 'gold') {
              goldForHunter[loot.killerId] = (goldForHunter[loot.killerId] || 0) + loot.amount;
            } else if (loot.type === 'material') {
              if (!matsForHunter[loot.killerId]) matsForHunter[loot.killerId] = {};
              matsForHunter[loot.killerId][loot.matKey] = (matsForHunter[loot.killerId][loot.matKey] || 0) + loot.amount;
            }
            lootChanged = true;
          } else {
            updatedLoot.push(loot);
          }
        }

        if (Object.keys(goldForHunter).length || Object.keys(matsForHunter).length) {
          movedH = movedH.map(h => {
            const g = goldForHunter[h.id] || 0;
            const m = matsForHunter[h.id] || {};
            if (!g && !Object.keys(m).length) return h;
            const bp = { ...(h.backpack || {}) };
            Object.entries(m).forEach(([k, v]) => { bp[k] = (bp[k] || 0) + v; });
            return { ...h, wallet: (h.wallet || 0) + g, backpack: bp };
          });
        }

        if (lootChanged) {
          lootRef.current = updatedLoot;
          setMapLoot(updatedLoot);
        }
      }

      // Auto-sell at Trading Post for hunters who just arrived in village
      const hasTradingPost = bRef.current.some(b => b.type === 'TRADING_POST');
      const currentOrders = tradeOrdersRef.current;
      if (hasTradingPost && Object.keys(currentOrders).length > 0) {
        let totalGoldSpent = 0;
        const matGains = {};   // materials collected into village stash
        const orderCollected = {}; // { matKey: qty collected this tick }
        let anyTrade = false;

        movedH = movedH.map(h => {
          if (!h.visitTradingPost) return h;
          const updH = { ...h, visitTradingPost: false };
          const bp = { ...(h.backpack || {}) };
          let walletGain = 0;

          Object.entries(currentOrders).forEach(([k, order]) => {
            const { price, qty, collected = 0 } = order;
            const remaining = qty === Infinity ? Infinity : qty - collected;
            if (remaining <= 0) return;
            const inBag = bp[k] || 0;
            if (inBag <= 0) return;
            const take = qty === Infinity ? inBag : Math.min(inBag, remaining);
            walletGain += take * price;
            totalGoldSpent += take * price;
            matGains[k] = (matGains[k] || 0) + take;
            orderCollected[k] = (orderCollected[k] || 0) + take;
            bp[k] = inBag - take;
            anyTrade = true;
          });

          if (walletGain > 0) { updH.backpack = bp; updH.wallet = (h.wallet || 0) + walletGain; }
          return updH;
        });

        if (anyTrade) {
          setMaterials(m => { const n = { ...m }; Object.entries(matGains).forEach(([k, v]) => { n[k] = (n[k] || 0) + v; }); return n; });
          setResources(r => ({ ...r, gold: Math.max(0, r.gold - totalGoldSpent) }));
          // Update collected counts and remove completed orders
          setTradeOrders(o => {
            const n = { ...o };
            Object.entries(orderCollected).forEach(([k, count]) => {
              if (!n[k]) return;
              const newCollected = (n[k].collected || 0) + count;
              if (n[k].qty !== Infinity && newCollected >= n[k].qty) {
                delete n[k]; // order fulfilled
              } else {
                n[k] = { ...n[k], collected: newCollected };
              }
            });
            return n;
          });
        }
      } else {
        movedH = movedH.map(h => h.visitTradingPost ? { ...h, visitTradingPost: false } : h);
      }

      // Remove exiled hunters when they reach the gate (_remove flag set in movement.js)
      movedH = movedH.filter(h => !h._remove);

      // ── Ghost revival — handled here (same setHunters call) to avoid race with combat interval ──
      const altarBldg = bRef.current.find(b => b.type === 'ALTAR');
      movedH = movedH.map(h => {
        if (!h.isGhost) return h;
        // Start revival timer when ghost reaches altar
        if (!h.recoverUntil && h.location === 'VILLAGE' && altarBldg &&
            dst(h.tx, h.ty, altarBldg.tx + 2, altarBldg.ty + 2) <= 5) {
          return { ...h, recoverUntil: now + 8000, complaint: '复活仪式中...', complaintUntil: now + 9000 };
        }
        // Revive when timer expires
        if (h.recoverUntil && now >= h.recoverUntil) {
          const mhp = hMaxHp(h);
          const pz = h.pendingZone || h.ghostPrevZone;
          const base = { ...h, isGhost: false, hp: Math.floor(mhp * 0.5), recoverUntil: null, complaint: null, complaintUntil: null, ghostPrevZone: null, pendingZone: null };
          if (pz && pz !== 'VILLAGE') {
            // 从村庄逐段走传送门回野外区（与 goBackWild 逻辑一致）
            const firstStep = ZONE_CHAIN[1]; // ICE_1
            const hasMoreSteps = firstStep !== pz;
            return { ...base, location: 'TRAVELING', destZone: 'VILLAGE', destTx: PORTAL_TX_RIGHT, destTy: PORTAL_TY, portalTarget: firstStep, portalFinalTarget: hasMoreSteps ? pz : null };
          }
          return base;
        }
        return h;
      });

      // Camera follow selected hunter
      const selId = selectedHunterIdRef.current;
      if (selId) {
        const sel = movedH.find(h => h.id === selId);
        if (sel && !isNaN(sel.tx)) {
          // 猎人的物理所在区：TRAVELING 中用 destZone，否则用 location
          const selPhysZone = sel.location !== 'TRAVELING' ? sel.location : sel.destZone;
          const prevSel = ch.find(h => h.id === selId);
          const prevPhysZone = !prevSel ? null : (prevSel.location !== 'TRAVELING' ? prevSel.location : prevSel.destZone);
          // 物理区域发生变化时切换视图
          if (selPhysZone && selPhysZone !== prevPhysZone && selPhysZone !== viewZoneRef.current) {
            setViewZone(selPhysZone);
            viewZoneRef.current = selPhysZone;
          }
          const cw = cRef.current?.clientWidth || 800, ch2 = cRef.current?.clientHeight || 600;
          setOffset({
            x: Math.min(0, Math.max(-(sel.tx * TILE + TILE / 2 - cw / 2), -(HPX - cw))),
            y: Math.min(0, Math.max(-(sel.ty * TILE + TILE / 2 - ch2 / 2), -(HPX - ch2))),
          });
        }
      }

      // ── 战斗逻辑：每 8 个移动 tick 执行一次（≈960ms），在移动结果上直接运行，无竞争 ──
      tcRef.current++;
      if (tcRef.current % 8 === 0) {
        const combatTick = Math.floor(tcRef.current / 8);
        const { newHunters, newMonsters, newResources, logs, respawn, newLootDrops, attackEvents, zoneKillDelta } = procCombat({
          hunters: movedH, monsters: movedM, resources: rRef.current,
          buildings: bRef.current, tickCount: combatTick, now,
          strategy: strategyRef.current,
        });
        movedH = newHunters;
        movedM = newMonsters;

        respawn.forEach(z => setTimeout(() => setMonsters(p => { const m = spawnMonster(z); return m ? [...p, m] : p; }), 8000));

        if (Object.keys(zoneKillDelta).length) {
          Object.entries(zoneKillDelta).forEach(([z, n]) => { zoneKillsRef.current[z] = (zoneKillsRef.current[z] || 0) + n; });
          const kills = zoneKillsRef.current;
          setZoneKills({ ...kills });
          setUnlockedZones(prev => {
            const next = new Set(prev);
            ZONE_CHAIN.forEach((zk, idx) => {
              if (next.has(zk)) return;
              const prevZ = ZONE_CHAIN[idx - 1];
              if (prevZ && (kills[prevZ] || 0) >= ZONE_UNLOCK_KILLS[zk]) {
                next.add(zk);
                pushLog(`🗺️ 解锁新区域：${ZONE_DEFS[zk].name}！`);
              }
            });
            return next;
          });
        }
        if (logs.length) logs.forEach(l => pushLog(l));

        if (newLootDrops.length) {
          lootRef.current = [...lootRef.current, ...newLootDrops];
          setMapLoot(p => [...p, ...newLootDrops]);
        }

        if (attackEvents.length) {
          setCombatEffects(prev => [
            ...prev.filter(e => now - e.startTime < e.duration + 100),
            ...attackEvents,
          ]);
        }

        setResources(newResources);
      }

      setHunters(movedH);
      setMonsters(movedM);
    }, MOVE_MS);
    return () => clearInterval(iv);
  }, []);

  // ── Clean up expired combat effects ─────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setCombatEffects(prev => prev.filter(e => now - e.startTime < e.duration + 100));
    }, 800);
    return () => clearInterval(iv);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────
  const MAX_HUNTERS = 3;
  const recruitHunter = (candidate) => {
    if (hunters.filter(h => !h._remove).length >= MAX_HUNTERS) { pushLog('❌ 猎人已达上限（3人）'); return; }
    if (resources.gold < 50) { pushLog('❌ 金币不足'); return; }
    const prof = PROFESSIONS[candidate.profession], pd = PERSONALITIES[candidate.personality];
    const hq = buildings.find(b => b.type === 'HEADQUARTERS');
    const hqDest = hq ? { tx: hq.tx + 2, ty: hq.ty + 2 } : randInZone('VILLAGE');
    const h = {
      ...candidate, id: Date.now(),
      tx: GATE_TX, ty: GATE_TY, // spawn at gate
      location: 'TRAVELING', destZone: 'VILLAGE', destTx: hqDest.tx, destTy: hqDest.ty,
      wtx: null, nextWander: 0,
    };
    setHunters(p => [...p, h]);
    setResources(p => ({ ...p, gold: p.gold - 50 }));
    setCandidates([genCandidate(), genCandidate(), genCandidate()]);
    setCandidatesRefreshAt(Date.now() + 30 * 60 * 1000);
    setHqBuilding(null);
    pushLog(`✅ 招募了 ${prof.emoji}${h.name}【${pd.emoji}${pd.name}】`);
  };

  const refreshCandidates = () => {
    setCandidates([genCandidate(), genCandidate(), genCandidate()]);
    setCandidatesRefreshAt(Date.now() + 30 * 60 * 1000);
  };

  // 派遣到传送门：只走一步到相邻区域，若目标更远则设置 portalFinalTarget 逐段前进
  const sendViaPortal = (h, targetZone) => {
    if (h.isGhost || h.recoverType) return { ...h, pendingZone: targetZone };
    const currentZone = h.location === 'TRAVELING'
      ? (h.portalFinalTarget || h.portalTarget || h.destZone || 'VILLAGE')
      : h.location;
    if (currentZone === targetZone) return h;

    const fromIdx = ZONE_CHAIN.indexOf(currentZone);
    const toIdx   = ZONE_CHAIN.indexOf(targetZone);
    const goRight = toIdx > fromIdx;
    const portalTx = goRight ? PORTAL_TX_RIGHT : PORTAL_TX_LEFT;
    // 只走一步到相邻区域
    const nextZone = ZONE_CHAIN[fromIdx + (goRight ? 1 : -1)];

    return {
      ...h,
      location: 'TRAVELING',
      destZone: currentZone,
      destTx: portalTx, destTy: PORTAL_TY,
      portalTarget: nextZone,
      portalFinalTarget: nextZone !== targetZone ? targetZone : null,
      wtx: null, nextWander: 0,
      combatTargetId: null, savedDest: null,
      prevZone: null, pendingZone: null,
    };
  };

  const dispatch = (hid, targetZone) => {
    // 派遣时自动选中追踪，先切换视角到猎人当前物理所在区域，让用户看到猎人走向传送门
    const hunterNow = hRef.current.find(h => h.id === hid);
    if (hunterNow) {
      const hPhysZone = hunterNow.location !== 'TRAVELING' ? hunterNow.location : (hunterNow.destZone || hunterNow.location);
      if (hPhysZone && hPhysZone !== viewZoneRef.current) {
        setViewZone(hPhysZone);
        viewZoneRef.current = hPhysZone;
      }
    }
    setSelectedHunterId(hid);
    setHunters(p => p.map(h => h.id !== hid ? h : sendViaPortal(h, targetZone)));
    pushLog(`🚶 → ${ZONE_DEFS[targetZone].name}`);
  };

  const dispatchAll = targetZone => {
    setHunters(prev => prev.map(h => sendViaPortal(h, targetZone)));
    pushLog(`📍 全体 → ${ZONE_DEFS[targetZone].name}`); setPanel(null);
  };

  const goToBldg = (hid, bldgType) => {
    const bldg = buildings.find(b => b.type === bldgType);
    if (!bldg) { pushLog(`❌ 还没有 ${BUILDING_TYPES[bldgType]?.name || bldgType}`); return; }
    const dp = { tx: bldg.tx + 2, ty: bldg.ty + 2 };
    const now2 = Date.now();
    setHunters(prev => prev.map(h => {
      if (h.id !== hid) return h;
      const extra = {};
      if (bldgType === 'HEALER') extra.recoverType = 'HP';
      if (bldgType === 'TAVERN') extra.recoverType = 'HUNGER';
      if (bldgType === 'TRADING_POST') extra.visitTradingPost = true;
      if (bldgType === 'SKILL_HALL') extra.pendingSkillLearn = true;
      // recoverUntil is set by combat.js proximity check — don't set it here
      // 计算猎人物理区域（TRAVELING 时用 prevZone 或 destZone，避免 indexOf('TRAVELING')=-1）
      const physLoc = h.location !== 'TRAVELING' ? h.location
        : (h.prevZone || h.destZone || 'VILLAGE');

      if (physLoc === 'VILLAGE') {
        // 保存猎人应该回去的野外区域（若有）
        if (bldgType === 'SKILL_HALL') extra.prevZone = h.prevZone || h.pendingZone || null;
        return { ...h, ...extra, wtx: dp.tx, wty: dp.ty, nextWander: 0 };
      }
      // 野外猎人逐段走传送门回村庄：只走一步到相邻区域，portalFinalTarget='VILLAGE' 继续
      {
        const fromIdx = ZONE_CHAIN.indexOf(physLoc);
        if (fromIdx <= 0) {
          // 无法路由（physLoc 无效），仅设置 flag，猎人在当前位置等待
          if (bldgType === 'SKILL_HALL') extra.prevZone = h.prevZone || null;
          return { ...h, ...extra, wtx: dp.tx, wty: dp.ty, nextWander: 0 };
        }
        const nextZone = ZONE_CHAIN[fromIdx - 1]; // 向左（朝村庄方向）
        const hasMore = nextZone !== 'VILLAGE';
        return {
          ...h, ...extra,
          location: 'TRAVELING',
          destZone: physLoc,
          destTx: PORTAL_TX_LEFT, destTy: PORTAL_TY,
          portalTarget: nextZone,
          portalFinalTarget: hasMore ? 'VILLAGE' : null,
          wtx: null, nextWander: 0, combatTargetId: null, savedDest: null,
          prevZone: h.prevZone || physLoc,
        };
      }
    }));
    setHunterAction(null);
  };

  const exileHunter = (hid) => {
    const h = hunters.find(hu => hu.id === hid);
    if (!h) return;
    const zone = ['ICE_1', 'FOREST_1', 'MOUNTAIN_1'][Math.floor(Math.random() * 3)];
    const dp = randInZone(zone);
    setHunters(prev => prev.map(hu => hu.id !== hid ? hu : {
      ...hu, isExiled: true, exiledAt: Date.now(),
      // Walk to gate first, then exileDest takes them into wild zone
      location: 'TRAVELING', destZone: 'VILLAGE', destTx: GATE_TX, destTy: GATE_TY,
      exileDest: { zone, tx: dp.tx, ty: dp.ty },
      wtx: null, nextWander: 0, combatTargetId: null, recoverType: null, recoverUntil: null,
    }));
    pushLog(`🚫 ${h.name} 被驱逐出村庄，默默离去...`);
    setHunterAction(null);
  };

  const onTrack = h => {
    const cw = cRef.current?.clientWidth || 800, ch2 = cRef.current?.clientHeight || 600;
    setOffset({
      x: Math.min(0, Math.max(-(h.tx * TILE + TILE / 2 - cw / 2), -(HPX - cw))),
      y: Math.min(0, Math.max(-(h.ty * TILE + TILE / 2 - ch2 / 2), -(HPX - ch2))),
    });
    setSelectedHunterId(h.id);
    setHunterAction(null);
    setPanel(null);
    if (h.location !== 'TRAVELING') setViewZone(h.location);
  };

  const onEquip = (hid, item) => {
    const hunter = hunters.find(h => h.id === hid);
    if (!hunter) return;
    if (item.forProfession && hunter.profession !== item.forProfession) {
      pushLog(`❌ ${item.name} 仅限${PROFESSIONS[item.forProfession].name}装备`); return;
    }
    const old = hunter.equipment?.[item.slot];
    setHunters(p => p.map(h => h.id !== hid ? h : { ...h, equipment: { ...h.equipment, [item.slot]: item } }));
    setInventory(p => { const n = p.filter(i => i.id !== item.id); if (old) n.push(old); return n; });
  };

  const onUnequip = (hid, slot) => {
    const hunter = hunters.find(h => h.id === hid), item = hunter?.equipment?.[slot];
    if (!item) return;
    setHunters(p => p.map(h => h.id !== hid ? h : { ...h, equipment: { ...h.equipment, [slot]: null } }));
    setInventory(p => [...p, item]);
  };

  const onCraft = (recipe, item) => {
    setResources(r => { const n = { ...r }; Object.entries(recipe.costRes || {}).forEach(([k, v]) => { n[k] -= v; }); return n; });
    setMaterials(m => { const n = { ...m }; Object.entries(recipe.costMat || {}).forEach(([k, v]) => { n[k] = Math.max(0, (n[k] || 0) - v); }); return n; });
    setInventory(p => [...p, item]);
    pushLog(`🔨 铁匠铺制造了【${item.name}】`);
  };

  // ── Map interaction ──────────────────────────────────────────────────
  const onMD = e => {
    if (e.button !== 0) return;
    dragO.current = { x: e.clientX, y: e.clientY };
    dragOffO.current = { ...offset };

    // Check if pressing inside the green placement box → box drag
    if (placingPos && placingBuilding && cRef.current) {
      const rect = cRef.current.getBoundingClientRect();
      const bx1 = rect.left + placingPos.tx * TILE + offset.x;
      const by1 = rect.top  + placingPos.ty * TILE + offset.y;
      const bx2 = bx1 + BSIZE * TILE, by2 = by1 + BSIZE * TILE;
      if (e.clientX >= bx1 && e.clientX <= bx2 && e.clientY >= by1 && e.clientY <= by2) {
        boxDrag.current = true;
        boxDragStart.current = { mx: e.clientX, my: e.clientY, tx: placingPos.tx, ty: placingPos.ty };
        return;
      }
    }

    if (selectedHunterIdRef.current) return;
    drag.current = true;
  };
  const onMM = e => {
    if (boxDrag.current) {
      const dx = Math.round((e.clientX - boxDragStart.current.mx) / TILE);
      const dy = Math.round((e.clientY - boxDragStart.current.my) / TILE);
      const newTx = Math.max(0, Math.min(HT - BSIZE, boxDragStart.current.tx + dx));
      const newTy = Math.max(0, Math.min(HT - BSIZE, boxDragStart.current.ty + dy));
      setPlacingPos({ tx: newTx, ty: newTy });
      return;
    }
    if (!drag.current) return;
    const cw = cRef.current?.clientWidth || 800, ch = cRef.current?.clientHeight || 600;
    setOffset({
      x: Math.min(0, Math.max(dragOffO.current.x + e.clientX - dragO.current.x, -(HPX - cw))),
      y: Math.min(0, Math.max(dragOffO.current.y + e.clientY - dragO.current.y, -(HPX - ch))),
    });
  };
  const onMU = () => { drag.current = false; boxDrag.current = false; };
  const isClick = e => Math.abs(e.clientX - dragO.current.x) <= 5 && Math.abs(e.clientY - dragO.current.y) <= 5;

  const onMapClick = e => {
    if (!isClick(e)) return;
    const rect = cRef.current.getBoundingClientRect();
    const tx = Math.floor((e.clientX - rect.left - offset.x) / TILE);
    const ty = Math.floor((e.clientY - rect.top - offset.y) / TILE);

    const clickedBldg = viewZone === 'VILLAGE' && buildings.find(b =>
      tx >= b.tx && tx < b.tx + BSIZE && ty >= b.ty && ty < b.ty + BSIZE
    );
    if (clickedBldg) {
      setSelectedHunterId(null); setHunterAction(null);
      if (clickedBldg.type === 'BLACKSMITH')    { setSmithBuilding(clickedBldg); return; }
      if (clickedBldg.type === 'TRADING_POST')  { setTradingBuilding(clickedBldg); return; }
      if (clickedBldg.type === 'HEADQUARTERS')  { setHqBuilding(clickedBldg); return; }
      if (clickedBldg.type === 'SKILL_HALL')    { setSkillHallBuilding(clickedBldg); return; }
      if (clickedBldg.type === 'HEALER' || clickedBldg.type === 'TAVERN' || clickedBldg.type === 'ALTAR') { setInfoBldg(clickedBldg); return; }
      return;
    }

    if (placingBuilding) return; // box is dragged, not click-placed

    // Click empty ground → deselect
    setSelectedHunterId(null);
    setHunterAction(null);
    setShowHunterDetail(false);
  };

  const confirmPlace = () => {
    if (!placingPos || !placingBuilding) return;
    if (placingPos.tx + BSIZE > HT || placingPos.ty + BSIZE > HT) { pushLog('❌ 超出村庄范围'); return; }
    if (buildings.some(b => !(placingPos.tx + BSIZE <= b.tx || placingPos.tx >= b.tx + BSIZE || placingPos.ty + BSIZE <= b.ty || placingPos.ty >= b.ty + BSIZE))) { pushLog('❌ 建筑重叠'); return; }
    const bldgNow = Date.now();
    setBuildings(p => [...p, { id: bldgNow, type: placingBuilding, tx: placingPos.tx, ty: placingPos.ty, level: 1 }]);
    pushLog(`✅ 建造了 ${BUILDING_TYPES[placingBuilding].emoji}${BUILDING_TYPES[placingBuilding].name}`);
    setPlacingBuilding(null); setPlacingPos(null);

    // Send waiting village hunters straight to the new HEALER/TAVERN at full travel speed
    if (placingBuilding === 'HEALER' || placingBuilding === 'TAVERN') {
      const rType = placingBuilding === 'HEALER' ? 'HP' : 'HUNGER';
      const btx = placingPos.tx + 2, bty = placingPos.ty + 2;
      setHunters(prev => prev.map(h => {
        if (h.location === 'VILLAGE' && h.recoverType === rType && !h.recoverUntil) {
          return { ...h, location: 'TRAVELING', destZone: 'VILLAGE', destTx: btx, destTy: bty, wtx: null, nextWander: 0, complaint: null, complaintUntil: null };
        }
        return h;
      }));
    }
    // When ALTAR is built, wandering ghosts immediately rush to it
    if (placingBuilding === 'ALTAR') {
      const atx = placingPos.tx + 2, aty = placingPos.ty + 2;
      setHunters(prev => prev.map(h => {
        if (h.isGhost && h.location === 'VILLAGE' && !h.recoverUntil) {
          return { ...h, location: 'TRAVELING', destZone: 'VILLAGE', destTx: atx, destTy: aty, wtx: null, nextWander: 0, complaint: null, complaintUntil: null };
        }
        return h;
      }));
    }
  };

  const locLabel = h => {
    if (h.isGhost) return h.recoverUntil ? '👻 复活仪式中...' : '👻 幽灵游荡...';
    if (h.isExiled) return '🚫 被驱逐离开...';
    if (h.location === 'TRAVELING' && h.recoverType && !h.recoverUntil) return h.recoverType === 'HP' ? '🏃→🏥 赶往治疗所...' : '🏃→🍺 赶往酒馆...';
    if (h.location === 'TRAVELING') return `🚶→${ZONE_DEFS[h.destZone]?.name || ''}`;
    if (h.recoverType && h.recoverUntil) return h.recoverType === 'HP' ? '🏥 快速治疗中...' : '🍖 快速补给中...';
    if (h.recoverType) return h.recoverType === 'HP' ? '🤕 等待治疗所...' : '😩 等待酒馆...';
    return ZONE_DEFS[h.location]?.name || h.location;
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const builtTypes = new Set(buildings.map(b => b.type));
  const selH = hunters.find(h => h.id === selectedHunterId);
  const btnS = a => ({ flex: 1, background: a ? '#1d4ed8' : '#1e293b', border: a ? '2px solid #60a5fa' : '2px solid #334155', color: 'white', padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 });
  const actionBtnS = a => ({ flex: 1, background: a ? '#1d4ed8' : '#1e293b', border: `2px solid ${a ? '#60a5fa' : '#334155'}`, color: 'white', padding: '8px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12 });
  const rp = { renamingId, renameVal, setRenamingId, setRenameVal, onSave: applyRename };
  const onLearnSkill = hid => goToBldg(hid, 'SKILL_HALL');
  const SS = { background: '#0f172a', border: '1px solid #334155', borderRadius: 16, width: '90%', maxWidth: 700, maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
  const OL = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
  const SH = { padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 };
  const now = Date.now();

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', userSelect: 'none' }}>
      {/* Top bar */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #3b82f6', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, fontSize: 13 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['💰', resources.gold], ['👥', `${hunters.length}/20`], ['🌾', resources.food], ['🪵', resources.wood], ['⛏️', resources.ore]].map(([ic, v]) =>
            <span key={ic}>{ic} {typeof v === 'number' ? Math.floor(v) : v}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#64748b' }}>🏰 点击大本营招募猎人</span>
      </div>

      {/* Map */}
      <div ref={cRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab' }}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onClick={onMapClick}>
        <svg width={HPX} height={HPX} style={{ position: 'absolute', top: offset.y, left: offset.x, display: 'block' }}>
          {/* Zone background */}
          {(() => {
            const zd = ZONE_DEFS[viewZone];
            const isIce = viewZone.startsWith('ICE');
            const isMtn = viewZone.startsWith('MOUNTAIN');
            const isForest = viewZone.startsWith('FOREST');
            return (
              <>
                <rect x={0} y={0} width={HPX} height={HPX} fill={zd.fill} />
                {/* Decorative terrain */}
                {isIce && Array.from({ length: 40 }, (_, i) => <circle key={`ice${i}`} cx={(i % 8) * 300 + 80 + (i * 97) % 200} cy={Math.floor(i / 8) * 300 + 80 + (i * 71) % 200} r={15} fill="rgba(255,255,255,0.12)" />)}
                {isMtn && Array.from({ length: 15 }, (_, i) => <polygon key={`mtn${i}`} points={`${(i % 5) * 480 + 120 + (i * 97) % 200},${Math.floor(i / 5) * 480 + 60 + (i * 53) % 100} ${(i % 5) * 480 + (i * 97) % 200},${Math.floor(i / 5) * 480 + 200 + (i * 53) % 100} ${(i % 5) * 480 + 240 + (i * 97) % 200},${Math.floor(i / 5) * 480 + 200 + (i * 53) % 100}`} fill="rgba(255,255,255,0.1)" />)}
                {isForest && Array.from({ length: 30 }, (_, i) => <circle key={`fst${i}`} cx={(i % 6) * 380 + 100 + (i * 53) % 250} cy={Math.floor(i / 6) * 380 + 100 + (i * 79) % 250} r={40} fill="rgba(0,60,0,0.3)" />)}
                <text x={HPX / 2} y={90} textAnchor="middle" fontSize={70} fill="rgba(0,0,0,0.12)" fontWeight="bold">{zd.name}</text>
              </>
            );
          })()}

          {/* Hunter sight radius */}
          {selH && selH.location === viewZone && !selH.isGhost && (
            <circle cx={selH.tx * TILE + TILE / 2} cy={selH.ty * TILE + TILE / 2} r={H_SIGHT * TILE} fill="rgba(96,165,250,0.04)" stroke="rgba(96,165,250,0.22)" strokeWidth={1.5} strokeDasharray="6,4" />
          )}

          {/* Village Gate (only in VILLAGE view) */}
          {viewZone === 'VILLAGE' && (() => {
            const gx = GATE_TX * TILE, gy = GATE_TY * TILE;
            const pw = TILE * 1.2, ph = TILE * 3.5, gap = TILE * 2.6;
            const archH = TILE * 1.4;
            return (
              <g>
                <rect x={gx - pw} y={gy - ph} width={pw} height={ph} fill="#64748b" stroke="#475569" strokeWidth={2} rx={3} />
                <rect x={gx - pw} y={gy - ph} width={pw} height={pw * 0.6} fill="#475569" rx={2} />
                <rect x={gx + gap} y={gy - ph} width={pw} height={ph} fill="#64748b" stroke="#475569" strokeWidth={2} rx={3} />
                <rect x={gx + gap} y={gy - ph} width={pw} height={pw * 0.6} fill="#475569" rx={2} />
                <path d={`M ${gx} ${gy} Q ${gx + gap / 2} ${gy - archH - TILE} ${gx + gap} ${gy}`} fill="none" stroke="#94a3b8" strokeWidth={4} />
                <rect x={gx} y={gy - ph + pw} width={gap * 0.42} height={ph - pw} fill="#92400e" stroke="#78350f" strokeWidth={1.5} rx={2} />
                <rect x={gx + gap * 0.58} y={gy - ph + pw} width={gap * 0.42} height={ph - pw} fill="#92400e" stroke="#78350f" strokeWidth={1.5} rx={2} />
                <text x={gx + gap / 2} y={gy + TILE * 1.2} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight="bold">村庄大门</text>
              </g>
            );
          })()}

          {/* Zone portals (left = prev zone, right = next zone) — Diablo-style blue glow */}
          {(() => {
            const idx = ZONE_CHAIN.indexOf(viewZone);
            const prevZ = idx > 0 ? ZONE_CHAIN[idx - 1] : null;
            const nextZ = idx < ZONE_CHAIN.length - 1 ? ZONE_CHAIN[idx + 1] : null;
            const my = HPX / 2;
            const Portal = ({ cx, zk, label }) => {
              const locked = !unlockedZones.has(zk);
              return (
                <g onClick={() => !locked && setViewZone(zk)} style={{ cursor: locked ? 'default' : 'pointer' }}>
                  {/* 最外层大光晕 */}
                  <circle cx={cx} cy={my} r={52} fill="rgba(30,100,255,0.06)" />
                  <circle cx={cx} cy={my} r={44} fill="rgba(30,100,255,0.10)" />
                  {/* 旋转外圈 */}
                  <circle cx={cx} cy={my} r={36} fill="rgba(15,50,180,0.25)" stroke={locked ? '#334155' : '#3b82f6'} strokeWidth={2.5} strokeDasharray={locked ? '6,4' : '10,3'} opacity={locked ? 0.4 : 0.85}>
                    {!locked && <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${my}`} to={`360 ${cx} ${my}`} dur="4s" repeatCount="indefinite" />}
                  </circle>
                  {/* 中圈 */}
                  <circle cx={cx} cy={my} r={26} fill="rgba(30,90,220,0.30)" stroke={locked ? '#1e293b' : '#93c5fd'} strokeWidth={2} opacity={locked ? 0.3 : 0.9}>
                    {!locked && <animateTransform attributeName="transform" type="rotate" from={`360 ${cx} ${my}`} to={`0 ${cx} ${my}`} dur="2.5s" repeatCount="indefinite" />}
                  </circle>
                  {/* 内核 */}
                  <circle cx={cx} cy={my} r={16} fill={locked ? 'rgba(30,41,59,0.8)' : 'rgba(59,130,246,0.5)'} stroke={locked ? '#374151' : '#bfdbfe'} strokeWidth={1.5} />
                  {/* 亮点 */}
                  {!locked && <circle cx={cx - 5} cy={my - 5} r={4} fill="rgba(255,255,255,0.5)" />}
                  {/* 文字 */}
                  {locked ? (
                    <>
                      <text x={cx} y={my - 4} textAnchor="middle" fontSize={13} fill="#475569">🔒</text>
                      <text x={cx} y={my + 10} textAnchor="middle" fontSize={7} fill="#475569">{zoneKills[viewZone] || 0}/{ZONE_UNLOCK_KILLS[zk]}</text>
                    </>
                  ) : (
                    <>
                      <text x={cx} y={my - 4} textAnchor="middle" fontSize={8} fill="#bfdbfe" fontWeight="bold">{label}</text>
                      <text x={cx} y={my + 8} textAnchor="middle" fontSize={7} fill="rgba(191,219,254,0.7)">{ZONE_DEFS[zk].name}</text>
                    </>
                  )}
                </g>
              );
            };
            return (
              <>
                {prevZ && <Portal cx={40} zk={prevZ} label="◀ 返回" />}
                {nextZ && <Portal cx={HPX - 40} zk={nextZ} label="前进 ▶" />}
              </>
            );
          })()}

          {/* Buildings (village only) */}
          {viewZone === 'VILLAGE' && buildings.map(b => {
            const info = BUILDING_TYPES[b.type], sz = BSIZE * TILE;
            const isSmith = b.type === 'BLACKSMITH', isTrading = b.type === 'TRADING_POST';
            const isAltar = b.type === 'ALTAR', isHQ = b.type === 'HEADQUARTERS';
            const isHealer = b.type === 'HEALER', isTavern = b.type === 'TAVERN';
            const isSkillHall = b.type === 'SKILL_HALL';
            const isClickable = isSmith || isTrading || isHQ || isHealer || isTavern || isSkillHall || isAltar;
            const strokeColor = isSmith ? '#a855f7' : isTrading ? '#22d3ee' : isAltar ? '#f59e0b' : isHQ ? '#22c55e' : isHealer ? '#34d399' : isTavern ? '#fb923c' : isSkillHall ? '#2dd4bf' : '#60a5fa';
            const fillColor = isAltar ? 'rgba(120,60,0,0.85)' : isHQ ? 'rgba(20,80,20,0.85)' : isSkillHall ? 'rgba(15,70,65,0.88)' : 'rgba(37,99,235,0.82)';
            return (
              <g key={b.id} style={{ cursor: isClickable ? 'pointer' : 'default' }}>
                <rect x={b.tx * TILE} y={b.ty * TILE} width={sz} height={sz} fill={fillColor} stroke={strokeColor} strokeWidth={2} rx={4} />
                <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + sz / 2} textAnchor="middle" dominantBaseline="middle" fontSize={sz * 0.38}>{info.emoji}</text>
                <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + sz - 6} textAnchor="middle" fontSize={9} fill="white">{info.name}</text>
                {isSmith && <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + 10} textAnchor="middle" fontSize={8} fill="#c4b5fd">点击制造</text>}
                {isTrading && <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + 10} textAnchor="middle" fontSize={8} fill="#67e8f9">点击委托</text>}
                {isHQ && <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + 10} textAnchor="middle" fontSize={8} fill="#86efac">点击招募</text>}
                {(isHealer || isTavern) && <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + 10} textAnchor="middle" fontSize={8} fill={isHealer ? '#6ee7b7' : '#fdba74'}>点击查看</text>}
                {isSkillHall && <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + 10} textAnchor="middle" fontSize={8} fill="#5eead4">点击学习</text>}
                {isAltar && <text x={b.tx * TILE + sz / 2} y={b.ty * TILE + 10} textAnchor="middle" fontSize={8} fill="#fcd34d">点击查看</text>}
              </g>
            );
          })}

          {/* Map loot drops (zone-filtered) */}
          {mapLoot.filter(loot => loot.zone === viewZone || (viewZone === 'VILLAGE' && !loot.zone)).map(loot => {
            let px = loot.tx * TILE + TILE / 2, py = loot.ty * TILE + TILE / 2;
            let scale = 1, alpha = 1;
            if (loot.state === 'flying') {
              const flyProg = Math.min(1, (now - loot.flyStartTime) / 800);
              const killer = hunters.find(h => h.id === loot.killerId);
              if (killer && !isNaN(killer.tx)) {
                const kx = killer.tx * TILE + TILE / 2, ky = killer.ty * TILE + TILE / 2;
                px = px + (kx - px) * flyProg;
                py = py + (ky - py) * flyProg;
              }
              scale = 1 - flyProg * 0.5;
              alpha = 1 - flyProg * 0.7;
            }
            const mat = loot.type === 'material' ? MATERIALS[loot.matKey] : null;
            return (
              <g key={loot.id} opacity={alpha} transform={`translate(${px},${py}) scale(${scale})`}>
                <circle cx={0} cy={0} r={9} fill="rgba(0,0,0,0.75)" stroke={loot.type === 'gold' ? '#fbbf24' : '#a855f7'} strokeWidth={1.5} />
                <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={11}>
                  {loot.type === 'gold' ? '💰' : (mat?.emoji || '📦')}
                </text>
                {loot.state !== 'flying' && loot.type === 'gold' && (
                  <text x={0} y={14} textAnchor="middle" fontSize={8} fill="#fbbf24">+{loot.amount}</text>
                )}
              </g>
            );
          })}

          {/* Monsters (zone-filtered) */}
          {monsters.filter(m => m.zone === viewZone).map(m => {
            const ch = !!m.targetHunterId, cx = m.tx * TILE + TILE / 2, cy = m.ty * TILE + TILE / 2, by = cy - ER - 8;
            return (
              <g key={m.id}>
                {ch && <circle cx={cx} cy={cy} r={ER * 1.1} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />}
                <circle cx={cx} cy={cy} r={ER} fill={ch ? 'rgba(180,20,20,0.9)' : 'rgba(110,18,18,0.8)'} stroke="#ef4444" strokeWidth={1.5} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={ER * 1.1}>{m.emoji}</text>
                {m.level && <text x={cx} y={by - 8} textAnchor="middle" fontSize={11} fill="white" fontWeight="bold" stroke="rgba(0,0,0,0.6)" strokeWidth={2} paintOrder="stroke">Lv{m.level}</text>}
                <rect x={cx - ER} y={by} width={ER * 2} height={4} fill="#1f2937" rx={2} />
                <rect x={cx - ER} y={by} width={ER * 2 * (m.hp / m.maxHp)} height={4} fill={m.hp / m.maxHp > 0.5 ? '#22c55e' : '#ef4444'} rx={2} />
              </g>
            );
          })}

          {/* Hunters (zone-filtered; TRAVELING hunters shown in their destZone) */}
          {hunters.filter(h => h.location === viewZone || (h.location === 'TRAVELING' && h.destZone === viewZone)).map(h => {
            const prof = PROFESSIONS[h.profession], sel = selectedHunterId === h.id;
            const isGhost = h.isGhost, isExiled = h.isExiled;
            const tv = h.location === 'TRAVELING', ic = !!h.combatTargetId, rec = !!h.recoverUntil;
            const rushingToBldg = tv && !!h.recoverType && !rec; // traveling to healer/tavern
            const fc = isGhost ? 'rgba(200,200,255,0.35)' : isExiled ? 'rgba(100,20,20,0.7)' : rec ? 'rgba(250,200,0,0.9)' : rushingToBldg ? 'rgba(250,200,0,0.9)' : tv ? 'rgba(100,70,0,0.9)' : ic ? 'rgba(120,40,160,0.9)' : 'rgba(29,78,216,0.9)';
            const sc = isGhost ? '#c7d2fe' : isExiled ? '#ef4444' : sel ? '#fff' : (rec || rushingToBldg) ? '#fbbf24' : ic ? '#e879f9' : tv ? '#fbbf24' : '#60a5fa';
            const cx = h.tx * TILE + TILE / 2, cy = h.ty * TILE + TILE / 2, by = cy - ER - 8, mhp = hMaxHp(h);
            return (
              <g key={h.id} style={{ cursor: 'pointer' }} opacity={isGhost ? 0.65 : isExiled ? 0.5 : 1}
                onClick={e => { e.stopPropagation(); if (isClick(e) && !h.isGhost) { setSelectedHunterId(h.id); setHunterAction(null); } }}>
                {sel && <circle cx={cx} cy={cy} r={ER * 1.3} fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth={2} />}
                {rec && !isGhost && <circle cx={cx} cy={cy} r={ER * 1.15} fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.8} />}
                {ic && !rec && !isGhost && <circle cx={cx} cy={cy} r={ER * 1.1} fill="none" stroke="#e879f9" strokeWidth={1.5} opacity={0.7} />}
                <circle cx={cx} cy={cy} r={ER} fill={fc} stroke={sc} strokeWidth={sel ? 2.5 : 1.5} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={ER * 1.1}>
                  {isGhost ? '👻' : prof.emoji}
                </text>
                {!isGhost && (
                  <>
                    <rect x={cx - ER} y={by} width={ER * 2} height={4} fill="#1f2937" rx={2} />
                    <rect x={cx - ER} y={by} width={ER * 2 * (h.hp / mhp)} height={4} fill={h.hp / mhp > 0.5 ? '#22c55e' : '#f97316'} rx={2} />
                  </>
                )}

                {/* Speech bubble complaint */}
                {h.complaint && h.complaintUntil && h.complaintUntil > now && (() => {
                  const tw = h.complaint.length * 8.5 + 10;
                  const bx = cx - tw / 2, bubY = cy - ER - 34;
                  return (
                    <g>
                      <rect x={bx} y={bubY} width={tw} height={16} rx={4} fill="#1e293b" stroke={isGhost ? '#c7d2fe' : '#fbbf24'} strokeWidth={1.2} />
                      <polygon points={`${cx - 5},${bubY + 16} ${cx + 5},${bubY + 16} ${cx},${bubY + 22}`} fill="#1e293b" stroke={isGhost ? '#c7d2fe' : '#fbbf24'} strokeWidth={1.2} />
                      <text x={cx} y={bubY + 11} textAnchor="middle" fontSize={9} fill={isGhost ? '#c7d2fe' : '#fbbf24'}>{h.complaint}</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Combat effects (zone-filtered) */}
          {combatEffects.filter(eff => eff.zone === viewZone).map(eff => <CombatEffect key={eff.id} eff={eff} />)}

          {/* Building placement preview (village only) */}
          {viewZone === 'VILLAGE' && placingPos && placingBuilding && (
            <rect x={placingPos.tx * TILE} y={placingPos.ty * TILE} width={BSIZE * TILE} height={BSIZE * TILE} fill="rgba(0,255,0,0.2)" stroke="lime" strokeWidth={2} strokeDasharray="8,4" />
          )}
        </svg>

        {/* Bottom-center selected hunter panel */}
        {selH && (
          <div style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)', width: 380, background: 'rgba(10,18,35,0.97)', border: `2px solid ${selH.isGhost ? '#818cf8' : '#3b82f6'}`, borderRadius: 12, zIndex: 20, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{selH.isGhost ? '👻' : PROFESSIONS[selH.profession].emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}><NameEditor h={selH} {...rp} /></div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{locLabel(selH)}</div>
              </div>
              <div style={{ width: 90 }}>
                <Bar label="❤️" cur={selH.hp} max={hMaxHp(selH)} color="#ef4444" />
                <Bar label="🍖" cur={selH.hunger} max={selH.maxHunger} color="#f97316" />
              </div>
              <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18, marginLeft: 4 }} onClick={() => { setSelectedHunterId(null); setHunterAction(null); }}>✕</span>
            </div>

            {/* Action buttons */}
            {(() => {
              const ghost = selH.isGhost;
              const disS = { flex: 1, background: '#111827', border: '2px solid #1f2937', color: '#374151', padding: '8px 0', borderRadius: 6, cursor: 'not-allowed', fontWeight: 'bold', fontSize: 12 };
              return (
                <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                  <button onClick={() => !ghost && setHunterAction(hunterAction === 'MOVE' ? null : 'MOVE')} style={ghost ? disS : actionBtnS(hunterAction === 'MOVE')} disabled={ghost}>🧭 移动</button>
                  <button onClick={() => !ghost && setHunterAction(hunterAction === 'LIFE' ? null : 'LIFE')} style={ghost ? disS : actionBtnS(hunterAction === 'LIFE')} disabled={ghost}>💡 生活</button>
                  <button onClick={() => { setShowHunterDetail(true); setHunterAction(null); }} style={actionBtnS(false)}>📋 详情</button>
                  <button onClick={() => !ghost && setHunterAction(hunterAction === 'EXILE' ? null : 'EXILE')}
                    style={ghost ? disS : { ...actionBtnS(hunterAction === 'EXILE'), background: hunterAction === 'EXILE' ? '#7f1d1d' : '#1e293b', borderColor: '#ef4444', color: '#f87171' }}
                    disabled={ghost}>
                    🚫 驱逐
                  </button>
                </div>
              );
            })()}

            {/* Move submenu */}
            {hunterAction === 'MOVE' && (
              <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {ZONE_CHAIN.map(zk => {
                  const z = ZONE_DEFS[zk];
                  const isHere = selH.location === zk;
                  const locked = !unlockedZones.has(zk);
                  return (
                    <button key={zk} disabled={isHere || locked}
                      onClick={() => { dispatch(selH.id, zk); setHunterAction(null); }}
                      style={{ background: isHere ? '#1e293b' : locked ? '#111827' : (z.wild ? '#991b1b' : '#166534'), border: `1px solid ${isHere || locked ? '#334155' : 'transparent'}`, color: isHere || locked ? '#4b5563' : 'white', padding: '8px 0', borderRadius: 6, cursor: (isHere || locked) ? 'default' : 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                      {locked ? `🔒 ${z.name}` : z.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Life submenu */}
            {hunterAction === 'LIFE' && (
              <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { key: 'HEALER',       label: '⚕️ 治疗',     color: '#166534' },
                  { key: 'TAVERN',       label: '🍺 吃饭',     color: '#92400e' },
                  { key: 'TRADING_POST', label: '💼 出售材料', color: '#1e40af' },
                  { key: 'BLACKSMITH',   label: '🔨 锻造',     color: '#581c87' },
                  { key: 'SKILL_HALL',   label: '📚 学习技能', color: '#0f4c44' },
                ].map(({ key, label, color }) => (
                  <button key={key} onClick={() => goToBldg(selH.id, key)}
                    style={{ background: color, border: 'none', color: 'white', padding: '8px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Exile confirmation */}
            {hunterAction === 'EXILE' && (
              <div style={{ padding: '10px 14px 12px', textAlign: 'center' }}>
                <p style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>
                  确定要驱逐 <b>{selH.name}</b> 出村庄？他将永远离开。
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => exileHunter(selH.id)}
                    style={{ background: '#dc2626', border: 'none', color: 'white', padding: '6px 20px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
                    确定驱逐
                  </button>
                  <button onClick={() => setHunterAction(null)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '6px 20px', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Building placement confirm — follows the green box */}
        {placingBuilding && placingPos && (() => {
          const bLeft = placingPos.tx * TILE + offset.x;
          const bTop  = placingPos.ty * TILE + offset.y + BSIZE * TILE + 8;
          const bInfo = BUILDING_TYPES[placingBuilding];
          const overlap = buildings.some(b => !(placingPos.tx + BSIZE <= b.tx || placingPos.tx >= b.tx + BSIZE || placingPos.ty + BSIZE <= b.ty || placingPos.ty >= b.ty + BSIZE));
          const outOfBounds = placingPos.tx + BSIZE > HT || placingPos.ty + BSIZE > HT;
          const invalid = overlap || outOfBounds;
          return (
            <div style={{ position: 'absolute', left: bLeft, top: bTop, transform: 'translateX(-50%)', marginLeft: BSIZE * TILE / 2, background: 'rgba(10,18,35,0.97)', padding: '8px 14px', borderRadius: 8, border: `2px solid ${invalid ? '#ef4444' : '#22c55e'}`, zIndex: 20, whiteSpace: 'nowrap', pointerEvents: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 12, marginBottom: 7, color: invalid ? '#f87171' : '#e2e8f0' }}>
                {bInfo.emoji} {bInfo.name} {invalid ? (outOfBounds ? '— 超出村庄' : '— 位置重叠') : '— 拖动绿框选址'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmPlace} disabled={invalid}
                  style={{ background: invalid ? '#374151' : '#16a34a', border: 'none', color: invalid ? '#6b7280' : 'white', padding: '5px 16px', borderRadius: 4, cursor: invalid ? 'default' : 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                  ✓ 确认建造
                </button>
                <button onClick={() => { setPlacingBuilding(null); setPlacingPos(null); }}
                  style={{ background: '#7f1d1d', border: 'none', color: '#fca5a5', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  ✕ 取消
                </button>
              </div>
            </div>
          );
        })()}

        {/* Game log — 左下角，5秒后消失 */}
        {(() => {
          const now2 = Date.now();
          const visible = gameLog.filter(l => now2 - l.at < 5000).slice(-5).reverse();
          if (!visible.length) return null;
          return (
            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10, pointerEvents: 'none' }}>
              {visible.map((l, i) => (
                <div key={l.id} style={{ background: 'rgba(10,18,35,0.88)', padding: '5px 10px', borderRadius: 6, fontSize: 11, color: i === 0 ? '#e2e8f0' : '#94a3b8', border: '1px solid #1e293b', opacity: Math.max(0.3, 1 - (now2 - l.at) / 5000) }}>
                  {l.msg}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Minimap */}
        <div style={{ position: 'absolute', top: 16, right: 16, background: '#1e293b', padding: 7, borderRadius: 8, border: '2px solid #3b82f6', zIndex: 10 }}>
          <svg width={MINI} height={MINI} style={{ display: 'block', border: '1px solid #3b82f6' }}>
            <rect x={0} y={0} width={MINI} height={MINI} fill={ZONE_DEFS[viewZone]?.fill || '#4a8a4a'} />
            {viewZone === 'VILLAGE' && buildings.map(b => <rect key={b.id} x={b.tx * TILE * msc} y={b.ty * TILE * msc} width={4} height={4} fill="#3b82f6" />)}
            {monsters.filter(m => m.zone === viewZone).map(m => <circle key={m.id} cx={m.tx * TILE * msc} cy={m.ty * TILE * msc} r={1.5} fill="#ef4444" />)}
            {hunters.filter(h => h.location === viewZone).map(h => <circle key={h.id} cx={h.tx * TILE * msc} cy={h.ty * TILE * msc} r={2.5} fill={h.isGhost ? '#818cf8' : h.recoverUntil ? '#fbbf24' : h.combatTargetId ? '#e879f9' : '#22d3ee'} />)}
            <rect x={-offset.x * msc} y={-offset.y * msc} width={(cRef.current?.clientWidth || 800) * msc} height={(cRef.current?.clientHeight || 600) * msc} fill="none" stroke="white" strokeWidth={1.5} opacity={0.7} />
          </svg>
        </div>

        {/* Zone info (top-left) */}
        <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(10,18,35,0.88)', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', zIndex: 10, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, background: ZONE_DEFS[viewZone]?.fill, borderRadius: 2 }} />
            <span style={{ fontWeight: 'bold' }}>{ZONE_DEFS[viewZone]?.name}</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 10 }}>
            👹 {monsters.filter(m => m.zone === viewZone).length} 怪物
            &nbsp;🧑 {hunters.filter(h => h.location === viewZone).length} 猎人
            {viewZone !== 'VILLAGE' && <>&nbsp;·&nbsp;击杀 {zoneKills[viewZone] || 0}</>}
          </div>
          <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>
            🚶 {hunters.filter(h => h.location === 'TRAVELING').length} 人移动中
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ background: '#0f172a', borderTop: '2px solid #1e293b', padding: '10px 16px', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={() => { setSelectedHunterId(null); setHunterAction(null); setPanel(panel === 'BUILD' ? null : 'BUILD'); }} style={btnS(panel === 'BUILD')}>🏗️ 建造</button>
        <button onClick={() => { setSelectedHunterId(null); setHunterAction(null); setPanel(panel === 'HUNTERS' ? null : 'HUNTERS'); }} style={btnS(panel === 'HUNTERS')}>👥 猎人</button>
        <button onClick={() => { setSelectedHunterId(null); setHunterAction(null); setPanel(panel === 'EQUIPMENT' ? null : 'EQUIPMENT'); }} style={{ ...btnS(panel === 'EQUIPMENT'), position: 'relative' }}>
          📦 仓库{inventory.length > 0 && <span style={{ position: 'absolute', top: 4, right: 6, background: '#ef4444', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inventory.length}</span>}
        </button>
        <button onClick={() => { setSelectedHunterId(null); setHunterAction(null); setPanel(panel === 'WORLDMAP' ? null : 'WORLDMAP'); }} style={btnS(panel === 'WORLDMAP')}>🗺️ 地图</button>
      </div>

      {/* Build panel */}
      {panel === 'BUILD' && (
        <div style={OL} onClick={() => setPanel(null)}>
          <div style={SS} onClick={e => e.stopPropagation()}>
            <div style={SH}><span style={{ fontWeight: 'bold', fontSize: 15 }}>🏗️ 建造</span><span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={() => setPanel(null)}>✕</span></div>
            <div style={{ overflowY: 'auto', padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(BUILDING_TYPES).filter(([k]) => k !== 'HEADQUARTERS').map(([k, v]) => {
                const built = builtTypes.has(k);
                return (
                  <div key={k} style={{ background: built ? '#1a2030' : '#1e293b', border: `1px solid ${built ? '#374151' : '#334155'}`, borderRadius: 8, padding: 12, opacity: built ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 26 }}>{v.emoji}</span>
                      <div style={{ fontWeight: 'bold', fontSize: 13 }}>{v.name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{v.desc}</div>
                    <button disabled={built} onClick={() => { if (!built) {
                        const cw = cRef.current?.clientWidth || 800, ch = cRef.current?.clientHeight || 600;
                        const cx = Math.floor((-offset.x + cw / 2) / TILE) - Math.floor(BSIZE / 2);
                        const cy = Math.floor((-offset.y + ch / 2) / TILE) - Math.floor(BSIZE / 2);
                        setPlacingPos({ tx: Math.max(0, Math.min(HT - BSIZE, cx)), ty: Math.max(0, Math.min(HT - BSIZE, cy)) });
                        setPlacingBuilding(k); setPanel(null);
                      } }}
                      style={{ width: '100%', background: built ? '#374151' : '#2563eb', border: 'none', color: built ? '#6b7280' : 'white', padding: '5px 0', borderRadius: 4, cursor: built ? 'default' : 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                      {built ? '✅ 已建造' : '选址建造'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {panel === 'HUNTERS' && <HuntersPanel hunters={hunters} onClose={() => setPanel(null)} dispatch={dispatch} locLabel={locLabel} onUnequip={onUnequip} rp={rp} SS={SS} SH={SH} onTrack={onTrack} onLearnSkill={onLearnSkill} unlockedZones={unlockedZones} strategy={strategy} setStrategy={setStrategy} />}
      {panel === 'WORLDMAP' && <WorldMapPanel zoneKills={zoneKills} unlockedZones={unlockedZones} viewZone={viewZone} setViewZone={z => { setViewZone(z); setPanel(null); }} onClose={() => setPanel(null)} SS={SS} SH={SH} />}
      {panel === 'EQUIPMENT' && <EquipPanel inventory={inventory} materials={materials} hunters={hunters} onEquip={onEquip} onClose={() => setPanel(null)} SS={SS} SH={SH} />}
      {smithBuilding && <BlacksmithPanel resources={resources} materials={materials} onCraft={onCraft} onClose={() => setSmithBuilding(null)} SS={SS} SH={SH} />}
      {tradingBuilding && <TradingPanel tradeOrders={tradeOrders} setTradeOrders={setTradeOrders} onClose={() => setTradingBuilding(null)} SS={SS} SH={SH} />}
      {hqBuilding && <HQPanel candidates={candidates} candidatesRefreshAt={candidatesRefreshAt} onRecruit={recruitHunter} onRefresh={refreshCandidates} resources={resources} hunterCount={hunters.filter(h => !h._remove).length} maxHunters={MAX_HUNTERS} onClose={() => setHqBuilding(null)} SS={SS} SH={SH} />}
      {infoBldg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setInfoBldg(null)}>
          <div style={{ background: '#0f172a', border: `2px solid ${infoBldg.type === 'HEALER' ? '#34d399' : infoBldg.type === 'ALTAR' ? '#f59e0b' : '#fb923c'}`, borderRadius: 14, padding: 24, maxWidth: 320, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 40 }}>{BUILDING_TYPES[infoBldg.type].emoji}</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 17 }}>{BUILDING_TYPES[infoBldg.type].name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{BUILDING_TYPES[infoBldg.type].desc}</div>
              </div>
            </div>
            {infoBldg.type === 'ALTAR' ? (
              <>
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>⏱️ 复活时间</div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f59e0b' }}>8 秒</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>仪式完成后恢复 50% 生命值</div>
                </div>
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>💰 复活费用</div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f59e0b' }}>免费</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>无需金币，但需要等待 8 秒</div>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  猎人阵亡后变为<b style={{ color: 'white' }}>👻 幽灵</b>状态，自动前往祭坛。<br />进入祭坛后开始 <b style={{ color: '#f59e0b' }}>8 秒复活仪式</b>，完成后以 50% HP 复活并返回原战场。
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>💰 使用费用</div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: infoBldg.type === 'HEALER' ? '#34d399' : '#fb923c' }}>
                    {infoBldg.type === 'HEALER' ? `${HEALER_FEE}💰` : `${TAVERN_FEE}💰`}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>从猎人钱包中扣除</div>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  猎人需要<b style={{ color: 'white' }}>走到建筑内</b>才能开始{infoBldg.type === 'HEALER' ? '治疗' : '进食'}，5秒内完成恢复。
                </div>
              </>
            )}
            <button onClick={() => setInfoBldg(null)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>关闭</button>
          </div>
        </div>
      )}

      {/* Skill Hall overlay */}
      {skillHallBuilding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setSkillHallBuilding(null)}>
          <div style={{ background: '#0f172a', border: '2px solid #2dd4bf', borderRadius: 14, padding: 20, maxWidth: 400, width: '92%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 36 }}>📖</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 17 }}>技能所</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>在此学习职业技能。选中猎人→生活→学习技能，猎人走到技能所后自动学习可解锁的技能。</div>
              </div>
            </div>
            <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#2dd4bf', marginBottom: 8 }}>技能解锁条件</div>
              {Object.entries(SKILL_DEFS).map(([sk, def]) => (
                <div key={sk} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{def.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 'bold', color: def.color }}>{def.name}</span>
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 6 }}>Lv{def.reqLevel} · {PROFESSIONS[def.profession]?.name || def.profession}</span>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{def.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setSkillHallBuilding(null)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>关闭</button>
          </div>
        </div>
      )}

      {/* Hunter detail overlay */}
      {showHunterDetail && selH && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
            onClick={() => setShowHunterDetail(false)}>
            <div style={{ background: '#0f172a', border: '2px solid #3b82f6', borderRadius: 16, width: 546, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <span style={{ cursor: 'pointer', color: '#f87171', fontSize: 18 }} onClick={() => setShowHunterDetail(false)}>✕</span>
              </div>
              <HunterDetailContent h={selH} onUnequip={onUnequip} rp={rp} locLabel={locLabel} tab={detailTab} setTab={setDetailTab} onLearnSkill={onLearnSkill} />
            </div>
          </div>
      )}
    </div>
  );
}
