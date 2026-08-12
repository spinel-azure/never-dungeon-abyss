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
  brass_bull_event_boss: Object.freeze({
    id: "brass_bull_event_boss",
    name: "真鍮の雄牛",
    level: 30,
    imageId: "brass_bull_event_boss",
    image: "images/bosses/boss_08.avif",
    race: "construct",
    maxHp: 760,
    stats: Object.freeze({ str: 24, int: 18, agi: 13, dex: 20, luc: 12 }),
    def: 20,
    attack: 21,
    experienceReward: 3500,
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
