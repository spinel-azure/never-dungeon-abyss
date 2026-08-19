export const BOSSES = Object.freeze({
  lingering_ghost_b2f: Object.freeze({
    id: "lingering_ghost_b2f",
    name: "未練ある亡霊",
    level: 5,
    floor: 2,
    imageId: "lingering_ghost_b2f",
    image: "images/bosses/boss_02.avif",
    encounterImageId: "lingering_ghost_event_b2f",
    encounterImage: "images/background/dungeon_event_01.avif",
    race: "undead",
    maxHp: 45,
    stats: Object.freeze({ str: 5, int: 4, agi: 12, dex: 3, luc: 5 }),
    def: 5,
    attack: 4,
    hitBonus: -0.2,
    evasionBonus: 0.2,
    physicalHitMinimum: 0.65,
    experienceReward: 20,
    specialAttack: null,
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 40, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 30, immune: false })
    }),
    escapeRate: 0.7,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "event",
    repeatable: true
  }),
  otherworldly_wisdom_b4f: Object.freeze({
    id: "otherworldly_wisdom_b4f",
    name: "異界の叡智",
    level: 80,
    floor: 4,
    imageId: "otherworldly_wisdom_b4f",
    image: "images/bosses/boss_00.avif",
    encounterImageId: "otherworldly_wisdom_event_b4f",
    encounterImage: "images/background/dungeon_event_06.avif",
    race: "aberration",
    maxHp: 3000,
    stats: Object.freeze({ str: 30, int: 30, agi: 28, dex: 28, luc: 30 }),
    def: 28,
    attack: 24,
    experienceReward: 100000,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({
        weight: 20,
        action: Object.freeze({
          id: "four_world_assault",
          name: "四界連撃",
          actionType: "physicalAttack",
          hitCount: 4,
          powerPerHit: 0.72,
          hitBonus: 0.05,
          speedModifier: 4,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 30,
        action: Object.freeze({
          id: "otherworldly_flame",
          name: "異界の業火",
          actionType: "spell",
          element: "fire",
          spellPower: 145,
          powerMultiplier: 1,
          unavoidable: true,
          speedModifier: -3,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 25,
        action: Object.freeze({
          id: "otherworldly_frost",
          name: "異界の凍気",
          actionType: "spell",
          element: "ice",
          spellPower: 115,
          powerMultiplier: 0.9,
          unavoidable: true,
          speedModifier: -1,
          effects: Object.freeze([Object.freeze({
            statusId: "speed_down",
            trigger: "perAction",
            statusKind: "magical",
            baseRate: 0.85
          })])
        })
      }),
      Object.freeze({
        weight: 25,
        action: Object.freeze({
          id: "otherworldly_ray",
          name: "異界の光条",
          actionType: "spell",
          element: "arcane",
          spellPower: 175,
          powerMultiplier: 1,
          unavoidable: true,
          speedModifier: -6,
          effects: Object.freeze([])
        })
      })
    ]),
    reward: Object.freeze({ type: "card", cardId: "zodiac_libra", amount: 1 }),
    elementMultipliers: Object.freeze({ fire: 0.5, ice: 0.5, arcane: 0.5 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 100, immune: true })
    }),
    escapeRate: 0.8,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "event",
    defeatedFlag: "boss_otherworldly_wisdom_b4f_defeated",
    event: Object.freeze({
      prompt: "部屋の中央に、この世のものとは思えない異形が佇んでいる。\nその眼差しは、こちらのすべてを見透かしているようだ。挑みますか？\n＊Aボタン：挑む　Bボタン：立ち去る",
      start: "異形が静かに四本の腕を広げた。\n異界の叡智が襲いかかってきた！"
    })
  }),
  fallen_mage_b19f: Object.freeze({
    id: "fallen_mage_b19f",
    name: "堕落した魔術師",
    level: 22,
    floor: 19,
    imageId: "fallen_mage_b19f",
    image: "images/bosses/boss_03.avif",
    encounterImageId: "fallen_mage_event_b19f",
    encounterImage: "images/npc/NPC_event_03.avif",
    defeatedEncounterImageId: "fallen_mage_remains_b19f",
    defeatedEncounterImage: "images/npc/NPC_event_04.avif",
    race: "human",
    maxHp: 380,
    stats: Object.freeze({ str: 8, int: 16, agi: 12, dex: 10, luc: 11 }),
    def: 11,
    attack: 8,
    experienceReward: 1500,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({
        weight: 20,
        action: Object.freeze({
          id: "fallen_mage_strike",
          name: "杖撃",
          actionType: "physicalAttack",
          hitCount: 1,
          powerPerHit: 1,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 35,
        action: Object.freeze({
          id: "corrupt_flame",
          name: "堕炎",
          actionType: "spell",
          element: "fire",
          spellPower: 18,
          powerMultiplier: 1,
          unavoidable: true,
          speedModifier: -4,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 30,
        action: Object.freeze({
          id: "corrupt_frost",
          name: "堕氷",
          actionType: "spell",
          element: "ice",
          spellPower: 14,
          powerMultiplier: 0.9,
          unavoidable: true,
          speedModifier: -2,
          effects: Object.freeze([Object.freeze({
            statusId: "speed_down",
            trigger: "perAction",
            statusKind: "magical",
            baseRate: 0.6
          })])
        })
      }),
      Object.freeze({
        weight: 15,
        action: Object.freeze({
          id: "corrupt_ray",
          name: "堕光",
          actionType: "spell",
          element: "arcane",
          spellPower: 24,
          powerMultiplier: 1,
          unavoidable: true,
          speedModifier: -6,
          effects: Object.freeze([])
        })
      })
    ]),
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0.5,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "floor",
    defeatedFlag: "boss_fallen_mage_b19f_defeated",
    room: Object.freeze({
      requiresKey: true,
      keyItemId: "red_rust_key_b19f",
      unlockFlag: "red_door_b19f_unlocked"
    }),
    event: Object.freeze({
      prompt: "部屋の中で薄汚れたローブを身に纏った女が何やら儀式を行っている。近づいて調べますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "女は突然振り向き、聞き取れない言葉で何かを叫ぶと杖を振りかざして呪文を唱えはじめる！",
      remains: "――もう何者の気配も感じない。一体何の儀式を行っていたのか…。\n＊Aボタン：次へ"
    })
  }),
  iron_maiden_b29f: Object.freeze({
    id: "iron_maiden_b29f",
    name: "鋼鉄の乙女",
    level: 38,
    floor: 29,
    imageId: "iron_maiden_b29f",
    image: "images/bosses/boss_05.avif",
    encounterImageId: "iron_maiden_event_b29f",
    encounterImage: "images/npc/NPC_event_05.avif",
    defeatedEncounterImageId: "iron_maiden_remains_b29f",
    defeatedEncounterImage: "images/npc/NPC_event_06.avif",
    race: "construct",
    maxHp: 720,
    stats: Object.freeze({ str: 22, int: 4, agi: 10, dex: 16, luc: 12 }),
    def: 18,
    attack: 17,
    experienceReward: 5000,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({
        weight: 35,
        action: Object.freeze({
          id: "iron_maiden_strike",
          name: "鉄塊撃",
          actionType: "physicalAttack",
          hitCount: 1,
          powerPerHit: 1,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 30,
        action: Object.freeze({
          id: "chain_restraint",
          name: "鎖の拘束",
          actionType: "physicalAttack",
          hitCount: 1,
          powerPerHit: 0.85,
          hitBonus: 0.05,
          effects: Object.freeze([Object.freeze({
            statusId: "action_skip",
            trigger: "firstHitOnly",
            statusKind: "physical",
            baseRate: 0.55
          })])
        })
      }),
      Object.freeze({
        weight: 20,
        action: Object.freeze({
          id: "coffin_crush",
          name: "棺砕き",
          actionType: "physicalAttack",
          hitCount: 1,
          powerPerHit: 1.3,
          speedModifier: -2,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 15,
        when: Object.freeze({ hpRateBelow: 0.49 }),
        action: Object.freeze({
          id: "death_bite",
          name: "デスバイト",
          actionType: "physicalAttack",
          hitCount: 1,
          powerPerHit: 1.75,
          hitBonus: 0.08,
          effects: Object.freeze([Object.freeze({
            statusId: "bleeding",
            trigger: "firstHitOnly",
            statusKind: "physical",
            baseRate: 0.4
          })])
        })
      })
    ]),
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 0.75, ice: 0.75, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 70, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "floor",
    defeatedFlag: "boss_iron_maiden_b29f_defeated",
    room: Object.freeze({
      requiresKey: true,
      keyItemId: "red_rust_key_b29f",
      unlockFlag: "red_door_b29f_unlocked"
    }),
    event: Object.freeze({
      prompt: "部屋の中央には棺の様な物が横たわっており、蓋には眠った乙女の様な意匠が施されている。近づいて調べますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "あなたが近づこうとした途端、突然棺が宙に浮かび、襲いかかってきた！",
      remains: "――朽ちた棺の残骸が転がっている。この乙女が目を覚ます事はもう無いだろう…。\n＊Aボタン：次へ"
    })
  }),
  wicker_man_b39f: Object.freeze({
    id: "wicker_man_b39f",
    name: "ウィッカーマン",
    level: 48,
    floor: 39,
    imageId: "wicker_man_b39f",
    image: "images/bosses/boss_07.avif",
    encounterImageId: "wicker_man_event_b39f",
    encounterImage: "images/npc/NPC_event_07.avif",
    defeatedEncounterImageId: "wicker_man_remains_b39f",
    defeatedEncounterImage: "images/npc/NPC_event_08.avif",
    race: "construct",
    maxHp: 1100,
    stats: Object.freeze({ str: 25, int: 22, agi: 14, dex: 18, luc: 15 }),
    def: 23,
    attack: 22,
    experienceReward: 10000,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({
        weight: 30,
        action: Object.freeze({
          id: "wicker_limb_strike", name: "枝腕撃", actionType: "physicalAttack",
          hitCount: 1, powerPerHit: 1.1, effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 30,
        action: Object.freeze({
          id: "blazing_branches", name: "灼熱の枝", actionType: "spell", element: "fire",
          spellPower: 30, powerMultiplier: 1, unavoidable: true, speedModifier: -2,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 25,
        action: Object.freeze({
          id: "ember_scatter", name: "火の粉乱舞", actionType: "spell", element: "fire",
          spellPower: 18, powerMultiplier: 0.7, hitCount: 2, unavoidable: true,
          effects: Object.freeze([])
        })
      }),
      Object.freeze({
        weight: 15,
        when: Object.freeze({ hpRateBelow: 0.5 }),
        action: Object.freeze({
          id: "wicker_inferno", name: "業火の抱擁", actionType: "spell", element: "fire",
          spellPower: 42, powerMultiplier: 1.15, unavoidable: true, speedModifier: -6,
          effects: Object.freeze([])
        })
      })
    ]),
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 0, ice: 1.5, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 75, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "floor",
    defeatedFlag: "boss_wicker_man_b39f_defeated",
    room: Object.freeze({
      requiresKey: true,
      keyItemId: "red_rust_key_b39f",
      unlockFlag: "red_door_b39f_unlocked"
    }),
    event: Object.freeze({
      prompt: "部屋の中央に木の枝を編み込んで作られた巨大な人型が立っている。近づいてみますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "あなたが近づこうとした途端、巨大な人型は激しく燃え上がり、襲いかかってきた！",
      remains: "――燃え尽き、朽ちた人型の残骸が転がっている。もう二度と起き上がる事はないだろう…。\n＊Aボタン：次へ"
    })
  }),
  eiskoenigin_b49f: Object.freeze({
    id: "eiskoenigin_b49f",
    name: "エイスケーニギン",
    level: 55,
    floor: 49,
    imageId: "eiskoenigin_b49f",
    image: "images/bosses/boss_10.avif",
    encounterImageId: "eiskoenigin_event_b49f",
    encounterImage: "images/npc/NPC_event_09.avif",
    defeatedEncounterImageId: "eiskoenigin_remains_b49f",
    defeatedEncounterImage: "images/npc/NPC_event_10.avif",
    race: "construct",
    maxHp: 1350,
    stats: Object.freeze({ str: 29, int: 27, agi: 17, dex: 23, luc: 18 }),
    def: 27,
    attack: 26,
    experienceReward: 13000,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 35, action: Object.freeze({
        id: "ice_queen_scepter_strike", name: "王笏の一撃", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.2, hitBonus: 0.03, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 30, action: Object.freeze({
        id: "ice_queen_frozen_lance", name: "凍てつく氷槍", actionType: "spell", element: "ice",
        spellPower: 34, powerMultiplier: 1, unavoidable: true, speedModifier: -2,
        effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "ice_queen_crystal_storm", name: "氷晶乱舞", actionType: "spell", element: "ice",
        spellPower: 22, powerMultiplier: 0.75, hitCount: 2, unavoidable: true,
        effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 10, when: Object.freeze({ hpRateBelow: 0.5 }), action: Object.freeze({
        id: "ice_queen_absolute_zero", name: "絶対零度", actionType: "spell", element: "ice",
        spellPower: 46, powerMultiplier: 1.1, unavoidable: true, speedModifier: -7,
        effects: Object.freeze([])
      }) })
    ]),
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "floor",
    defeatedFlag: "boss_eiskoenigin_b49f_defeated",
    room: Object.freeze({
      requiresKey: true,
      keyItemId: "red_rust_key_b49f",
      unlockFlag: "red_door_b49f_unlocked"
    }),
    event: Object.freeze({
      prompt: "部屋の中央には目を閉じ、王笏を携えた美しい女性の像が立っている。近づいてみますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "その美しさに魅せられて近づこうとした途端、巨大な氷の像は王笏を振りかざして襲いかかってきた！",
      remains: "――氷の女王の体躯は溶けて、後には王笏とティアラが残るのみ…。\n＊Aボタン：次へ"
    })
  }),
  giant_vine_obstacle: Object.freeze({
    id: "giant_vine_obstacle", name: "巨大蔓", floor: 50, level: 55,
    imageId: "giant_vine_obstacle", image: "images/npc/NPC_event_11.avif",
    encounterImageId: "giant_vine_obstacle", encounterImage: "images/npc/NPC_event_11.avif",
    race: "plant", maxHp: 500,
    stats: Object.freeze({ str: 4, int: 1, agi: 1, dex: 5, luc: 1 }),
    def: 60, attack: 3, physicalDamageReduction: 0.9, magicDamageReduction: 0.75, experienceReward: 0,
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({ id: "vine_sway", name: "蔓を揺らしている……", actionType: "wait", waitMessage: "巨大蔓は蔓を揺らしている……。" }) }),
      Object.freeze({ weight: 35, action: Object.freeze({ id: "vine_root", name: "根を張っている……", actionType: "wait", waitMessage: "巨大蔓は地面へ深く根を張っている……。" }) }),
      Object.freeze({ weight: 12, action: Object.freeze({ id: "vine_swing", name: "蔓を振り回した！", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.35, effects: Object.freeze([Object.freeze({ statusId: "deadly_poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2 })]) }) }),
      Object.freeze({ weight: 8, action: Object.freeze({ id: "vine_spores", name: "胞子をまき散らした！", actionType: "spell", element: "arcane", spellPower: 0, powerMultiplier: 0, unavoidable: true, effects: Object.freeze([Object.freeze({ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.25 })]) }) })
    ]),
    reward: Object.freeze({ type: "none" }), elementMultipliers: Object.freeze({ fire: 1.5, ice: 1, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 100, immune: true }), deadly_poison: Object.freeze({ resistancePoints: 100, immune: true }), action_skip: Object.freeze({ resistancePoints: 100, immune: true }) }),
    escapeRate: 1, surpriseRate: 0, surpriseRateMaximum: 0, noDrop: true,
    isBoss: true, bossKind: "obstacle", isDungeonObstacle: true,
    event: Object.freeze({ prompt: "巨大な蔓が行く手を塞いでいる。近づきますか？\n＊Aボタン：はい　Bボタン：いいえ", start: "巨大蔓がうごめき、襲いかかってきた！" })
  }),
  fleischfresser_b59f: Object.freeze({
    id: "fleischfresser_b59f", name: "フライシュフレッサー", level: 65, floor: 59,
    imageId: "fleischfresser_b59f", image: "images/bosses/boss_11.avif",
    encounterImageId: "fleischfresser_event_b59f", encounterImage: "images/npc/NPC_event_11b.avif",
    defeatedEncounterImageId: "fleischfresser_remains_b59f", defeatedEncounterImage: "images/npc/NPC_event_12.avif",
    race: "plant", maxHp: 10000,
    stats: Object.freeze({ str: 31, int: 28, agi: 10, dex: 25, luc: 22 }),
    def: 34, attack: 30, experienceReward: 20000, regainRate: 0.05,
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({ id: "flesh_vine", name: "捕食蔓", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.85, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 30, action: Object.freeze({ id: "flesh_poison", name: "猛毒花粉", actionType: "spell", element: "arcane", spellPower: 18, unavoidable: true, effects: Object.freeze([Object.freeze({ statusId: "deadly_poison", trigger: "perAction", statusKind: "magical", baseRate: 0.35 })]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "flesh_spore", name: "麻痺胞子", actionType: "spell", element: "arcane", spellPower: 12, unavoidable: true, effects: Object.freeze([Object.freeze({ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.3 })]) }) })
    ]),
    reward: Object.freeze({ type: "none" }), elementMultipliers: Object.freeze({ fire: 1.5, ice: 1, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 100, immune: true }), deadly_poison: Object.freeze({ resistancePoints: 100, immune: true }), action_skip: Object.freeze({ resistancePoints: 85, immune: false }) }),
    escapeRate: 1, surpriseRate: 0, surpriseRateMaximum: 0, noDrop: true, isBoss: true, bossKind: "floor",
    defeatedFlag: "boss_fleischfresser_b59f_defeated", transferUnlockFlag: "transfer_portal_b60f_unlocked",
    room: Object.freeze({ requiresKey: true, keyItemId: "red_rust_key_b59f", unlockFlag: "red_door_b59f_unlocked" }),
    event: Object.freeze({
      prompt: "巨大な植物が生い茂り、閉じた花弁から無数の太い蔓が蠢いている。\n花から漂う甘い香りに誘われる……。もっと近づきますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "あなたが近づくと――\n閉じていた花弁が、ゆっくりと……ゆっくりと開いてゆく。\n\nそして、その中から現れたのは――――！",
      autoStartDelay: 2000,
      remains: "花弁は枯れて朽ち果て、蔓も力なく垂れ下がっている。\n\nもう二度と、花開くことはないだろう……。\n＊Aボタン：次へ"
    })
  }),
  glacies_event_boss: Object.freeze({
    id: "glacies_event_boss",
    name: "グラキエス",
    level: 42,
    floor: 46,
    imageId: "glacies_event_boss",
    image: "images/bosses/boss_09.avif",
    encounterImageId: "glacies_event_b46f",
    encounterImage: "images/background/dungeon_event_05.avif",
    race: "giant",
    maxHp: 1050,
    stats: Object.freeze({ str: 28, int: 10, agi: 14, dex: 22, luc: 14 }),
    def: 23,
    attack: 25,
    experienceReward: 6500,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "glacies_wide_swing", name: "ぶん回し", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.15, hitBonus: 0.02, speedModifier: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 35, action: Object.freeze({
        id: "glacies_overhead_smash", name: "振り下ろし", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.65, hitBonus: -0.08, speedModifier: -6, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "giant_charge", name: "巨人の突進", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.85, hitBonus: -0.12, speedModifier: -8, effects: Object.freeze([])
      }) })
    ]),
    reward: Object.freeze({ type: "equipment", equipmentId: "glacies_hammer", slot: "rightArmId" }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "event",
    defeatedFlag: "boss_glacies_event_boss_defeated",
    event: Object.freeze({
      immediateStart: true,
      confirmBeforeStart: true,
      fadeBeforeStart: true,
      autoStartDelay: 2000,
      reserveMessageLines: 5,
      start: "部屋の中に入ると同時に猛烈な寒さを感じた。\n部屋の中央には大槌を構えた巨人の像が立っており、こちらを見下ろしている。\nそして、ゆっくりと握りしめた大槌を振り上げると、襲いかかってきた！"
    })
  }),
  /*
  glacies_event_boss: Object.freeze({
    id: "glacies_event_boss",
    name: "グラキエス",
    level: 42,
    imageId: "glacies_event_boss",
    image: "images/bosses/boss_09.avif",
    race: "giant",
    maxHp: 1050,
    stats: Object.freeze({ str: 28, int: 10, agi: 14, dex: 22, luc: 14 }),
    def: 23,
    attack: 25,
    experienceReward: 6500,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "glacies_wide_swing", name: "ぶん回し", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.15, hitBonus: 0.02, speedModifier: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 35, action: Object.freeze({
        id: "glacies_overhead_smash", name: "振り下ろし", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.65, hitBonus: -0.08, speedModifier: -6, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "giant_charge", name: "巨人の突進", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.85, hitBonus: -0.12, speedModifier: -8, effects: Object.freeze([])
      }) })
    ]),
    reward: Object.freeze({ type: "equipment", equipmentId: "glacies_hammer", slot: "rightArmId" }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "event",
    defeatedFlag: "boss_glacies_event_boss_defeated"
  }),
  */
  /* Duplicate Glacies definitions accidentally introduced during data expansion.
     Kept outside the active object until the historical block is removed. */
  /*
  glacies_event_boss: Object.freeze({
    id: "glacies_event_boss", name: "グラキエス", level: 42,
    imageId: "glacies_event_boss", image: "images/bosses/boss_09.avif", race: "giant",
    maxHp: 1050, stats: Object.freeze({ str: 28, int: 10, agi: 14, dex: 22, luc: 14 }),
    def: 23, attack: 25, experienceReward: 6500, specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "glacies_wide_swing", name: "ぶん回し", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.15, hitBonus: 0.02, speedModifier: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 35, action: Object.freeze({
        id: "glacies_overhead_smash", name: "振り下ろし", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.65, hitBonus: -0.08, speedModifier: -6, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "giant_charge", name: "巨人の突進", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.85, hitBonus: -0.12, speedModifier: -8, effects: Object.freeze([])
      }) })
    ]),
    reward: Object.freeze({ type: "equipment", equipmentId: "glacies_hammer", slot: "rightArmId" }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0, surpriseRate: 0, surpriseRateMaximum: 0, noDrop: true, isBoss: true,
    bossKind: "event", defeatedFlag: "boss_glacies_event_boss_defeated"
  }),
  glacies_event_boss: Object.freeze({
    id: "glacies_event_boss", name: "グラキエス", level: 42,
    imageId: "glacies_event_boss", image: "images/bosses/boss_09.avif", race: "giant",
    maxHp: 1050, stats: Object.freeze({ str: 28, int: 10, agi: 14, dex: 22, luc: 14 }),
    def: 23, attack: 25, experienceReward: 6500, specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 40, action: Object.freeze({
        id: "glacies_wide_swing", name: "ぶん回し", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.15, hitBonus: 0.02, speedModifier: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 35, action: Object.freeze({
        id: "glacies_overhead_smash", name: "振り下ろし", actionType: "physicalAttack", element: "ice",
        hitCount: 1, powerPerHit: 1.65, hitBonus: -0.08, speedModifier: -6, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "giant_charge", name: "巨人の突進", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.85, hitBonus: -0.12, speedModifier: -8, effects: Object.freeze([])
      }) })
    ]),
    reward: Object.freeze({ type: "equipment", equipmentId: "glacies_hammer", slot: "rightArmId" }),
    elementMultipliers: Object.freeze({ fire: 1.5, ice: 0.5, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 80, immune: false })
    }),
    escapeRate: 0, surpriseRate: 0, surpriseRateMaximum: 0, noDrop: true, isBoss: true,
    bossKind: "event", defeatedFlag: "boss_glacies_event_boss_defeated"
  }),
  */
  thief_leader_event_boss: Object.freeze({
    id: "thief_leader_event_boss", name: "双刃の頭領", level: 32, floor: 27,
    imageId: "thief_leader_event_boss", image: "images/bosses/boss_04.avif",
    encounterImageId: "thief_hideout_event_b27f", encounterImage: "images/background/dungeon_event_03.avif",
    race: "human", maxHp: 580,
    stats: Object.freeze({ str: 21, int: 12, agi: 22, dex: 23, luc: 16 }),
    def: 17, attack: 19, experienceReward: 3500, specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 35, action: Object.freeze({ id: "twin_blade_slash", name: "双刃斬り", actionType: "physicalAttack", hitCount: 2, powerPerHit: 0.75, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "flame_blade", name: "炎刃", actionType: "physicalAttack", element: "fire", hitCount: 1, powerPerHit: 1.25, effects: Object.freeze([Object.freeze({ statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2 })]) }) }),
      Object.freeze({ weight: 25, action: Object.freeze({ id: "ice_blade", name: "氷刃", actionType: "physicalAttack", element: "ice", hitCount: 1, powerPerHit: 1.15, effects: Object.freeze([Object.freeze({ statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2 })]) }) }),
      Object.freeze({ weight: 15, action: Object.freeze({ id: "smoke_bomb", name: "煙玉", actionType: "physicalAttack", hitCount: 1, powerPerHit: 0.35, unavoidable: true, effects: Object.freeze([Object.freeze({ statusId: "speed_down", trigger: "perAction", statusKind: "physical", baseRate: 0.8 })]) }) })
    ]),
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1, arcane: 1 }),
    statusResistances: Object.freeze({ poison: Object.freeze({ resistancePoints: 65, immune: false }), bleeding: Object.freeze({ resistancePoints: 60, immune: false }), action_skip: Object.freeze({ resistancePoints: 75, immune: false }), speed_down: Object.freeze({ resistancePoints: 70, immune: false }) }),
    escapeRate: 0, surpriseRate: 0, surpriseRateMaximum: 0, noDrop: true, isBoss: true,
    bossKind: "event", defeatedFlag: "boss_thief_leader_event_boss_defeated",
    event: Object.freeze({ immediateStart: true, confirmBeforeStart: true, fadeBeforeStart: true,
      autoStartDelay: 1000, reserveMessageLines: 5,
      start: "扉を開けて中に入ると、石造りの部屋の中央に置かれたテーブルに足を投げ出して椅子に座りながら、女盗賊が酒を飲んでいた。\nそして背中越しにあなたの姿を見るや立ち上がり、腰の短剣を抜き放つ！" })
  }),
  brass_bull_event_boss: Object.freeze({
    id: "brass_bull_event_boss",
    name: "真鍮の雄牛",
    level: 35,
    floor: 36,
    imageId: "brass_bull_event_boss",
    image: "images/bosses/boss_08.avif",
    encounterImageId: "brass_bull_event_b36f",
    encounterImage: "images/background/dungeon_event_04.avif",
    race: "construct",
    maxHp: 760,
    stats: Object.freeze({ str: 24, int: 18, agi: 13, dex: 20, luc: 12 }),
    def: 20,
    attack: 21,
    experienceReward: 5000,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "bull_roar", name: "雄牛の咆哮", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 0.8, effects: Object.freeze([Object.freeze({
          statusId: "action_skip", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.4
        })])
      }) }),
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "bull_charge", name: "雄牛の突進", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.5, hitBonus: -0.06, speedModifier: -4, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 30, action: Object.freeze({
        id: "brass_bull_flame_breath", name: "火炎吐き", actionType: "spell", element: "fire",
        spellPower: 22, powerMultiplier: 1.1, unavoidable: true, speedModifier: -3, effects: Object.freeze([])
      }) })
    ]),
    reward: Object.freeze({ type: "item", itemId: "molten_brass", amount: 1 }),
    elementMultipliers: Object.freeze({ fire: 0.5, ice: 1.5, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 75, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "event",
    event: Object.freeze({
      canCancel: false,
      fadeBeforeStart: true,
      autoStartDelay: 1000,
      reserveMessageLines: 5,
      prompt: "部屋の中に入ると同時にもの凄い熱気を感じた。\n部屋の中央の台座には真鍮製の雄牛の像が鎮座しており、鼻からは煙が吹き出している。\nそして、こちらに気付いたかの様にその体躯を起こし、襲いかかってきた！\n＊Aボタン：次へ",
      start: "真鍮の雄牛が襲いかかってきた！"
    }),
    defeatedFlag: "boss_brass_bull_event_boss_defeated"
  }),
  jabberwock_event_boss: Object.freeze({
    id: "jabberwock_event_boss",
    name: "ジャバウォック",
    level: 22,
    floor: 16,
    imageId: "jabberwock_event_boss",
    image: "images/bosses/boss_06.avif",
    race: "dragon",
    maxHp: 620,
    stats: Object.freeze({ str: 19, int: 5, agi: 13, dex: 16, luc: 10 }),
    def: 15,
    attack: 15,
    experienceReward: 3000,
    specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 45, action: Object.freeze({
        id: "jabberwock_claw", name: "鉤爪", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 30, action: Object.freeze({
        id: "jabberwock_rampage", name: "爪牙乱舞", actionType: "physicalAttack",
        hitCount: 3, powerPerHit: 0.62, hitBonus: -0.04, speedModifier: 2, effects: Object.freeze([])
      }) }),
      Object.freeze({ weight: 25, action: Object.freeze({
        id: "jabberwock_bite", name: "狂乱の牙", actionType: "physicalAttack",
        hitCount: 1, powerPerHit: 1.35, hitBonus: 0.04,
        effects: Object.freeze([Object.freeze({
          statusId: "bleeding", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.35
        })])
      }) })
    ]),
    reward: Object.freeze({ type: "routeCard" }),
    elementMultipliers: Object.freeze({ fire: 0.75, ice: 1.25, arcane: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 65, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 50, immune: false })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "event",
    defeatedFlag: "boss_jabberwock_event_boss_defeated",
    questProgressId: "guild_009",
    event: Object.freeze({
      immediateStart: true,
      start: "部屋に入ると突然、燻り狂うような咆哮が響き渡り、それと同時に巨大な何かが襲ってきた！"
    })
  }),
  quest_mimic_b6f: Object.freeze({
    id: "quest_mimic_b6f", name: "ミミック", floor: 6,
    level: 10,
    imageId: "quest_mimic_b6f", image: "images/enemies/enemy_05.avif",
    encounterImageId: "quest_mimic_event_b6f", encounterImage: "images/background/dungeon_event_02.avif",
    race: "construct", maxHp: 60,
    stats: Object.freeze({ str: 10, int: 3, agi: 6, dex: 8, luc: 7 }),
    def: 9, attack: 8, experienceReward: 20, specialAttack: null,
    actions: Object.freeze([
      Object.freeze({ weight: 65, action: Object.freeze({ id: "mimic_attack", name: "攻撃",
        actionType: "physicalAttack", hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
      Object.freeze({ weight: 35, when: Object.freeze({ hpRateBelow: 0.5 }), action: Object.freeze({
        id: "killer_bite", name: "キラーバイト", actionType: "physicalAttack", hitCount: 1,
        powerPerHit: 1.15, effects: Object.freeze([Object.freeze({ statusId: "bleeding",
          trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.2 })])
      }) })
    ]),
    reward: Object.freeze({ type: "equipment", equipmentId: "vorpal_sword", slot: "rightArmId" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      bleeding: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 35, immune: false }),
      speed_down: Object.freeze({ resistancePoints: 25, immune: false })
    }),
    escapeRate: 0.5, surpriseRate: 0, surpriseRateMaximum: 0,
    noDrop: true, isBoss: true, bossKind: "event",
    defeatedFlag: "boss_quest_mimic_b6f_defeated", questProgressId: "guild_006",
    event: Object.freeze({
      prompt: "部屋の中にはたくさんの箱が転がっていた。大半は中身が空のものばかりだったが、\nひとつだけ閉じた黒い箱が部屋の中央に置かれている。開けてみますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "黒い箱が突如、大きな口を開いた！\nミミックが襲いかかってきた！",
      treasureOpening: "black"
    })
  }),
  strange_knight_statue_b9f: Object.freeze({
    id: "strange_knight_statue_b9f",
    name: "奇妙な彫像",
    level: 12,
    floor: 9,
    imageId: "strange_knight_statue_b9f",
    image: "images/bosses/boss_01.avif",
    encounterImageId: "strange_knight_statue_event_b9f",
    encounterImage: "images/npc/NPC_event_01.avif",
    defeatedEncounterImageId: "strange_knight_statue_remains_b9f",
    defeatedEncounterImage: "images/npc/NPC_event_02.avif",
    race: "construct",
    maxHp: 140,
    stats: Object.freeze({ str: 10, int: 2, agi: 5, dex: 7, luc: 3 }),
    def: 8,
    attack: 7,
    experienceReward: 500,
    specialAttack: null,
    reward: Object.freeze({ type: "none" }),
    elementMultipliers: Object.freeze({ fire: 1, ice: 1 }),
    statusResistances: Object.freeze({
      poison: Object.freeze({ resistancePoints: 100, immune: true }),
      action_skip: Object.freeze({ resistancePoints: 100, immune: true }),
      speed_down: Object.freeze({ resistancePoints: 100, immune: true })
    }),
    escapeRate: 0,
    surpriseRate: 0,
    surpriseRateMaximum: 0,
    noDrop: true,
    isBoss: true,
    bossKind: "floor",
    defeatedFlag: "boss_strange_knight_statue_b9f_defeated",
    transferUnlockFlag: "transfer_portal_b10f_unlocked",
    room: Object.freeze({
      requiresKey: true,
      keyItemId: "red_rust_key_b9f",
      unlockFlag: "red_door_b9f_unlocked"
    })
  })
});

