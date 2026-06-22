export const TILE = 20, MAP_TILES = 250, MAP_PX = MAP_TILES * TILE, HT = MAP_TILES / 2, HPX = MAP_PX / 2;
export const BSIZE = 4, ER = TILE * 1.4;
export const GATE_TX = 6, GATE_TY = 5; // village gate — top-left area, hunters enter/exit here
// Portal tile positions (match SVG circles at cx=40 and cx=HPX-40, cy=HPX/2)
export const PORTAL_TX_LEFT  = 2;                     // 左侧传送门 tile x (cx=40/TILE=2)
export const PORTAL_TX_RIGHT = Math.round(HT) - 2;    // 右侧传送门 tile x (cx=(HPX-40)/TILE≈123)
export const PORTAL_TY       = Math.floor(HT / 2);    // 传送门 tile y (cy=HPX/2/TILE=62)
export const H_SIGHT = 12, M_SIGHT = 40, M_ATK = 3, SEP = 3.5;
export const T_SPD = 10, W_SPD = 2.4, WILD_W_SPD = 5.6, MON_SPD = 3.0, MOVE_MS = 120;
export const TS = T_SPD * MOVE_MS / 1000, WS = W_SPD * MOVE_MS / 1000, WILD_WS = WILD_W_SPD * MOVE_MS / 1000, MS = MON_SPD * MOVE_MS / 1000;

export const ZONE_DEFS = {
  VILLAGE:    { key: 'VILLAGE',    name: '🏘️ 村庄',   fill: '#4a8a4a', wild: false },
  ICE_1:      { key: 'ICE_1',      name: '🧊 冰原·一', fill: '#b0d8ee', wild: true  },
  ICE_2:      { key: 'ICE_2',      name: '🧊 冰原·二', fill: '#7ab8d8', wild: true  },
  MOUNTAIN_1: { key: 'MOUNTAIN_1', name: '⛰️ 雪山·一', fill: '#8898a8', wild: true  },
  MOUNTAIN_2: { key: 'MOUNTAIN_2', name: '⛰️ 雪山·二', fill: '#5e6e7e', wild: true  },
  FOREST_1:   { key: 'FOREST_1',   name: '🌲 暗森·一', fill: '#1a4a1a', wild: true  },
  FOREST_2:   { key: 'FOREST_2',   name: '🌲 暗森·二', fill: '#0e2e0e', wild: true  },
  FOREST_3:   { key: 'FOREST_3',   name: '🌲 暗森·三', fill: '#071807', wild: true  },
};

export const ZONE_CHAIN = ['VILLAGE', 'ICE_1', 'ICE_2', 'MOUNTAIN_1', 'MOUNTAIN_2', 'FOREST_1', 'FOREST_2', 'FOREST_3'];

export const ZONE_UNLOCK_KILLS = {
  VILLAGE: 0, ICE_1: 0, ICE_2: 30, MOUNTAIN_1: 80,
  MOUNTAIN_2: 160, FOREST_1: 280, FOREST_2: 450, FOREST_3: 680,
};

export const ZONE_MONSTER_POOL = {
  ICE_1:      ['ICE_WOLF'],
  ICE_2:      ['ICE_WOLF', 'FROST_GIANT'],
  MOUNTAIN_1: ['YETI'],
  MOUNTAIN_2: ['YETI', 'ICE_DRAGON'],
  FOREST_1:   ['GIANT_WOLF'],
  FOREST_2:   ['TROLL', 'GIANT_WOLF'],
  FOREST_3:   ['TROLL', 'GIANT_WOLF', 'ICE_DRAGON'],
};

