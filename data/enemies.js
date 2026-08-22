import { getWaterRegionFormationIds, waterRegionEnemies } from "./water-region-enemies.js";
import { crystalRegionEnemies, getCrystalRegionFormationIds } from "./crystal-region-enemies.js";

export const enemies = Object.freeze([
  Object.freeze({
    id: "abyss_rat",
    name: "奈落ネズミ",
    level: 1,
    imageId: "abyss_rat",
    image: "images/enemies/enemy_01.avif",
    race: "beast",
    maximumDepth: 10,
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
    level: 2,
    imageId: "cave_slime",
    image: "images/enemies/enemy_02.avif",
    race: "slime",
    maximumDepth: 10,
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
    level: 3,
    imageId: "abyss_rabbit",
    image: "images/enemies/enemy_04.avif",
    race: "beast",
    minimumDepth: 2,
    maximumDepth: 10,
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
    level: 4,
    imageId: "wandering_dead",
    image: "images/enemies/enemy_03.avif",
    race: "undead",
    minimumDepth: 2,
    maximumDepth: 10,
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
    level: 3,
    imageId: "poison_slime",
    image: "images/enemies/enemy_06.avif",
    race: "slime",
    minimumDepth: 2,
    maximumDepth: 10,
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
    level: 5,
    image: "images/enemies/enemy_07.avif", race: "beast", minimumDepth: 3,
    maximumDepth: 10,
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
    level: 6,
    image: "images/enemies/enemy_08.avif", race: "construct", minimumDepth: 4,
    maximumDepth: 10,
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
    level: 7,
    image: "images/enemies/enemy_09.avif", race: "beast", minimumDepth: 5,
    maximumDepth: 10,
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
    id: "giant_spider", name: "ジャイアントスパイダー", imageId: "giant_spider",
    level: 12,
    image: "images/enemies/enemy_10.avif", race: "beast", minimumDepth: 11, maximumDepth: 29,
    maxHp: 72, stats: Object.freeze({ str: 11, int: 3, agi: 13, dex: 12, luc: 6 }),
    def: 8, attack: 10, experienceReward: 40, dropItemId: "spider_silk",
    specialAttack: Object.freeze({
      id: "binding_web", name: "蜘蛛糸", usageRate: 0.3,
      effects: Object.freeze([Object.freeze({
        statusId: "action_skip", statusKind: "physical", baseRate: 0.45, trigger: "firstHitOnly"
      })])
    }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 30, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 20, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 20, immune: false })
    }),
    escapeRate: 0.55, surpriseRate: 0.22, surpriseRateMaximum: 0.35, isBoss: false
  }),
  Object.freeze({
    id: "wasp", name: "ワスプ", imageId: "wasp",
    level: 15,
    image: "images/enemies/enemy_11.avif", race: "beast", minimumDepth: 13, maximumDepth: 29,
    maxHp: 68, stats: Object.freeze({ str: 11, int: 3, agi: 17, dex: 15, luc: 8 }),
    def: 8, attack: 10, experienceReward: 55, dropItemId: "beeswax",
    actions: Object.freeze([Object.freeze({
      weight: 100,
      action: Object.freeze({
        id: "wasp_double_attack", name: "連続攻撃", actionType: "physicalAttack",
        hitCount: 2, powerPerHit: 0.75, effects: Object.freeze([])
      })
    })]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 50, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 15, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 35, immune: false })
    }),
    escapeRate: 0.5, surpriseRate: 0.27, surpriseRateMaximum: 0.4, isBoss: false
  }),
  Object.freeze({
    id: "poison_toad", name: "ポイズントード", imageId: "poison_toad",
    level: 18,
    image: "images/enemies/enemy_12.avif", race: "beast", minimumDepth: 16, maximumDepth: 29,
    maxHp: 108, stats: Object.freeze({ str: 14, int: 5, agi: 7, dex: 12, luc: 7 }),
    def: 11, attack: 13, experienceReward: 75, dropItemId: "poison_toad_skin",
    specialAttack: Object.freeze({
      id: "venom_spray", name: "毒液", usageRate: 0.35,
      effects: Object.freeze([Object.freeze({
        statusId: "poison", statusKind: "physical", baseRate: 0.65, trigger: "firstHitOnly"
      })])
    }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 30, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 10, immune: false })
    }),
    escapeRate: 0.55, surpriseRate: 0.12, surpriseRateMaximum: 0.25, isBoss: false
  }),
  Object.freeze({
    id: "banshee", name: "バンシー", imageId: "banshee",
    level: 20,
    image: "images/enemies/enemy_13.avif", race: "undead", minimumDepth: 19, maximumDepth: 29,
    maxHp: 128, stats: Object.freeze({ str: 12, int: 15, agi: 14, dex: 14, luc: 10 }),
    def: 12, attack: 14, experienceReward: 100,
    specialAttack: Object.freeze({
      id: "banshee_wail", name: "泣き叫ぶ", usageRate: 0.3,
      effects: Object.freeze([Object.freeze({
        statusId: "action_skip", statusKind: "magical", baseRate: 0.55, trigger: "firstHitOnly"
      })])
    }),
    elementMultipliers: Object.freeze({ fire: 1.25, ice: 0.75, holy: 1.5, dark: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 45, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 35, immune: false })
    }),
    escapeRate: 0.4, surpriseRate: 0.18, surpriseRateMaximum: 0.3, isBoss: false
  }),
  Object.freeze({
    id: "fire_spirit", name: "火の精霊", imageId: "fire_spirit",
    level: 23,
    image: "images/enemies/enemy_14.avif", race: "spirit", minimumDepth: 30, maximumDepth: 39,
    maxHp: 145, stats: Object.freeze({ str: 10, int: 18, agi: 17, dex: 16, luc: 12 }),
    def: 12, attack: 13, experienceReward: 140, dropItemId: "fire_spirit_stone",
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "fire_spirit_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "feuerkugel", name: "フォイヤークーゲル", actionType: "spell", element: "fire",
        spellPower: 17, powerMultiplier: 1, unavoidable: true, speedModifier: -1, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 0, ice: 1.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 45, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 50, immune: false })
    }),
    escapeRate: 0.45, surpriseRate: 0.18, surpriseRateMaximum: 0.3, isBoss: false
  }),
  Object.freeze({
    id: "fire_lizard", name: "火トカゲ", imageId: "fire_lizard",
    level: 25,
    image: "images/enemies/enemy_15.avif", race: "beast", minimumDepth: 32, maximumDepth: 39,
    maxHp: 178, stats: Object.freeze({ str: 18, int: 6, agi: 15, dex: 17, luc: 10 }),
    def: 14, attack: 16, experienceReward: 170, dropItemId: "fire_lizard_skin",
    actions: Object.freeze([
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "fire_lizard_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "flame_tail_slam", name: "尻尾叩きつけ", actionType: "physicalAttack", element: "fire",
        hitCount: 1, powerPerHit: 1.25, hitBonus: -0.03, speedModifier: -2, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 0.5, ice: 1.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 60, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 35, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 30, immune: false })
    }),
    escapeRate: 0.4, surpriseRate: 0.2, surpriseRateMaximum: 0.32, isBoss: false
  }),
  Object.freeze({
    id: "loren_lava", name: "ロレンラヴァ", imageId: "loren_lava",
    level: 27,
    image: "images/enemies/enemy_16.avif", race: "construct", minimumDepth: 35, maximumDepth: 39,
    maxHp: 225, stats: Object.freeze({ str: 22, int: 5, agi: 6, dex: 14, luc: 8 }),
    def: 18, attack: 18, experienceReward: 210, dropItemId: "lava_stone_fragment",
    actions: Object.freeze([
      Object.freeze({ weight: 60, action: Object.freeze({
        id: "loren_lava_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "direct_impact", name: "直撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.65, hitBonus: -0.1, speedModifier: -8, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 0, ice: 1.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 60, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 70, immune: false })
    }),
    escapeRate: 0.5, surpriseRate: 0.08, surpriseRateMaximum: 0.2, isBoss: false
  }),
  Object.freeze({
    id: "cassowary", name: "ヒクイドリ", imageId: "cassowary",
    level: 29,
    image: "images/enemies/enemy_17.avif", race: "beast", minimumDepth: 38, maximumDepth: 39,
    maxHp: 205, stats: Object.freeze({ str: 19, int: 15, agi: 22, dex: 20, luc: 12 }),
    def: 15, attack: 18, experienceReward: 260, dropItemId: "cassowary_feather",
    actions: Object.freeze([
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "cassowary_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "cassowary_flame_breath", name: "火炎吐き", actionType: "spell", element: "fire",
        spellPower: 19, powerMultiplier: 1.05, unavoidable: true, speedModifier: -2, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 0.5, ice: 1.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 45, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 30, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 45, immune: false })
    }),
    escapeRate: 0.35, surpriseRate: 0.26, surpriseRateMaximum: 0.38, isBoss: false
  }),
  Object.freeze({
    id: "ice_spirit", name: "氷の精霊", imageId: "ice_spirit",
    level: 32,
    image: "images/enemies/enemy_18.avif", race: "spirit", minimumDepth: 40, maximumDepth: 49,
    maxHp: 230, stats: Object.freeze({ str: 12, int: 22, agi: 20, dex: 19, luc: 14 }),
    def: 16, attack: 17, experienceReward: 320, dropItemId: "ice_spirit_stone",
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "ice_spirit_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "eiskugel", name: "アイスクーゲル", actionType: "spell", element: "ice",
        spellPower: 21, powerMultiplier: 1, unavoidable: true, speedModifier: -1, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 50, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 100, immune: true })
    }),
    escapeRate: 0.4, surpriseRate: 0.18, surpriseRateMaximum: 0.3, isBoss: false
  }),
  Object.freeze({
    id: "ice_lizard", name: "氷トカゲ", imageId: "ice_lizard",
    level: 34,
    image: "images/enemies/enemy_19.avif", race: "beast", minimumDepth: 42, maximumDepth: 49,
    maxHp: 275, stats: Object.freeze({ str: 21, int: 8, agi: 17, dex: 19, luc: 11 }),
    def: 18, attack: 20, experienceReward: 380, dropItemId: "ice_lizard_skin",
    actions: Object.freeze([
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "ice_lizard_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "frost_tail_slam", name: "尻尾叩きつけ", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.3, hitBonus: -0.03, speedModifier: -2, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 65, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 40, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0.35, surpriseRate: 0.2, surpriseRateMaximum: 0.32, isBoss: false
  }),
  Object.freeze({
    id: "ice_vogel", name: "アイスフォーゲル", imageId: "ice_vogel",
    level: 37,
    image: "images/enemies/enemy_20.avif", race: "beast", minimumDepth: 45, maximumDepth: 49,
    maxHp: 260, stats: Object.freeze({ str: 19, int: 12, agi: 25, dex: 23, luc: 15 }),
    def: 17, attack: 20, experienceReward: 470, dropItemId: "vogel_feather",
    actions: Object.freeze([
      Object.freeze({ weight: 50, action: Object.freeze({
        id: "ice_vogel_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 50, action: Object.freeze({
        id: "federschneide", name: "フェーダーシュナイデ", actionType: "physicalAttack", element: "ice",
        hitCount: 3, powerPerHit: 0.5, hitBonus: 0.02, speedModifier: 2, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 50, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 35, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 65, immune: false })
    }),
    escapeRate: 0.3, surpriseRate: 0.28, surpriseRateMaximum: 0.4, isBoss: false
  }),
  Object.freeze({
    id: "ice_bear", name: "氷熊", imageId: "ice_bear",
    level: 40,
    image: "images/enemies/enemy_21.avif", race: "beast", minimumDepth: 48, maximumDepth: 49,
    maxHp: 360, stats: Object.freeze({ str: 26, int: 7, agi: 10, dex: 18, luc: 12 }),
    def: 22, attack: 23, experienceReward: 580, dropItemId: "ice_bear_paw",
    actions: Object.freeze([
      Object.freeze({ weight: 60, action: Object.freeze({
        id: "ice_bear_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "bear_crush", name: "のしかかり", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.7, hitBonus: -0.08, speedModifier: -8, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 55, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 60, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 70, immune: false })
    }),
    escapeRate: 0.35, surpriseRate: 0.1, surpriseRateMaximum: 0.22, isBoss: false
  }),
  Object.freeze({
    id: "abyss_tiger", name: "奈落ティーガー", imageId: "abyss_tiger",
    level: 43,
    image: "images/enemies/enemy_22.avif", race: "beast", minimumDepth: 50, maximumDepth: 59,
    maxHp: 430, stats: Object.freeze({ str: 29, int: 7, agi: 24, dex: 25, luc: 15 }),
    def: 23, attack: 27, experienceReward: 680, dropItemId: "abyss_tiger_fur",
    actions: Object.freeze([
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "abyss_tiger_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "killer_bite", name: "キラーバイト", actionType: "physicalAttack", hitCount: 1,
        powerPerHit: 1.3, hitBonus: -0.02, effects: Object.freeze([Object.freeze({
          statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.3
        })])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 45, immune: false }),
      deadly_poison: Object.freeze({ resistancePoints: 45, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 40, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 45, immune: false })
    }),
    escapeRate: 0.28, surpriseRate: 0.27, surpriseRateMaximum: 0.4, isBoss: false
  }),
  Object.freeze({
    id: "abyss_panther", name: "奈落パンター", imageId: "abyss_panther",
    level: 43,
    image: "images/enemies/enemy_24.avif", race: "beast", minimumDepth: 50, maximumDepth: 59,
    maxHp: 340, stats: Object.freeze({ str: 24, int: 6, agi: 28, dex: 27, luc: 16 }),
    def: 20, attack: 24, experienceReward: 660, dropGold: 100,
    actions: Object.freeze([
      Object.freeze({ weight: 60, action: Object.freeze({
        id: "abyss_panther_attack", name: "連続攻撃", actionType: "physicalAttack",
        hitCount: 2, powerPerHit: 0.55, hitBonus: 0.02, speedModifier: 2, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "rending_claws", name: "乱れ爪", actionType: "physicalAttack",
        hitCount: 4, powerPerHit: 0.35, hitBonus: 0.01, speedModifier: 4, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 40, immune: false }),
      deadly_poison: Object.freeze({ resistancePoints: 40, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 35, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 55, immune: false })
    }),
    escapeRate: 0.25, surpriseRate: 0.3, surpriseRateMaximum: 0.42, isBoss: false
  }),
  Object.freeze({
    id: "abyss_mushroom", name: "奈落キノコ", imageId: "abyss_mushroom",
    level: 42,
    image: "images/enemies/enemy_23.avif", race: "plant", minimumDepth: 50, maximumDepth: 59,
    maxHp: 365, stats: Object.freeze({ str: 14, int: 27, agi: 12, dex: 20, luc: 18 }),
    def: 25, attack: 21, experienceReward: 640, dropItemId: "abyss_mushroom_cap",
    actions: Object.freeze([
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "abyss_mushroom_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "deadly_poison_spores", name: "猛毒", actionType: "spell", element: "physical",
        spellPower: 12, powerMultiplier: 0.65, unavoidable: true, speedModifier: -2,
        effects: Object.freeze([Object.freeze({
          statusId: "deadly_poison", trigger: "firstHitOnly", statusKind: "magical", baseRate: 0.65
        })])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      deadly_poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 55, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 65, immune: false })
    }),
    escapeRate: 0.38, surpriseRate: 0.12, surpriseRateMaximum: 0.25, isBoss: false
  }),
  Object.freeze({
    id: "abyss_lizard", name: "奈落トカゲ", imageId: "abyss_lizard",
    level: 58,
    image: "images/enemies/enemy_25.avif", race: "beast", minimumDepth: 60, maximumDepth: 69,
    encounterCountRange: Object.freeze([1, 3]),
    maxHp: 260, stats: Object.freeze({ str: 20, int: 8, agi: 25, dex: 23, luc: 14 }),
    def: 22, attack: 20, experienceReward: 360, dropItemId: "abyss_lizard_hide",
    actions: Object.freeze([
      Object.freeze({ weight: 60, action: Object.freeze({
        id: "abyss_lizard_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 0.9, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "abyss_lizard_deadly_poison", name: "猛毒", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 0.8, hitBonus: 0.03, effects: Object.freeze([Object.freeze({
          statusId: "deadly_poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.35
        })])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1.25 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 55, immune: false }),
      deadly_poison: Object.freeze({ resistancePoints: 55, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 45, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 55, immune: false })
    }),
    escapeRate: 0.3, surpriseRate: 0.2, surpriseRateMaximum: 0.32, isBoss: false
  }),
  Object.freeze({
    id: "abyss_giant_scorpion", name: "奈落オオサソリ", imageId: "abyss_giant_scorpion",
    level: 62,
    image: "images/enemies/enemy_26.avif", race: "insect", minimumDepth: 60, maximumDepth: 69,
    maxHp: 720, stats: Object.freeze({ str: 31, int: 7, agi: 17, dex: 28, luc: 18 }),
    def: 31, attack: 31, experienceReward: 1180, dropItemId: "abyss_scorpion_tail",
    actions: Object.freeze([
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "abyss_scorpion_deadly_poison", name: "猛毒", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 0.9, hitBonus: 0.04, effects: Object.freeze([Object.freeze({
          statusId: "deadly_poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.45
        })])
      }) }),
      Object.freeze({ weight: 60, action: Object.freeze({
        id: "pincer_crush", name: "挟み込み", actionType: "physicalAttack",
        hitCount: 2, powerPerHit: 0.7, hitBonus: -0.02, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 75, immune: false }),
      deadly_poison: Object.freeze({ resistancePoints: 75, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 65, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 70, immune: false })
    }),
    escapeRate: 0.24, surpriseRate: 0.18, surpriseRateMaximum: 0.3, isBoss: false
  }),
  Object.freeze({
    id: "cobra_gator", name: "コブラゲーター", imageId: "cobra_gator",
    level: 64,
    image: "images/enemies/enemy_27.avif", race: "beast", minimumDepth: 60, maximumDepth: 69,
    maxHp: 820, stats: Object.freeze({ str: 34, int: 9, agi: 20, dex: 27, luc: 19 }),
    def: 29, attack: 34, experienceReward: 1320, dropItemId: "cobra_gator_hide",
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "cobra_gator_deadly_poison", name: "猛毒", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 0.95, effects: Object.freeze([Object.freeze({
          statusId: "deadly_poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.4
        })])
      }) }),
      Object.freeze({ weight: 55, action: Object.freeze({
        id: "cobra_gator_tail_slam", name: "尻尾叩き", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.4, hitBonus: -0.05, speedModifier: -1,
        effects: Object.freeze([Object.freeze({
          statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2
        })])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 65, immune: false }),
      deadly_poison: Object.freeze({ resistancePoints: 65, immune: false }),
      action_skip: Object.freeze({ resistancePoints: 60, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 60, immune: false })
    }),
    escapeRate: 0.22, surpriseRate: 0.22, surpriseRateMaximum: 0.34, isBoss: false
  }),
  ...waterRegionEnemies,
  ...crystalRegionEnemies,
  Object.freeze({
    id: "mimic", name: "ミミック", imageId: "mimic",
    level: 10,
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
  }),
  Object.freeze({
    id: "maikaefer", name: "マイケーファー", imageId: "maikaefer",
    level: 1,
    image: "images/enemies/enemy_28.avif", race: "insect", randomEncounter: false,
    maxHp: 8, stats: Object.freeze({ str: 1, int: 1, agi: 30, dex: 8, luc: 20 }),
    def: 60, attack: 1, experienceReward: 1000, dropProfile: "goldenBeetle",
    evasionBonus: 0.25,
    actions: Object.freeze([
      Object.freeze({ weight: 70, action: Object.freeze({
        id: "maikaefer_escape", name: "逃走", actionType: "enemyEscape", speedModifier: 20
      }) }),
      Object.freeze({ weight: 20, action: Object.freeze({
        id: "maikaefer_watch", name: "様子を見る", actionType: "wait",
        waitMessage: "マイケーファーはこちらの様子をうかがっている。"
      }) }),
      Object.freeze({ weight: 10, action: Object.freeze({
        id: "maikaefer_attack", name: "攻撃", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 0.5, effects: Object.freeze([])
      }) })
    ]),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      deadly_poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 80, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 1, surpriseRate: 0, surpriseRateMaximum: 0, isBoss: false
  })
]);

