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
    experienceReward: enemy.experienceReward,
    escapeRate: enemy.escapeRate,
    statuses: [],
    elementMultipliers: { ...(enemy.elementMultipliers || {}) },
    statusResistances: structuredClone(enemy.statusResistances || {}),
    isBoss: Boolean(enemy.isBoss),
    alive: true
  };
}