export const MONSTER_DEFS = {
  ICE_WOLF:    { zone: 'ICE',      name: '冰狼',   emoji: '🐺', maxHp: 21,  atk: 4,  xp: 15,  loot: { gold: 15, ore: 5 },
    dt: { mk: 'wolf_pelt',     mc: 0.70, ec: 0.15, w: { COMMON: 65, GOOD: 30, RARE: 5,  EPIC: 0,  LEGENDARY: 0 } } },
  FROST_GIANT: { zone: 'ICE',      name: '霜巨人', emoji: '👹', maxHp: 53,  atk: 9,  xp: 55,  loot: { gold: 50, ore: 20 },
    dt: { mk: 'frost_crystal', mc: 0.80, ec: 0.35, w: { COMMON: 20, GOOD: 40, RARE: 30, EPIC: 10, LEGENDARY: 0 } } },
  TROLL:       { zone: 'FOREST',   name: '山精',   emoji: '👺', maxHp: 32,  atk: 7,  xp: 28,  loot: { gold: 30, wood: 25 },
    dt: { mk: 'troll_hide',    mc: 0.70, ec: 0.20, w: { COMMON: 50, GOOD: 35, RARE: 13, EPIC: 2,  LEGENDARY: 0 } } },
  GIANT_WOLF:  { zone: 'FOREST',   name: '巨狼',   emoji: '🐗', maxHp: 25,  atk: 5,  xp: 20,  loot: { gold: 20, food: 30 },
    dt: { mk: 'wolf_fang',     mc: 0.65, ec: 0.15, w: { COMMON: 60, GOOD: 33, RARE: 7,  EPIC: 0,  LEGENDARY: 0 } } },
  YETI:        { zone: 'MOUNTAIN', name: '雪怪',   emoji: '🦣', maxHp: 42,  atk: 8,  xp: 45,  loot: { gold: 40, ore: 25 },
    dt: { mk: 'yeti_fur',      mc: 0.75, ec: 0.28, w: { COMMON: 30, GOOD: 40, RARE: 22, EPIC: 8,  LEGENDARY: 0 } } },
  ICE_DRAGON:  { zone: 'MOUNTAIN', name: '冰龙',   emoji: '🐉', maxHp: 88,  atk: 14, xp: 130, loot: { gold: 120, ore: 60 },
    dt: { mk: 'dragon_scale',  mc: 0.95, ec: 0.65, w: { COMMON: 0,  GOOD: 15, RARE: 40, EPIC: 35, LEGENDARY: 10 } } },
};

export const PROFESSIONS = {
  WARRIOR: { name: '战士', emoji: '⚔️', atk: 20, def: 12, atkSpd: 1.2, crit: 10, dodge: 5 },
  HUNTER:  { name: '猎手', emoji: '🏹', atk: 18, def: 5,  atkSpd: 1.8, crit: 25, dodge: 18 },
  SHAMAN:  { name: '祭祀', emoji: '🔮', atk: 12, def: 7,  atkSpd: 1.0, crit: 15, dodge: 10 },
};

export const BUILDING_TYPES = {
  HEADQUARTERS: { name: '大本营', emoji: '🏰', desc: '村庄核心' },
  HEALER:       { name: '治疗所', emoji: '⚕️', desc: '猎人受伤时自动来此恢复HP（5秒·收费15💰）' },
  TAVERN:       { name: '酒馆',   emoji: '🍺', desc: '猎人饥饿时自动来此补充饱食（5秒·收费8💰）' },
  BLACKSMITH:   { name: '铁匠铺', emoji: '🔨', desc: '解锁装备打造' },
  SKILL_HALL:   { name: '技能所', emoji: '📖', desc: '猎人在此学习技能，需达到对应等级（Lv1/5/10）' },
  ALTAR:        { name: '祭坛',   emoji: '⛩️', desc: '猎人阵亡后幽灵返回此处复活（恢复50% HP）' },
  TRADING_POST: { name: '收购所', emoji: '🏪', desc: '发布收购委托，猎人回城时自动出售材料' },
  FARM:         { name: '粮田',   emoji: '🌾', desc: '每秒产出食物' },
  MINE:         { name: '矿场',   emoji: '⛏️', desc: '每秒产出矿石' },
  WATCHTOWER:   { name: '瞭望台', emoji: '🗼', desc: '扩大猎人视野' },
};

export const HEALER_FEE = 15;
export const TAVERN_FEE = 8;

// XP needed to go from level N to N+1 (index 0 = 1→2, 99 entries → max level 100)
// Formula: 100 + 80*i + 10*i*(i-1), keeps original 1-10 values, scales smoothly to 100
export const XP_PER_LEVEL = Array.from({ length: 99 }, (_, i) => 100 + 80 * i + 10 * i * (i - 1));
export const SKILL_LEVEL_XP = [100, 500, 2000, 5000]; // XP to reach skill Lv2, Lv3, Lv4, Lv5

