export const BOSSES = Object.freeze({
  lingering_ghost_b2f: Object.freeze({
    id: "lingering_ghost_b2f",
    name: "未練ある亡霊",
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
    floor: 19,
    imageId: "fallen_mage_b19f",
    image: "images/bosses/boss_03.avif",
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
      prompt: "ひとりの魔術師が、下り階段を背にして立ちはだかっている。\n戦いますか？\n＊Aボタン：はい　Bボタン：いいえ",
      start: "魔術師の周囲に、禍々しい魔力が渦巻く。\n堕落した魔術師が襲いかかってきた！"
    })
  }),
  quest_mimic_b6f: Object.freeze({
    id: "quest_mimic_b6f", name: "ミミック", floor: 6,
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
    experienceReward: 100,
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