export const MAIKAEFER_ENCOUNTER_RATE = 0.015;

export function getEnemyById(id) {
  return enemies.find(enemy => enemy.id === id) || null;
}

export function getEnemyEncounterCount(enemyOrId, rng = Math.random) {
  const enemy = typeof enemyOrId === "string" ? getEnemyById(enemyOrId) : enemyOrId;
  const [minimum = 1, maximum = minimum] = enemy?.encounterCountRange || [1, 1];
  const min = Math.max(1, Math.floor(Number(minimum) || 1));
  const max = Math.max(min, Math.floor(Number(maximum) || min));
  return min + Math.min(max - min, Math.floor(Math.max(0, Number(rng()) || 0) * (max - min + 1)));
}

export function getRandomEnemy({ depth = 1, rng = Math.random } = {}) {
  const available = enemies.filter(enemy =>
    enemy.randomEncounter !== false
    && (!enemy.minimumDepth || enemy.minimumDepth <= depth)
    && (!enemy.maximumDepth || enemy.maximumDepth >= depth)
  );
  const index = Math.min(
    available.length - 1,
    Math.floor(Math.max(0, Number(rng()) || 0) * available.length)
  );
  return available[index] || enemies[0];
}

export function getRandomEncounterEnemy({ depth = 1, rng = Math.random, allowRare = true } = {}) {
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  if (allowRare && Math.max(0, Number(rng()) || 0) < MAIKAEFER_ENCOUNTER_RATE) {
    return { ...getEnemyById("maikaefer"), level: floor, experienceReward: floor * 1000 };
  }
  return getRandomEnemy({ depth: floor, rng });
}