export const SKILL_DEFS = {
  taunt:        { name: '嘲讽', profession: 'WARRIOR', reqLevel: 1,  emoji: '😤', color: '#ef4444', desc: '附近怪物优先攻击自己' },
  heavy_strike: { name: '重击', profession: 'WARRIOR', reqLevel: 5,  emoji: '💪', color: '#f97316', desc: '每5次攻击必定暴击一次' },
  war_cry:      { name: '战吼', profession: 'WARRIOR', reqLevel: 10, emoji: '📢', color: '#fbbf24', desc: '附近猎人攻击力 +8%' },
  eagle_eye:    { name: '鹰眼', profession: 'HUNTER',  reqLevel: 1,  emoji: '🦅', color: '#22c55e', desc: '视野范围 +30%' },
  rapid_fire:   { name: '连射', profession: 'HUNTER',  reqLevel: 5,  emoji: '🏹', color: '#10b981', desc: '攻击有25%概率打两次' },
  lethal:       { name: '致命', profession: 'HUNTER',  reqLevel: 10, emoji: '☠️', color: '#059669', desc: '暴击伤害从2倍变2.5倍' },
  heal:         { name: '治愈', profession: 'SHAMAN',  reqLevel: 1,  emoji: '💚', color: '#a855f7', desc: '释放治疗光圈，恢复附近友军HP' },
  curse:        { name: '诅咒', profession: 'SHAMAN',  reqLevel: 5,  emoji: '💀', color: '#7c3aed', desc: '攻击的怪物防御 -15%' },
  prophecy:     { name: '预言', profession: 'SHAMAN',  reqLevel: 10, emoji: '🔮', color: '#6d28d9', desc: '自动感知附近怪物，无需视野' },
};
export const PROF_SKILLS = {
  WARRIOR: ['taunt', 'heavy_strike', 'war_cry'],
  HUNTER:  ['eagle_eye', 'rapid_fire', 'lethal'],
  SHAMAN:  ['heal', 'curse', 'prophecy'],
};

export const MAT_PRICES = {
  wolf_pelt:     8,
  frost_crystal: 20,
  troll_hide:    12,
  wolf_fang:     10,
  yeti_fur:      18,
  dragon_scale:  60,
};

export const PERSONALITIES = {
  STRONG:       { name: '强壮',    type: 'positive', emoji: '💪', desc: '攻击力+10%',    atkMul: 1.10 },
  SWIFT:        { name: '迅捷',    type: 'positive', emoji: '⚡', desc: '攻击速度+10%',  atkSpdMul: 1.10 },
  SKINNY:       { name: '消瘦',    type: 'positive', emoji: '🥢', desc: '饱食消耗-20%',  hungerMul: 0.80 },
  HEROIC:       { name: '勇敢无畏', type: 'positive', emoji: '🦁', desc: '攻击/速度+7%', atkMul: 1.07, atkSpdMul: 1.07 },
  RICH:         { name: '富有',    type: 'positive', emoji: '💰', desc: '金币+20%',      goldMul: 1.20 },
  MAN_OF_STEEL: { name: '钢铁之躯', type: 'positive', emoji: '🔩', desc: '受伤-10%',     dmgMul: 0.90 },
  NIMBLE:       { name: '敏捷',    type: 'positive', emoji: '🌀', desc: '闪避+3%',       dodgeAdd: 3 },
  SHARP:        { name: '锐利',    type: 'positive', emoji: '🔪', desc: '暴击+3%',       critAdd: 3 },
  ENERGETIC:    { name: '精力充沛', type: 'positive', emoji: '🔋', desc: '耐力消耗-20%' },
  OPTIMISTIC:   { name: '乐观',    type: 'positive', emoji: '😄', desc: '心情消耗-20%' },
  COWARD:       { name: '胆小鬼',  type: 'neutral',  emoji: '😰', desc: '血量<40%逃跑',  coward: true },
  YOLO:         { name: '不留遗憾', type: 'neutral',  emoji: '😤', desc: '绝不逃跑',      neverFlee: true },
  ORDINARY:     { name: '普通',    type: 'neutral',  emoji: '😐', desc: '无特殊效果' },
  RUDE:         { name: '粗鲁',    type: 'neutral',  emoji: '😒', desc: '无特殊效果' },
  TROLL:        { name: '网络杠精', type: 'neutral',  emoji: '🖥️', desc: '无特殊效果' },
  FRAGILE:      { name: '脆弱',    type: 'negative', emoji: '🥚', desc: '攻击力-10%',    atkMul: 0.90 },
  OVERWEIGHT:   { name: '肥胖',    type: 'negative', emoji: '🍔', desc: '饱食消耗+20%',  hungerMul: 1.20 },
  SLUGGISH:     { name: '怠惰',    type: 'negative', emoji: '😴', desc: '闪避-3%',       dodgeAdd: -3 },
  DULL:         { name: '迟钝',    type: 'negative', emoji: '🥱', desc: '暴击-3%',       critAdd: -3 },
  THICKHEADED:  { name: '不开窍',  type: 'negative', emoji: '🧱', desc: '攻击速度-10%',  atkSpdMul: 0.90 },
  SLOW:         { name: '迟缓',    type: 'negative', emoji: '🐌', desc: '移动速度-10%' },
  PESSIMISTIC:  { name: '悲观',    type: 'negative', emoji: '😞', desc: '心情消耗+20%' },
  LAGGARD:      { name: '落后者',  type: 'negative', emoji: '🐢', desc: '经验-10%' },
};
export const PKEYS = Object.keys(PERSONALITIES);
export const PCOLOR = { positive: '#22c55e', neutral: '#94a3b8', negative: '#ef4444' };

