const status = (resistancePoints, immune = false) => Object.freeze({ resistancePoints, immune });
const action = (weight, value, when = null) => Object.freeze({
  weight,
  ...(when ? { when: Object.freeze(when) } : {}),
  action: Object.freeze(value)
});

export const tortureRegionEnemies = Object.freeze([
  Object.freeze({
    id: "morgenstern", name: "モルゲンシュテルン", imageId: "morgenstern", level: 21,
    image: "images/enemies/enemy_44.avif", race: "construct", minimumDepth: 20, maximumDepth: 29,
    maxHp: 105, stats: Object.freeze({ str: 16, int: 3, agi: 18, dex: 17, luc: 9 }),
    def: 15, attack: 15, experienceReward: 120, encounterCountRange: Object.freeze([1, 3]),
    actions: Object.freeze([
      action(55, { id: "morgenstern_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "morgenstern_swing", name: "鉄球旋回", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.62, hitBonus: -0.03, effects: Object.freeze([]) }),
      action(10, { id: "morgenstern_spike_rush", name: "棘球乱舞", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.78, hitBonus: -0.05, effects: Object.freeze([{ statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.3 }]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 0.75, ice: 0.75, lightning: 1.25, holy: 1, dark: 1, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(55), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(45), speed_down: status(60) }),
    escapeRate: 0.48, surpriseRate: 0.25, surpriseRateMaximum: 0.38, isBoss: false
  }),
  Object.freeze({
    id: "inquisitorin", name: "インクイジトーリン", imageId: "inquisitorin", level: 23,
    image: "images/enemies/enemy_41.avif", race: "human", minimumDepth: 20, maximumDepth: 29,
    maxHp: 165, stats: Object.freeze({ str: 18, int: 13, agi: 16, dex: 19, luc: 12 }),
    def: 16, attack: 17, experienceReward: 190, encounterCountRange: Object.freeze([1, 2]),
    actions: Object.freeze([
      action(55, { id: "inquisitorin_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "inquisitorin_whip", name: "苛烈な鞭", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.66, hitBonus: 0.03, effects: Object.freeze([]) }),
      action(10, { id: "inquisitorin_heresy_pierce", name: "異端穿ち", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.35, ignoresDefense: true, speedModifier: -2, effects: Object.freeze([]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1, holy: 0.75, dark: 1.25, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(45), poison: status(35), deadly_poison: status(45), bleeding: status(30), action_skip: status(45), speed_down: status(40) }),
    escapeRate: 0.4, surpriseRate: 0.22, surpriseRateMaximum: 0.35, isBoss: false
  }),
  Object.freeze({
    id: "folterzange", name: "フォルターツァンゲ", imageId: "folterzange", level: 25,
    image: "images/enemies/enemy_42.avif", race: "human", minimumDepth: 22, maximumDepth: 29,
    maxHp: 235, stats: Object.freeze({ str: 22, int: 7, agi: 13, dex: 18, luc: 11 }),
    def: 20, attack: 20, experienceReward: 280, encounterCountRange: Object.freeze([1, 2]),
    actions: Object.freeze([
      action(55, { id: "folterzange_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "folterzange_pincers", name: "拷問鉗子", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.25, hitBonus: -0.02, effects: Object.freeze([]) }),
      action(10, { id: "folterzange_confession", name: "自白強要", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.45, hitBonus: -0.06, speedModifier: -3, effects: Object.freeze([{ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.3 }]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1, holy: 1, dark: 1, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(55), poison: status(45), deadly_poison: status(55), bleeding: status(45), action_skip: status(60), speed_down: status(50) }),
    escapeRate: 0.32, surpriseRate: 0.2, surpriseRateMaximum: 0.32, isBoss: false
  }),
  Object.freeze({
    id: "folterpanzer", name: "フォルターパンツァー", imageId: "folterpanzer", level: 28,
    image: "images/enemies/enemy_43.avif", race: "construct", minimumDepth: 25, maximumDepth: 29,
    maxHp: 430, stats: Object.freeze({ str: 27, int: 3, agi: 7, dex: 15, luc: 8 }),
    def: 27, attack: 24, experienceReward: 480,
    actions: Object.freeze([
      action(55, { id: "folterpanzer_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "folterpanzer_crush", name: "車輪轢き", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.72, hitBonus: -0.04, speedModifier: -2, effects: Object.freeze([]) }),
      action(10, { id: "folterpanzer_blood_road", name: "血塗れの轍", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.65, hitBonus: -0.08, speedModifier: -5, effects: Object.freeze([{ statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.4 }]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 0.75, ice: 0.75, lightning: 1.25, holy: 1, dark: 1, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(100, true), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(80), speed_down: status(70) }),
    escapeRate: 0.18, surpriseRate: 0.16, surpriseRateMaximum: 0.28, isBoss: false
  })
]);

import { defineEncounterFormation, selectEncounterFormationIds } from "./encounter-formations.js";

const formations = Object.freeze([
  defineEncounterFormation(["morgenstern"], { minimumDepth: 20, maximumDepth: 29 }, 7),
  defineEncounterFormation(["morgenstern", "morgenstern"], { minimumDepth: 20, maximumDepth: 29 }, 5),
  defineEncounterFormation(["morgenstern", "morgenstern", "morgenstern"], { minimumDepth: 23, maximumDepth: 29 }, 2),
  defineEncounterFormation(["inquisitorin"], { minimumDepth: 20, maximumDepth: 29 }, 6),
  defineEncounterFormation(["inquisitorin", "inquisitorin"], { minimumDepth: 24, maximumDepth: 29 }, 2),
  defineEncounterFormation(["folterzange"], { minimumDepth: 22, maximumDepth: 29 }, 6),
  defineEncounterFormation(["folterzange", "folterzange"], { minimumDepth: 26, maximumDepth: 29 }, 2),
  defineEncounterFormation(["folterpanzer"], { minimumDepth: 25, maximumDepth: 29 }, 5),
  defineEncounterFormation(["morgenstern", "inquisitorin"], { minimumDepth: 23, maximumDepth: 29 }, 3),
  defineEncounterFormation(["morgenstern", "folterzange"], { minimumDepth: 25, maximumDepth: 29 }, 3)
]);

export function getTortureRegionFormationIds({ depth = 20, flags = {}, rng = Math.random } = {}) {
  return selectEncounterFormationIds(formations, { depth, flags, rng });
}
