export const enemies = Object.freeze([
  Object.freeze({
    id: "abyss_rat",
    name: "奈落ネズミ",
    imageId: "abyss_rat",
    image: "images/enemies/enemy_01.avif",
    race: "beast",
    maxHp: 20,
    stats: Object.freeze({ str: 5, int: 1, agi: 5, dex: 4, luc: 2 }),
    def: 4,
    attack: 4,
    experienceReward: 4,
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 10, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 0, immune: false })
    }),
    escapeRate: 0.75,
    surpriseRate: 0.15,
    surpriseRateMaximum: 0.3,
    isBoss: false
  }),
  Object.freeze({
    id: "cave_slime",
    name: "洞窟スライム",
    imageId: "cave_slime",
    image: "images/enemies/enemy_02.avif",
    race: "slime",
    maxHp: 24,
    stats: Object.freeze({ str: 4, int: 2, agi: 2, dex: 3, luc: 3 }),
    def: 5,
    attack: 3,
    experienceReward: 6,
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 40, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 20, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 0, immune: false })
    }),
    escapeRate: 0.8,
    surpriseRate: 0.1,
    surpriseRateMaximum: 0.25,
    isBoss: false
  }),
  Object.freeze({
    id: "abyss_rabbit",
    name: "奈落ウサギ",
    imageId: "abyss_rabbit",
    image: "images/enemies/enemy_04.avif",
    race: "beast",
    minimumDepth: 2,
    maxHp: 28,
    stats: Object.freeze({ str: 6, int: 2, agi: 9, dex: 7, luc: 4 }),
    def: 3,
    attack: 5,
    experienceReward: 8,
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 10, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 10, immune: false })
    }),
    escapeRate: 0.7,
    surpriseRate: 0.22,
    surpriseRateMaximum: 0.35,
    isBoss: false
  }),
  Object.freeze({
    id: "wandering_dead",
    name: "さまよう亡者",
    imageId: "wandering_dead",
    image: "images/enemies/enemy_03.avif",
    race: "undead",
    minimumDepth: 2,
    maxHp: 36,
    stats: Object.freeze({ str: 7, int: 3, agi: 2, dex: 5, luc: 2 }),
    def: 6,
    attack: 6,
    experienceReward: 10,
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 30, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 20, immune: false })
    }),
    escapeRate: 0.65,
    surpriseRate: 0.12,
    surpriseRateMaximum: 0.25,
    isBoss: false
  }),
  Object.freeze({
    id: "poison_slime",
    name: "ポイズンスライム",
    imageId: "poison_slime",
    image: "images/enemies/enemy_06.avif",
    race: "slime",
    minimumDepth: 2,
    maxHp: 32,
    stats: Object.freeze({ str: 5, int: 3, agi: 3, dex: 5, luc: 4 }),
    def: 6,
    attack: 4,
    experienceReward: 9,
    specialAttack: Object.freeze({
      id: "poison_attack",
      name: "毒攻撃",
      usageRate: 0.25,
      effects: Object.freeze([Object.freeze({
        statusId: "poison",
        statusKind: "physical",
        baseRate: 0.6,
        trigger: "firstHitOnly"
      })])
    }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 30, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 10, immune: false })
    }),
    escapeRate: 0.7,
    surpriseRate: 0.1,
    surpriseRateMaximum: 0.25,
    isBoss: false
  })
]);

export function getEnemyById(id) {
  return enemies.find(enemy => enemy.id === id) || null;
}

export function getRandomEnemy({ depth = 1, rng = Math.random } = {}) {
  const available = enemies.filter(enemy => !enemy.minimumDepth || enemy.minimumDepth <= depth);
  const index = Math.min(
    available.length - 1,
    Math.floor(Math.max(0, Number(rng()) || 0) * available.length)
  );
  return available[index] || enemies[0];
}

export function createEnemyCombatant(enemy) {
  return {
    id: enemy.id,
    name: enemy.name,
    image: enemy.image,
    race: enemy.race || "unknown",
    hp: enemy.maxHp,
    maxHp: enemy.maxHp,
    sp: 0,
    maxSp: 0,
    stats: { ...enemy.stats },
    def: enemy.def,
    baseDef: enemy.def,
    attack: enemy.attack,
    specialAttack: structuredClone(enemy.specialAttack || null),
    experienceReward: enemy.experienceReward,
    escapeRate: enemy.escapeRate,
    surpriseRate: enemy.surpriseRate,
    surpriseRateMaximum: enemy.surpriseRateMaximum,
    ignoreNormalSurpriseCap: Boolean(enemy.ignoreNormalSurpriseCap),
    statuses: [],
    elementMultipliers: { ...(enemy.elementMultipliers || {}) },
    statusResistances: structuredClone(enemy.statusResistances || {}),
    isBoss: Boolean(enemy.isBoss),
    alive: true
  };
}