export const QUALITY = {
  COMMON:    { key: 'COMMON',    name: '普通', color: '#9ca3af', mult: 1.0 },
  GOOD:      { key: 'GOOD',      name: '优秀', color: '#22c55e', mult: 1.5 },
  RARE:      { key: 'RARE',      name: '稀有', color: '#3b82f6', mult: 2.2 },
  EPIC:      { key: 'EPIC',      name: '史诗', color: '#a855f7', mult: 3.2 },
  LEGENDARY: { key: 'LEGENDARY', name: '传说', color: '#f59e0b', mult: 5.0 },
};

export const EQUIP_SLOTS = {
  weapon:   { name: '武器', emoji: '⚔️', baseStats: { atk: 10 } },
  armor:    { name: '护甲', emoji: '🛡️', baseStats: { def: 6, maxHpBonus: 20 } },
  shoes:    { name: '鞋子', emoji: '👢', baseStats: { dodge: 5 } },
  offhand:  { name: '副手', emoji: '🗡️', baseStats: { def: 4, atk: 4 } },
  ring:     { name: '戒指', emoji: '💍', baseStats: { atkSpeed: 0.1, crit: 2 } },
  necklace: { name: '项链', emoji: '📿', baseStats: { maxHpBonus: 30, crit: 3 } },
};

export const MATERIALS = {
  wolf_pelt:     { name: '狼皮',   emoji: '🐺', desc: '冰狼掉落' },
  frost_crystal: { name: '霜晶',   emoji: '❄️', desc: '霜巨人掉落' },
  troll_hide:    { name: '精皮',   emoji: '🟫', desc: '山精掉落' },
  wolf_fang:     { name: '狼牙',   emoji: '🦷', desc: '巨狼掉落' },
  yeti_fur:      { name: '雪兽毛', emoji: '🦣', desc: '雪怪掉落' },
  dragon_scale:  { name: '龙鳞',   emoji: '🐉', desc: '冰龙掉落' },
};

export const EQ_NAMES = {
  weapon:   ['霜之刃', '寒冰矛', '极北弓', '雪域剑', '暴风斧', '狼牙刀', '山岳锤', '冰峰戟'],
  armor:    ['霜甲', '雪狼皮甲', '寒铁盔甲', '山岳盔', '冰晶护甲', '冰熊皮甲'],
  shoes:    ['霜踏靴', '雪狼皮靴', '疾风战靴', '冰晶软鞋', '山岳行靴'],
  offhand:  ['寒霜盾', '北境盾', '冰晶格挡', '残月匕首', '龙骨副刃'],
  ring:     ['寒晶戒', '龙鳞指环', '霜雪戒指', '狼牙指环', '暴风戒'],
  necklace: ['冰霜项链', '雪域护符', '狼牙坠饰', '霜雪腰带', '龙骨吊坠'],
};

export const NAMES = ['托尔','奥丁','弗雷','提尔','海姆','布拉吉','雷格纳','比约恩','斯诺里','乌尔夫','艾里克','莱夫','托斯坦','刚纳','哈拉尔','克努特','伊登','芙蕾','英格','阿斯','博格','希尔','古德','兰迪','赫尔','碧尔','索尔','维京','鲁纳','冈纳','西古尔','弗里达','凯伦','埃格尔','赫尔加','托拉','比尔娜'];