export function getBossById(id) {
  return BOSSES[String(id || "")] || null;
}

export function getFloorBossByDepth(depth) {
  const normalizedDepth = Math.max(1, Math.floor(Number(depth) || 1));
  return Object.values(BOSSES).find(boss => boss.bossKind === "floor" && boss.floor === normalizedDepth) || null;
}

export function isBossDefeated(character, bossOrId) {
  const boss = typeof bossOrId === "string" ? getBossById(bossOrId) : bossOrId;
  return Boolean(boss?.defeatedFlag && character?.eventFlags?.[boss.defeatedFlag]);
}

export function applyBossVictory(character, bossOrId) {
  const boss = typeof bossOrId === "string" ? getBossById(bossOrId) : bossOrId;
  if (!character || !boss?.defeatedFlag) return { character, accepted: false, reward: null };
  return {
    character: {
      ...character,
      eventFlags: {
        ...(character.eventFlags || {}),
        [boss.defeatedFlag]: true
      }
    },
    accepted: true,
    reward: structuredClone(boss.reward || { type: "none" })
  };
}

export function createBossCombatant(bossOrId) {
  const boss = typeof bossOrId === "string" ? getBossById(bossOrId) : bossOrId;
  if (!boss) return null;
  return {
    ...boss,
    hp: boss.maxHp,
    maxSp: 0,
    sp: 0,
    baseDef: boss.def,
    stats: { ...boss.stats },
    specialAttack: structuredClone(boss.specialAttack || null),
    actions: structuredClone(boss.actions || []),
    reward: structuredClone(boss.reward || { type: "none" }),
    elementMultipliers: { ...boss.elementMultipliers },
    statusResistances: structuredClone(boss.statusResistances || {}),
    statuses: [],
    alive: true
  };
}
