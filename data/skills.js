import { SPELLS } from "./spells.js";

export const SKILLS = Object.freeze({
  armor_break: Object.freeze({
    id: "armor_break",
    name: "鎧砕き",
    description: "威力90%の攻撃。命中時、敵のDEFを\n3ターンの間25%低下させる。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 4,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 0.9,
    effects: Object.freeze([{
      statusId: "armor_break",
      trigger: "firstHitOnly",
      guaranteed: true
    }])
  }),
  power_strike: Object.freeze({
    id: "power_strike",
    name: "強打",
    description: "行動速度－3。武器で\n威力140%の強力な一撃を放つ。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 5,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 1.4,
    speedModifier: -3,
    effects: Object.freeze([])
  }),
  unyielding_stance: Object.freeze({
    id: "unyielding_stance",
    name: "不屈の構え",
    description: "行動速度＋15。2ターンの間、\n受ける物理ダメージを50%軽減する。",
    actionType: "buff",
    category: "combatArt",
    spCost: 8,
    target: "self",
    speedModifier: 15,
    effects: Object.freeze([{ statusId: "unyielding_stance", trigger: "perAction", guaranteed: true }])
  }),
  quick_strike: Object.freeze({
    id: "quick_strike",
    name: "素早い一撃",
    description: "行動速度＋15。武器の攻撃回数で\n威力90%の素早い連撃を放つ。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 3,
    target: "enemy",
    hitCountMode: "weapon",
    powerPerHit: 0.9,
    speedModifier: 15,
    effects: Object.freeze([])
  }),
  poison_blade: Object.freeze({
    id: "poison_blade",
    name: "毒刃",
    description: "武器の攻撃回数で威力80%の攻撃。\n最初の命中時65%で毒（最大HP5%×3回）。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 5,
    target: "enemy",
    hitCountMode: "weapon",
    powerPerHit: 0.8,
    effects: Object.freeze([{
      statusId: "poison",
      trigger: "firstHitOnly",
      statusKind: "physical",
      baseRate: 0.65
    }])
  }),
  shadow_bind: Object.freeze({
    id: "shadow_bind",
    name: "影縫い",
    description: "威力60%の攻撃。命中時、55%で\n敵の次の行動を1回封じる。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 8,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 0.6,
    effects: Object.freeze([{
      statusId: "action_skip",
      trigger: "firstHitOnly",
      statusKind: "physical",
      baseRate: 0.55
    }])
  }),
  holy_strike: Object.freeze({
    id: "holy_strike",
    name: "聖なる打撃",
    description: "敵のDEFを25%貫通する、\n威力100%の物理攻撃。",
    actionType: "physicalAttack",
    category: "miracle",
    spCost: 4,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 1,
    defensePenetration: 0.25,
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  healing_prayer: SPELLS.healing_prayer,
  guardian_prayer: Object.freeze({
    id: "guardian_prayer",
    name: "守護の祈り",
    description: "3ターンの間、物理ダメージを30%軽減し、\n状態異常耐性を20上昇させる。",
    actionType: "buff",
    category: "miracle",
    spCost: 8,
    target: "self",
    speedModifier: 0,
    effects: Object.freeze([{ statusId: "guardian_prayer", trigger: "perAction", guaranteed: true }])
  }),
  antidote: Object.freeze({
    id: "antidote",
    name: "アンチドート",
    description: "毒状態を回復する。\nHPは回復しない。",
    actionType: "cureStatus",
    category: "miracle",
    spCost: 3,
    target: "self",
    statusId: "poison",
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  exorcism: Object.freeze({
    id: "exorcism",
    name: "エクソシズム",
    description: "通常のアンデッドを聖なる光で浄化する。\n経験値は得られず、ボスには無効。",
    actionType: "banishUndead",
    category: "miracle",
    spCost: 5,
    target: "enemy",
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  illusion: Object.freeze({
    id: "illusion",
    name: "幻影",
    description: "3ターンの間、敵の物理命中率を20%低下。\nただし命中率は50%未満にならない。",
    actionType: "buff",
    category: "supportSpell",
    spCost: 4,
    target: "self",
    speedModifier: -5,
    effects: Object.freeze([{ statusId: "illusion", trigger: "perAction", guaranteed: true }])
  }),
  fireball: SPELLS.fireball,
  ice_bind: SPELLS.ice_bind
});

export function getSkill(id) {
  return SKILLS[id] || null;
}

export function getSkills(ids = []) {
  return ids.map(getSkill).filter(Boolean);
}

export const LEVEL_SKILL_UNLOCKS = Object.freeze([
  Object.freeze({ job: "priest", level: 3, skillId: "antidote" }),
  Object.freeze({ job: "priest", level: 5, skillId: "exorcism" })
]);

export function getLevelUnlockedSkillIds(job, level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return LEVEL_SKILL_UNLOCKS
    .filter(unlock => unlock.job === job && unlock.level <= normalizedLevel)
    .map(unlock => unlock.skillId);
}
