const status = (resistancePoints, immune = false) => Object.freeze({ resistancePoints, immune });
const action = (weight, value, when = null) => Object.freeze({ weight, ...(when ? { when: Object.freeze(when) } : {}), action: Object.freeze(value) });

export const crystalRegionEnemies = Object.freeze([
  Object.freeze({
    id: "abyss_crystal_beetle", name: "奈落水晶虫", imageId: "abyss_crystal_beetle", level: 78,
    image: "images/enemies/enemy_33.avif", race: "insect", minimumDepth: 80, maximumDepth: 88,
    maxHp: 620, stats: Object.freeze({ str: 29, int: 10, agi: 25, dex: 27, luc: 20 }),
    def: 43, attack: 31, experienceReward: 800, encounterCountRange: Object.freeze([1, 3]),
    actions: Object.freeze([
      action(45, { id: "crystal_beetle_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }),
      action(35, { id: "crystal_beetle_charge", name: "水晶の体当たり", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.2, hitBonus: -0.02, effects: Object.freeze([]) }),
      action(20, { id: "crystal_beetle_guard", name: "結晶防御", actionType: "buff", effects: Object.freeze([{ statusId: "crystal_defense", trigger: "perAction", guaranteed: true }]) })
    ]),
    physicalTypeMultipliers: Object.freeze({ blunt: 1.35, slash: 0.85, pierce: 0.85 }),
    crackTrait: Object.freeze({ baseRate: 0.25, bluntRate: 0.55, statusId: "crystal_cracked" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 1, holy: 1, dark: 1, arcane: 1 }),
    statusResistances: Object.freeze({ poison: status(60), deadly_poison: status(70), bleeding: status(90), action_skip: status(50), speed_down: status(55) }),
    escapeRate: 0.2, surpriseRate: 0.16, surpriseRateMaximum: 0.3, isBoss: false
  }),
  Object.freeze({
    id: "prism_moth", name: "プリズムモス", imageId: "prism_moth", level: 80,
    image: "images/enemies/enemy_34.avif", race: "insect", minimumDepth: 82, maximumDepth: 88,
    maxHp: 520, stats: Object.freeze({ str: 18, int: 42, agi: 38, dex: 35, luc: 27 }),
    def: 24, attack: 23, experienceReward: 1450,
    actions: Object.freeze([
      action(35, { id: "prism_moth_attack", name: "攻撃", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.85, effects: Object.freeze([]) }),
      action(28, { id: "prism_scales", name: "鱗粉", actionType: "spell", element: "arcane", spellPower: 0, powerMultiplier: 0, unavoidable: true, effects: Object.freeze([{ statusId: "crystal_accuracy_down", trigger: "perAction", statusKind: "magical", baseRate: 0.65 }]) }),
      action(27, { id: "refracted_ray", name: "屈折光線", actionType: "spell", element: "arcane", spellPower: 56, powerMultiplier: 0.9, unavoidable: true, effects: Object.freeze([]) }),
      action(10, { id: "dazzling_wings", name: "幻惑の羽ばたき", actionType: "spell", element: "arcane", spellPower: 0, powerMultiplier: 0, unavoidable: true, effects: Object.freeze([{ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.23 }]) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.65, lightning: 1, holy: 0.65, dark: 1, arcane: 1 }),
    statusResistances: Object.freeze({ poison: status(40), deadly_poison: status(50), bleeding: status(35), action_skip: status(40), speed_down: status(60) }),
    escapeRate: 0.24, surpriseRate: 0.3, surpriseRateMaximum: 0.42, isBoss: false
  }),
  Object.freeze({
    id: "amethyst_golem", name: "アメジストゴーレム", imageId: "amethyst_golem", level: 84,
    image: "images/enemies/enemy_35.avif", race: "construct", minimumDepth: 84, maximumDepth: 88,
    maxHp: 2800, stats: Object.freeze({ str: 48, int: 12, agi: 9, dex: 29, luc: 23 }),
    def: 55, attack: 50, experienceReward: 3600,
    actions: Object.freeze([
      action(35, { id: "crystal_fist", name: "水晶拳", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.25, effects: Object.freeze([]) }),
      action(22, { id: "golem_stomp", name: "踏み潰し", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.75, hitBonus: -0.14, speedModifier: -8, effects: Object.freeze([]) }),
      action(18, { id: "golem_crystallize", name: "結晶化", actionType: "buff", effects: Object.freeze([{ statusId: "crystal_defense", trigger: "perAction", guaranteed: true }]) }),
      action(25, { id: "crystal_fragments", name: "水晶破片", actionType: "physicalAttack", hitCountRange: Object.freeze([2, 3]), powerPerHit: 0.5, hitBonus: -0.03, effects: Object.freeze([]) })
    ]),
    resonanceTrait: Object.freeze({ element: "lightning", rate: 0.45, statusId: "resonance_collapse" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 0.65, lightning: 1.5, holy: 1, dark: 1, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(100, true), poison: status(90), deadly_poison: status(95), bleeding: status(95), action_skip: status(80), speed_down: status(75) }),
    escapeRate: 0.1, surpriseRate: 0.08, surpriseRateMaximum: 0.2, isBoss: false
  }),
  Object.freeze({
    id: "crystal_mimic", name: "クリスタルミミック", imageId: "crystal_mimic", level: 85,
    image: "images/enemies/enemy_36.avif", race: "aberration", minimumDepth: 86, maximumDepth: 88,
    maxHp: 2100, stats: Object.freeze({ str: 43, int: 35, agi: 27, dex: 39, luc: 30 }),
    def: 38, attack: 44, experienceReward: 3200,
    actions: Object.freeze([
      action(34, { id: "crystal_fang", name: "水晶牙", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1.15, effects: Object.freeze([{ statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.35 }]) }),
      action(31, { id: "fragment_buckshot", name: "破片散弾", actionType: "physicalAttack", hitCountRange: Object.freeze([3, 5]), powerPerHit: 0.34, hitBonus: -0.04, effects: Object.freeze([]) }),
      action(35, { id: "mana_absorption", name: "魔力吸収", actionType: "spDrain", spDamage: 12 })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: 0.5, holy: 0.65, dark: 1.5, arcane: 1 }),
    statusResistances: Object.freeze({ instant_death: status(85), poison: status(65), deadly_poison: status(75), bleeding: status(70), action_skip: status(80), speed_down: status(65) }),
    escapeRate: 0.12, surpriseRate: 0.34, surpriseRateMaximum: 0.48, isBoss: false
  })
]);

const formations = Object.freeze({
  early: Object.freeze([["abyss_crystal_beetle"], ["abyss_crystal_beetle", "abyss_crystal_beetle"], ["abyss_crystal_beetle", "abyss_crystal_beetle", "abyss_crystal_beetle"]].map(Object.freeze)),
  middle: Object.freeze([["abyss_crystal_beetle"], ["abyss_crystal_beetle", "abyss_crystal_beetle"], ["prism_moth"], ["abyss_crystal_beetle", "abyss_crystal_beetle", "prism_moth"]].map(Object.freeze)),
  deep: Object.freeze([["abyss_crystal_beetle", "abyss_crystal_beetle"], ["prism_moth"], ["amethyst_golem"], ["amethyst_golem", "prism_moth"], ["abyss_crystal_beetle", "amethyst_golem"]].map(Object.freeze)),
  final: Object.freeze([["abyss_crystal_beetle", "abyss_crystal_beetle", "prism_moth"], ["prism_moth", "prism_moth"], ["amethyst_golem"], ["crystal_mimic"], ["abyss_crystal_beetle", "abyss_crystal_beetle", "crystal_mimic"], ["amethyst_golem", "abyss_crystal_beetle", "abyss_crystal_beetle"]].map(Object.freeze))
});

export function getCrystalRegionFormationIds({ depth = 80, rng = Math.random } = {}) {
  const floor = Math.max(80, Math.min(88, Math.floor(Number(depth) || 80)));
  const pool = floor <= 81 ? formations.early : floor <= 83 ? formations.middle : floor <= 85 ? formations.deep : formations.final;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Number(rng()) || 0) * pool.length));
  return [...pool[index]];
}
