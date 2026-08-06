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
    dropItemId: "rat_tail",
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
    dropItemId: "slime_jelly",
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
    dropItemId: "rabbit_fur",
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
    dropItemId: "dead_bones",
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
  }),
  Object.freeze({
    id: "vampire_bat", name: "吸血コウモリ", imageId: "vampire_bat",
    image: "images/enemies/enemy_07.avif", race: "beast", minimumDepth: 3,
    maxHp: 30, stats: Object.freeze({ str: 6, int: 2, agi: 11, dex: 8, luc: 4 }),
    def: 4, attack: 5, experienceReward: 10, dropItemId: "bat_wing",
    futureSpecialAttackId: "life_drain",
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 15, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 20, immune: false })
    }),
    escapeRate: 0.7, surpriseRate: 0.24, surpriseRateMaximum: 0.35, isBoss: false
  }),
  Object.freeze({
    id: "bouncing_coin", name: "跳ねるコイン", imageId: "bouncing_coin",
    image: "images/enemies/enemy_08.avif", race: "construct", minimumDepth: 4,
    maxHp: 34, stats: Object.freeze({ str: 6, int: 3, agi: 8, dex: 7, luc: 10 }),
    def: 8, attack: 5, experienceReward: 12, dropGold: 40,
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 25, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 15, immune: false })
    }),
    escapeRate: 0.65, surpriseRate: 0.12, surpriseRateMaximum: 0.25, isBoss: false
  }),
  Object.freeze({
    id: "viper", name: "ヴァイパー", imageId: "viper",
    image: "images/enemies/enemy_09.avif", race: "beast", minimumDepth: 5,
    maxHp: 42, stats: Object.freeze({ str: 8, int: 2, agi: 10, dex: 9, luc: 5 }),
    def: 5, attack: 7, experienceReward: 14, dropItemId: "snake_skin",
    specialAttack: Object.freeze({
      id: "poison_bite", name: "毒の牙", usageRate: 0.3,
      effects: Object.freeze([Object.freeze({
        statusId: "poison", statusKind: "physical", baseRate: 0.55, trigger: "firstHitOnly"
      })])
    }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 20, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 15, immune: false })
    }),
    escapeRate: 0.6, surpriseRate: 0.22, surpriseRateMaximum: 0.35, isBoss: false
  }),
  Object.freeze({
    id: "mimic", name: "ミミック", imageId: "mimic",
    image: "images/enemies/enemy_05.avif", race: "construct", randomEncounter: false,
    maxHp: 60, stats: Object.freeze({ str: 10, int: 3, agi: 6, dex: 8, luc: 7 }),
    def: 9, attack: 8, experienceReward: 20, dropProfile: "blackChest",
    actions: Object.freeze([
      Object.freeze({ weight: 65, action: Object.freeze({ id: "mimic_attack", name: "攻撃",
        actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 35, when: Object.freeze({ hpRateBelow: 0.5 }), action: Object.freeze({
        id: "killer_bite", name: "キラーバイト", actionType: "physicalAttack", hitCount: 1,
        powerPerHit: 1.15, effects: Object.freeze([Object.freeze({ statusId: "bleeding",
          trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2 })])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 0, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 35, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 25, immune: false })
    }),
    escapeRate: 0.5, surpriseRate: 0, surpriseRateMaximum: 0, isBoss: false
  })
]);

export function getEnemyById(id) {
  return enemies.find(enemy => enemy.id === id) || null;
}

export function getRandomEnemy({ depth = 1, rng = Math.random } = {}) {
  const available = enemies.filter(enemy =>
    enemy.randomEncounter !== false && (!enemy.minimumDepth || enemy.minimumDepth <= depth)
  );
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
    actions: structuredClone(enemy.actions || []),
    experienceReward: enemy.experienceReward,
    dropItemId: enemy.dropItemId || null,
    dropGold: Math.max(0, Math.floor(Number(enemy.dropGold) || 0)),
    dropProfile: enemy.dropProfile || "",
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