export function getWaterRegionEncounterFormation({ depth = 70, rng = Math.random } = {}) {
  return getWaterRegionFormationIds({ depth, rng }).map(getEnemyById).filter(Boolean);
}

export function getCrystalRegionEncounterFormation({ depth = 80, rng = Math.random } = {}) {
  return getCrystalRegionFormationIds({ depth, rng }).map(getEnemyById).filter(Boolean);
}

export function createEnemyCombatant(enemy) {
  return {
    id: enemy.id,
    name: enemy.name,
    image: enemy.image,
    race: enemy.race || "unknown",
    level: Math.max(1, Math.floor(Number(enemy.level) || 1)),
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
    encounterCountRange: enemy.encounterCountRange ? [...enemy.encounterCountRange] : null,
    ignoreNormalSurpriseCap: Boolean(enemy.ignoreNormalSurpriseCap),
    evasionBonus: Number(enemy.evasionBonus) || 0,
    statuses: [],
    elementMultipliers: { ...(enemy.elementMultipliers || {}) },
    statusResistances: structuredClone(enemy.statusResistances || {}),
    physicalTypeMultipliers: { ...(enemy.physicalTypeMultipliers || {}) },
    crackTrait: structuredClone(enemy.crackTrait || null),
    resonanceTrait: structuredClone(enemy.resonanceTrait || null),
    isBoss: Boolean(enemy.isBoss),
    alive: true
  };
}
