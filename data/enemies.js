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
    image: "images/enemies/enemy_10.avif", race: "beast", minimumDepth: 11, maximumDepth: 20,
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
    image: "images/enemies/enemy_11.avif", race: "beast", minimumDepth: 13, maximumDepth: 20,
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
    image: "images/enemies/enemy_12.avif", race: "beast", minimumDepth: 16, maximumDepth: 20,
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
    image: "images/enemies/enemy_13.avif", race: "undead", minimumDepth: 19, maximumDepth: 20,
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
    image: "images/enemies/enemy_14.avif", race: "spirit", minimumDepth: 21, maximumDepth: 30,
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
    image: "images/enemies/enemy_15.avif", race: "beast", minimumDepth: 23, maximumDepth: 30,
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
    image: "images/enemies/enemy_16.avif", race: "construct", minimumDepth: 26, maximumDepth: 30,
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
    image: "images/enemies/enemy_17.avif", race: "beast", minimumDepth: 29, maximumDepth: 30,
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
    image: "images/enemies/enemy_18.avif", race: "spirit", minimumDepth: 31,
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
    image: "images/enemies/enemy_19.avif", race: "beast", minimumDepth: 33,
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
    image: "images/enemies/enemy_20.avif", race: "beast", minimumDepth: 36,
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
    image: "images/enemies/enemy_21.avif", race: "beast", minimumDepth: 39,
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
  })
]);

export function getEnemyById(id) {
  return enemies.find(enemy => enemy.id === id) || null;
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
    ignoreNormalSurpriseCap: Boolean(enemy.ignoreNormalSurpriseCap),
    statuses: [],
    elementMultipliers: { ...(enemy.elementMultipliers || {}) },
    statusResistances: structuredClone(enemy.statusResistances || {}),
    isBoss: Boolean(enemy.isBoss),
    alive: true
  };
}
