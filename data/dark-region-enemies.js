const status = (resistancePoints, immune = false) => Object.freeze({ resistancePoints, immune });
const action = (weight, value, when = null) => Object.freeze({
  weight,
  ...(when ? { when: Object.freeze(when) } : {}),
  action: Object.freeze(value)
});

export const darkRegionEnemies = Object.freeze([
  Object.freeze({
    id: "sensenmann", name: "ゼンゼンマン", imageId: "sensenmann", level: 90,
    image: "images/enemies/enemy_37.avif", race: "undead", minimumDepth: 90, maximumDepth: 99,
    maxHp: 1250, stats: Object.freeze({ str: 45, int: 24, agi: 29, dex: 39, luc: 28 }),
    def: 38, attack: 45, experienceReward: 2300, encounterCountRange: Object.freeze([1, 2]),
    actions: Object.freeze([
      action(55, { id: "sensenmann_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "sensenmann_scythe", name: "大鎌薙ぎ", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.25, hitBonus: -0.03, effects: Object.freeze([{ statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.3 }]) }),
      action(10, { id: "sensenmann_soul_reap", name: "魂狩り", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.65, hitBonus: -0.08, speedModifier: -5, effects: Object.freeze([{ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.25 }]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.25, ice: 1, lightning: 1, holy: 1.5, dark: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(75), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(65), speed_down: status(55) }),
    escapeRate: 0.16, surpriseRate: 0.24, surpriseRateMaximum: 0.36, isBoss: false
  }),
  Object.freeze({
    id: "wraith", name: "レイス", imageId: "wraith", level: 93,
    image: "images/enemies/enemy_38.avif", race: "undead", minimumDepth: 90, maximumDepth: 99,
    maxHp: 2600, stats: Object.freeze({ str: 28, int: 56, agi: 38, dex: 42, luc: 35 }),
    def: 36, attack: 38, experienceReward: 5200,
    actions: Object.freeze([
      action(55, { id: "wraith_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.9, effects: Object.freeze([]) }),
      action(35, { id: "wraith_lament", name: "怨嗟の波動", actionType: "spell", element: "dark", spellPower: 68, powerMultiplier: 0.9, unavoidable: true, effects: Object.freeze([{ statusId: "speed_down", trigger: "perAction", statusKind: "magical", baseRate: 0.35 }]) }),
      action(10, { id: "wraith_dead_embrace", name: "死者の抱擁", actionType: "spell", element: "dark", spellPower: 78, powerMultiplier: 1.05, unavoidable: true, speedModifier: -4, effects: Object.freeze([{ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.3 }]) }, { hpRateBelow: 0.5 })
    ]),
    physicalTypeMultipliers: Object.freeze({ blunt: 0.8, slash: 0.8, pierce: 0.8 }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 0.75, lightning: 1, holy: 1.5, dark: 0.25, arcane: 0.8 }),
    statusResistances: Object.freeze({ instant_death: status(90), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(80), speed_down: status(75) }),
    escapeRate: 0.12, surpriseRate: 0.3, surpriseRateMaximum: 0.44, isBoss: false
  }),
  Object.freeze({
    id: "will_o_wisp", name: "ウィルオーウィスプ", imageId: "will_o_wisp", level: 88,
    image: "images/enemies/enemy_39.avif", race: "spirit", minimumDepth: 90, maximumDepth: 99,
    maxHp: 500, stats: Object.freeze({ str: 12, int: 46, agi: 44, dex: 37, luc: 32 }),
    def: 22, attack: 18, experienceReward: 1200, encounterCountRange: Object.freeze([1, 3]),
    actions: Object.freeze([
      action(55, { id: "will_o_wisp_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.75, effects: Object.freeze([]) }),
      action(35, { id: "will_o_wisp_soul_flame", name: "鬼火", actionType: "spell", element: "dark", spellPower: 52, powerMultiplier: 0.8, unavoidable: true, effects: Object.freeze([]) }),
      action(10, { id: "will_o_wisp_mana_flicker", name: "魔力の揺らめき", actionType: "spDrain", spDamage: 15 }, { hpRateBelow: 0.5 })
    ]),
    physicalTypeMultipliers: Object.freeze({ blunt: 0.75, slash: 0.75, pierce: 0.75 }),
    elementMultipliers: Object.freeze({ fire: 0.75, ice: 1.25, lightning: 1, holy: 1.25, dark: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(70), poison: status(100, true), deadly_poison: status(100, true), bleeding: status(100, true), action_skip: status(45), speed_down: status(60) }),
    escapeRate: 0.28, surpriseRate: 0.32, surpriseRateMaximum: 0.46, isBoss: false
  }),
  Object.freeze({
    id: "schleipnir", name: "シュライプニール", imageId: "schleipnir", level: 96,
    image: "images/enemies/enemy_40.avif", race: "beast", minimumDepth: 90, maximumDepth: 99,
    maxHp: 4300, stats: Object.freeze({ str: 58, int: 38, agi: 45, dex: 48, luc: 36 }),
    def: 50, attack: 58, experienceReward: 7800,
    actions: Object.freeze([
      action(55, { id: "schleipnir_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "schleipnir_eight_leg_trample", name: "八脚蹂躙", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.72, hitBonus: 0.02, speedModifier: 3, effects: Object.freeze([]) }),
      action(10, { id: "schleipnir_nightmare_charge", name: "悪夢の疾走", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.8, hitBonus: -0.08, speedModifier: -3, effects: Object.freeze([{ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.35 }]) }, { hpRateBelow: 0.5 })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1.5, holy: 1.25, dark: 0.75, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(95), poison: status(85), deadly_poison: status(90), bleeding: status(80), action_skip: status(85), speed_down: status(80) }),
    escapeRate: 0.08, surpriseRate: 0.26, surpriseRateMaximum: 0.4, isBoss: false
  })
]);

const formations = Object.freeze([
  ["sensenmann"],
  ["sensenmann", "sensenmann"],
  ["wraith"],
  ["will_o_wisp"],
  ["will_o_wisp", "will_o_wisp"],
  ["will_o_wisp", "will_o_wisp", "will_o_wisp"],
  ["schleipnir"]
].map(formation => Object.freeze(formation)));

export function getDarkRegionFormationIds({ depth = 90, rng = Math.random } = {}) {
  const floor = Math.floor(Number(depth) || 90);
  if (floor < 90 || floor > 99) return [];
  const index = Math.min(formations.length - 1, Math.floor(Math.max(0, Number(rng()) || 0) * formations.length));
  return [...formations[index]];
}
