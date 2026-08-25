const status = (resistancePoints, immune = false) => Object.freeze({ resistancePoints, immune });
const action = (weight, value, when = null) => Object.freeze({
  weight,
  ...(when ? { when: Object.freeze(when) } : {}),
  action: Object.freeze(value)
});

export const magicRegionEnemies = Object.freeze([
  Object.freeze({
    id: "junghexe", name: "ユングヘクセ", imageId: "junghexe", level: 18,
    image: "images/enemies/enemy_45.avif", battleSize: "medium", race: "human",
    minimumDepth: 10, maximumDepth: 19, maxHp: 165,
    stats: Object.freeze({ str: 10, int: 20, agi: 14, dex: 16, luc: 13 }),
    def: 12, attack: 13, experienceReward: 120, encounterCountRange: Object.freeze([1, 1]),
    actions: Object.freeze([
      action(55, { id: "junghexe_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.85, effects: Object.freeze([]) }),
      action(35, { id: "junghexe_witch_flame", name: "魔女の火", actionType: "spell", element: "fire", spellPower: 20, powerMultiplier: 0.9, effects: Object.freeze([{ statusId: "speed_down", trigger: "perAction", statusKind: "magical", baseRate: 0.25 }]) }),
      action(10, { id: "junghexe_curse", name: "若き魔女の呪詛", actionType: "spell", element: "dark", spellPower: 24, powerMultiplier: 1, speedModifier: -2, effects: Object.freeze([{ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.25 }]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 0.75, ice: 1.25, lightning: 1, holy: 1, dark: 0.75, arcane: 0.75 }),
    statusResistances: Object.freeze({ instant_death: status(35), poison: status(45), deadly_poison: status(55), bleeding: status(30), action_skip: status(45), speed_down: status(50) }),
    escapeRate: 0.34, surpriseRate: 0.22, surpriseRateMaximum: 0.34, isBoss: false
  }),
  Object.freeze({
    id: "merseburg_spell", name: "メルゼブルクの呪文", imageId: "merseburg_spell", level: 14,
    image: "images/enemies/enemy_46.avif", battleSize: "small", race: "spirit",
    minimumDepth: 10, maximumDepth: 19, maxHp: 58,
    stats: Object.freeze({ str: 5, int: 17, agi: 17, dex: 14, luc: 12 }),
    def: 8, attack: 8, experienceReward: 45, encounterCountRange: Object.freeze([1, 3]),
    actions: Object.freeze([
      action(55, { id: "merseburg_spell_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.7, effects: Object.freeze([]) }),
      action(35, { id: "merseburg_spell_chant", name: "古き呪文", actionType: "spell", element: "arcane", spellPower: 16, powerMultiplier: 0.85, unavoidable: true, effects: Object.freeze([]) }),
      action(10, { id: "merseburg_spell_mana_bind", name: "魔力縛り", actionType: "spDrain", spDamage: 6 }, { hpRateBelow: 0.5 })
    ]),
    physicalTypeMultipliers: Object.freeze({ blunt: 0.85, slash: 0.85, pierce: 0.85 }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1, holy: 1.25, dark: 0.75, arcane: 0.5 }),
    statusResistances: Object.freeze({ instant_death: status(50), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(35), speed_down: status(45) }),
    escapeRate: 0.42, surpriseRate: 0.26, surpriseRateMaximum: 0.38, isBoss: false
  }),
  Object.freeze({
    id: "geistflamme", name: "ガイストフラメ", imageId: "geistflamme", level: 16,
    image: "images/enemies/enemy_47.avif", battleSize: "small", race: "spirit",
    minimumDepth: 10, maximumDepth: 19, maxHp: 66,
    stats: Object.freeze({ str: 6, int: 19, agi: 19, dex: 15, luc: 13 }),
    def: 7, attack: 9, experienceReward: 55, encounterCountRange: Object.freeze([1, 3]),
    actions: Object.freeze([
      action(55, { id: "geistflamme_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.75, effects: Object.freeze([]) }),
      action(35, { id: "geistflamme_soul_fire", name: "魂火", actionType: "spell", element: "fire", spellPower: 18, powerMultiplier: 0.9, unavoidable: true, effects: Object.freeze([]) }),
      action(10, { id: "geistflamme_ghost_light", name: "惑わしの鬼火", actionType: "spell", element: "dark", spellPower: 19, powerMultiplier: 0.8, effects: Object.freeze([{ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.25 }]) }, { hpRateBelow: 0.5 })
    ]),
    physicalTypeMultipliers: Object.freeze({ blunt: 0.75, slash: 0.75, pierce: 0.75 }),
    elementMultipliers: Object.freeze({ fire: 0.5, ice: 1.5, lightning: 1, holy: 1.25, dark: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(55), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(40), speed_down: status(50) }),
    escapeRate: 0.38, surpriseRate: 0.28, surpriseRateMaximum: 0.4, isBoss: false
  }),
  Object.freeze({
    id: "tanzlichter", name: "タンツロイヒター", imageId: "tanzlichter", level: 12,
    image: "images/enemies/enemy_48.avif", battleSize: "small", race: "spirit",
    minimumDepth: 10, maximumDepth: 19, maxHp: 48,
    stats: Object.freeze({ str: 7, int: 14, agi: 22, dex: 17, luc: 15 }),
    def: 7, attack: 9, experienceReward: 36, encounterCountRange: Object.freeze([1, 3]),
    actions: Object.freeze([
      action(55, { id: "tanzlichter_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.75, effects: Object.freeze([]) }),
      action(35, { id: "tanzlichter_light_dance", name: "灯火の舞", actionType: "spell", element: "arcane", spellPower: 14, powerMultiplier: 0.8, speedModifier: 3, effects: Object.freeze([{ statusId: "speed_down", trigger: "perAction", statusKind: "magical", baseRate: 0.2 }]) }),
      action(10, { id: "tanzlichter_dazzle", name: "眩惑の輪舞", actionType: "spell", element: "arcane", spellPower: 16, powerMultiplier: 0.75, effects: Object.freeze([{ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.2 }]) }, { hpRateBelow: 0.5 })
    ]),
    physicalTypeMultipliers: Object.freeze({ blunt: 0.85, slash: 0.85, pierce: 0.85 }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1.25, holy: 1.25, dark: 0.75, arcane: 0.75 }),
    statusResistances: Object.freeze({ instant_death: status(40), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(30), speed_down: status(40) }),
    escapeRate: 0.48, surpriseRate: 0.3, surpriseRateMaximum: 0.42, isBoss: false
  })
]);

import { defineEncounterFormation, selectEncounterFormationIds } from "./encounter-formations.js";

const formations = Object.freeze([
  defineEncounterFormation(["junghexe"], { minimumDepth: 10, maximumDepth: 19, weight: 18 }),
  defineEncounterFormation(["merseburg_spell"], { minimumDepth: 10, maximumDepth: 19, weight: 10 }),
  defineEncounterFormation(["merseburg_spell", "merseburg_spell"], { minimumDepth: 10, maximumDepth: 19, weight: 8 }),
  defineEncounterFormation(["merseburg_spell", "merseburg_spell", "merseburg_spell"], { minimumDepth: 10, maximumDepth: 19, weight: 5 }),
  defineEncounterFormation(["geistflamme"], { minimumDepth: 10, maximumDepth: 19, weight: 10 }),
  defineEncounterFormation(["geistflamme", "geistflamme"], { minimumDepth: 10, maximumDepth: 19, weight: 8 }),
  defineEncounterFormation(["geistflamme", "geistflamme", "geistflamme"], { minimumDepth: 10, maximumDepth: 19, weight: 5 }),
  defineEncounterFormation(["tanzlichter"], { minimumDepth: 10, maximumDepth: 19, weight: 12 }),
  defineEncounterFormation(["tanzlichter", "tanzlichter"], { minimumDepth: 10, maximumDepth: 19, weight: 9 }),
  defineEncounterFormation(["tanzlichter", "tanzlichter", "tanzlichter"], { minimumDepth: 10, maximumDepth: 19, weight: 5 })
]);

export function getMagicRegionFormationIds({ depth = 10, flags = {}, rng = Math.random } = {}) {
  return selectEncounterFormationIds(formations, { depth, flags, rng });
}
