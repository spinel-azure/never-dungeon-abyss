import { SPELLS } from "./spells.js";

export const SKILLS = Object.freeze({
  armor_break: Object.freeze({
    id: "armor_break",
    name: "鎧砕き",
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
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 3,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 0.8,
    speedModifier: 15,
    effects: Object.freeze([])
  }),
  poison_blade: Object.freeze({
    id: "poison_blade",
    name: "毒刃",
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
    actionType: "buff",
    category: "miracle",
    spCost: 8,
    target: "self",
    speedModifier: 0,
    effects: Object.freeze([{ statusId: "guardian_prayer", trigger: "perAction", guaranteed: true }])
  }),
  illusion: Object.freeze({
    id: "illusion",
    name: "幻影",
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