// Blacksmith crafting recipes
// costRes: deducted from resources (gold/food/wood/ore)
// costMat: deducted from materials (wolf_pelt etc.)
export const RECIPES = [
  {
    id: 'iron_sword',
    name: '铁剑',
    emoji: '⚔️',
    slot: 'weapon',
    desc: '铸造精良的战士之剑，削铁如泥',
    forProfession: 'WARRIOR',
    costRes: { ore: 3 },
    costMat: { wolf_pelt: 1 },
    qw: { COMMON: 40, GOOD: 35, RARE: 18, EPIC: 6, LEGENDARY: 1 },
  },
  {
    id: 'wooden_bow',
    name: '猎手木弓',
    emoji: '🏹',
    slot: 'weapon',
    desc: '轻便耐用的猎手长弓，百步穿杨',
    forProfession: 'HUNTER',
    costRes: { wood: 3 },
    costMat: { wolf_fang: 1 },
    qw: { COMMON: 40, GOOD: 35, RARE: 18, EPIC: 6, LEGENDARY: 1 },
  },
  {
    id: 'magic_staff',
    name: '魔法法杖',
    emoji: '🔮',
    slot: 'weapon',
    desc: '蕴含古老魔力的法器，施展奥术',
    forProfession: 'SHAMAN',
    costRes: { ore: 2 },
    costMat: { frost_crystal: 1 },
    qw: { COMMON: 35, GOOD: 35, RARE: 22, EPIC: 7, LEGENDARY: 1 },
  },
  // Offhand
  {
    id: 'iron_shield',
    name: '铁盾',
    emoji: '🛡️',
    slot: 'offhand',
    desc: '厚重铁盾，格挡近战伤害',
    forProfession: 'WARRIOR',
    costRes: { ore: 4 },
    costMat: { wolf_pelt: 1 },
    qw: { COMMON: 40, GOOD: 35, RARE: 18, EPIC: 6, LEGENDARY: 1 },
  },
  {
    id: 'iron_arrows',
    name: '铁质箭矢',
    emoji: '🏹',
    slot: 'offhand',
    desc: '锋利铁制箭头，提升弓手攻击',
    forProfession: 'HUNTER',
    costRes: { ore: 2, wood: 1 },
    costMat: { wolf_fang: 1 },
    qw: { COMMON: 40, GOOD: 35, RARE: 18, EPIC: 6, LEGENDARY: 1 },
  },
  {
    id: 'magic_orb',
    name: '魔法法球',
    emoji: '🔵',
    slot: 'offhand',
    desc: '凝聚魔力的法球，增强法术威力',
    forProfession: 'SHAMAN',
    costRes: { ore: 2 },
    costMat: { frost_crystal: 2 },
    qw: { COMMON: 35, GOOD: 35, RARE: 22, EPIC: 7, LEGENDARY: 1 },
  },
  // Armor
  {
    id: 'iron_armor',
    name: '铁甲',
    emoji: '🧥',
    slot: 'armor',
    desc: '坚固铁甲，大幅提升防御与生命',
    costRes: { ore: 5 },
    costMat: { troll_hide: 1 },
    qw: { COMMON: 40, GOOD: 35, RARE: 18, EPIC: 6, LEGENDARY: 1 },
  },
  {
    id: 'cloth_armor',
    name: '布甲',
    emoji: '👕',
    slot: 'armor',
    desc: '轻便布甲，适合法师与弓手',
    costRes: { wood: 2, food: 2 },
    costMat: { wolf_pelt: 2 },
    qw: { COMMON: 45, GOOD: 35, RARE: 15, EPIC: 4, LEGENDARY: 1 },
  },
  // Shoes
  {
    id: 'iron_boots',
    name: '铁鞋',
    emoji: '👢',
    slot: 'shoes',
    desc: '沉重铁靴，提供额外防御',
    costRes: { ore: 3 },
    costMat: { troll_hide: 1 },
    qw: { COMMON: 40, GOOD: 35, RARE: 18, EPIC: 6, LEGENDARY: 1 },
  },
  {
    id: 'cloth_boots',
    name: '布鞋',
    emoji: '🥿',
    slot: 'shoes',
    desc: '轻便布鞋，提升闪避能力',
    costRes: { wood: 1, food: 1 },
    costMat: { wolf_pelt: 1 },
    qw: { COMMON: 45, GOOD: 35, RARE: 15, EPIC: 4, LEGENDARY: 1 },
  },
  // Ring
  {
    id: 'speed_ring',
    name: '疾速戒指',
    emoji: '💍',
    slot: 'ring',
    desc: '附有疾速符文，提升攻击速度',
    costRes: { ore: 3, gold: 20 },
    costMat: { frost_crystal: 1 },
    qw: { COMMON: 35, GOOD: 35, RARE: 22, EPIC: 7, LEGENDARY: 1 },
  },
  // Necklace
  {
    id: 'hp_necklace',
    name: '生命项链',
    emoji: '📿',
    slot: 'necklace',
    desc: '蕴含生机之力，大幅提升最大生命',
    costRes: { ore: 2, gold: 15 },
    costMat: { yeti_fur: 1 },
    qw: { COMMON: 35, GOOD: 35, RARE: 22, EPIC: 7, LEGENDARY: 1 },
  },
];

export const RES_LABEL = { gold: '💰金币', food: '🌾食物', wood: '🪵木材', ore: '⛏️矿石' };
