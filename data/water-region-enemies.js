export const waterRegionEnemies = Object.freeze([
  Object.freeze({
    id: "abyss_piranha", name: "奈落ピラニア", imageId: "abyss_piranha", level: 68,
    image: "images/enemies/enemy_29.avif", race: "beast", minimumDepth: 70, maximumDepth: 79,
    maxHp: 320, stats: Object.freeze({ str: 24, int: 7, agi: 29, dex: 28, luc: 17 }),
    def: 24, attack: 25, experienceReward: 480,
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({ id: "abyss_piranha_bite", name: "噛みつき", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 35, action: Object.freeze({ id: "abyss_piranha_latch", name: "食らいつく", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.55, hitBonus: 0.02, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 20, action: Object.freeze({ id: "abyss_piranha_rend", name: "引き裂く", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.1, effects: Object.freeze([Object.freeze({ statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.25 })]) }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1.5, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 25, immune: false }), bleeding: Object.freeze({ resistancePoints: 15, immune: false }), action_skip: Object.freeze({ resistancePoints: 35, immune: false }), speed_down: Object.freeze({ resistancePoints: 40, immune: false }) }),
    escapeRate: 0.32, surpriseRate: 0.24, surpriseRateMaximum: 0.34, isBoss: false
  }),
  Object.freeze({
    id: "abgrund_aal", name: "アプグルントアール", imageId: "abgrund_aal", level: 72,
    image: "images/enemies/enemy_30.avif", race: "beast", minimumDepth: 74, maximumDepth: 79,
    maxHp: 900, stats: Object.freeze({ str: 27, int: 34, agi: 28, dex: 27, luc: 22 }),
    def: 31, attack: 33, experienceReward: 1500,
    actions: Object.freeze([
      Object.freeze({ weight: 40, action: Object.freeze({ id: "abgrund_aal_bite", name: "噛みつき", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 35, action: Object.freeze({ id: "abgrund_aal_charged_fang", name: "帯電牙", actionType: "physicalAttack", element: "lightning", hitCount: 1, powerPerHit: 1.05, effects: Object.freeze([Object.freeze({ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2 })]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "abgrund_aal_discharge", name: "放電", actionType: "spell", element: "lightning", spellPower: 20, powerMultiplier: 0.8, unavoidable: true, speedModifier: -1, effects: Object.freeze([Object.freeze({ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "magical", baseRate: 0.25 })]) }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1.5, lightning: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 45, immune: false }), bleeding: Object.freeze({ resistancePoints: 45, immune: false }), action_skip: Object.freeze({ resistancePoints: 75, immune: false }), speed_down: Object.freeze({ resistancePoints: 65, immune: false }) }),
    escapeRate: 0.24, surpriseRate: 0.22, surpriseRateMaximum: 0.34, isBoss: false
  }),
  Object.freeze({
    id: "abgrund_krabbe", name: "アプグルントクラッベ", imageId: "abgrund_krabbe", level: 71,
    image: "images/enemies/enemy_31.avif", race: "beast", minimumDepth: 72, maximumDepth: 79,
    maxHp: 1250, stats: Object.freeze({ str: 38, int: 10, agi: 13, dex: 25, luc: 20 }),
    def: 48, attack: 39, experienceReward: 1800,
    actions: Object.freeze([
      Object.freeze({ weight: 35, action: Object.freeze({ id: "abgrund_krabbe_pincer", name: "ハサミ", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "abgrund_krabbe_great_pincer", name: "大鋏", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.45, hitBonus: -0.08, speedModifier: -5, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "abgrund_krabbe_pincer_combo", name: "挟撃", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.7, hitBonus: -0.02, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 15, action: Object.freeze({ id: "abgrund_krabbe_shell_guard", name: "甲殻防御", actionType: "guard", speedModifier: 4 }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 0.75, lightning: 1.25, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 75, immune: false }), bleeding: Object.freeze({ resistancePoints: 100, immune: true }), action_skip: Object.freeze({ resistancePoints: 75, immune: false }), speed_down: Object.freeze({ resistancePoints: 55, immune: false }) }),
    escapeRate: 0.18, surpriseRate: 0.14, surpriseRateMaximum: 0.28, isBoss: false
  }),
  Object.freeze({
    id: "abyss_giant_catfish", name: "奈落オオナマズ", imageId: "abyss_giant_catfish", level: 75,
    image: "images/enemies/enemy_32.avif", race: "beast", minimumDepth: 76, maximumDepth: 79,
    maxHp: 1800, stats: Object.freeze({ str: 41, int: 26, agi: 14, dex: 23, luc: 24 }),
    def: 34, attack: 41, experienceReward: 2200,
    actions: Object.freeze([
      Object.freeze({ weight: 35, action: Object.freeze({ id: "abyss_giant_catfish_bite", name: "噛みつき", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "abyss_giant_catfish_great_mouth", name: "大口", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.45, hitBonus: -0.08, speedModifier: -5, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 20, action: Object.freeze({ id: "abyss_giant_catfish_swallow", name: "丸呑み", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.15, hitBonus: -0.03, effects: Object.freeze([Object.freeze({ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.25 })]) }) }),
      Object.freeze({ weight: 20, action: Object.freeze({ id: "abyss_giant_catfish_muddy_stream", name: "濁流", actionType: "spell", element: "arcane", spellPower: 24, powerMultiplier: 0.85, unavoidable: true, speedModifier: -3, effects: Object.freeze([Object.freeze({ statusId: "speed_down", trigger: "firstHitOnly", statusKind: "magical", baseRate: 0.25 })]) }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1.5, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 75, immune: false }), bleeding: Object.freeze({ resistancePoints: 75, immune: false }), action_skip: Object.freeze({ resistancePoints: 65, immune: false }), speed_down: Object.freeze({ resistancePoints: 60, immune: false }) }),
    escapeRate: 0.16, surpriseRate: 0.18, surpriseRateMaximum: 0.3, isBoss: false
  })
]);

const formations = Object.freeze({
  early: Object.freeze([["abyss_piranha"], ["abyss_piranha", "abyss_piranha"]].map(Object.freeze)),
  crab: Object.freeze([["abyss_piranha"], ["abyss_piranha", "abyss_piranha"], ["abyss_piranha", "abyss_piranha", "abyss_piranha"], ["abgrund_krabbe"]].map(Object.freeze)),
  eel: Object.freeze([["abyss_piranha", "abyss_piranha"], ["abyss_piranha", "abyss_piranha", "abyss_piranha"], ["abgrund_aal"], ["abgrund_krabbe"]].map(Object.freeze)),
  deep: Object.freeze([["abyss_piranha"], ["abyss_piranha", "abyss_piranha"], ["abyss_piranha", "abyss_piranha", "abyss_piranha"], ["abgrund_aal"], ["abgrund_krabbe"], ["abyss_giant_catfish"]].map(Object.freeze)),
  mixed: Object.freeze([["abyss_piranha"], ["abgrund_aal"], ["abgrund_krabbe"], ["abyss_giant_catfish"], ["abyss_piranha", "abyss_piranha", "abgrund_aal"], ["abyss_piranha", "abyss_piranha", "abgrund_krabbe"]].map(Object.freeze))
});

export function getWaterRegionFormationIds({ depth = 70, rng = Math.random } = {}) {
  const floor = Math.max(70, Math.min(79, Math.floor(Number(depth) || 70)));
  const pool = floor <= 71 ? formations.early : floor <= 73 ? formations.crab : floor <= 75 ? formations.eel : floor === 78 ? formations.mixed : formations.deep;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Number(rng()) || 0) * pool.length));
  return [...pool[index]];
}
