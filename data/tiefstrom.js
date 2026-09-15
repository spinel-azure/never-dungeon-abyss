export const TIEFSTROM_ID = "tiefstrom_b76f";
export const TIEFSTROM_SECOND_ID = "tiefstrom_b76f_b";
export const TIEFSTROM = Object.freeze({
  id: TIEFSTROM_ID, name: "タイフシュトローム", level: 90, floor: 76,
  imageId: TIEFSTROM_ID, image: "images/bosses/boss_25.avif",
  encounterImageId: "tiefstrom_event_b76f", encounterImage: "images/background/dungeon_event_16.avif",
  encounterEnemyIds: [TIEFSTROM_ID, TIEFSTROM_SECOND_ID],
  battleSize: "large", race: "beast", maxHp: 4000,
  stats: { str: 30, int: 26, agi: 24, dex: 28, luc: 24 }, def: 30, attack: 38,
  experienceReward: 25000, escapeRate: 1, surpriseRate: 0, surpriseRateMaximum: 0,
  noDrop: true, isBoss: true, bossKind: "event", battleBgmKey: "eventBoss",
  distantTarget: true, twinWhirlpool: true, ambientEffect: "water-splash",
  defeatedFlag: "boss_tiefstrom_b76f_defeated",
  reward: { type: "card", cardId: "zodiac_pisces", amount: 1 },
  elementMultipliers: { lightning: 1.5, ice: .5, fire: 1, holy: 1, dark: 1, arcane: 1 },
  statusResistances: {
    instantDeath: { immune: true, resistancePoints: 100 },
    poison: { resistancePoints: 50 }, deadly_poison: { resistancePoints: 50 },
    bleeding: { resistancePoints: 50 }, action_skip: { resistancePoints: 80 }
  },
  actions: [
    { weight: 40, action: { id: "tiefstrom_scale", name: "鱗刃飛ばし", actionType: "physicalAttack", hitCount: 1, powerPerHit: 1,
      afterDamageStatus: { statusId: "bleeding", baseRate: .3 } } },
    { weight: 30, action: { id: "tiefstrom_double", name: "双鱗射", actionType: "physicalAttack", hitCount: 2, powerPerHit: .65 } },
    { weight: 20, action: { id: "tiefstrom_spray", name: "逆巻く飛沫", actionType: "spell", element: "arcane", spellPower: 32, powerMultiplier: 1 } },
    { weight: 10, action: { id: "tiefstrom_prepare", name: "深淵の大渦の準備", actionType: "prepareAction",
      prepareMessage: "タイフシュトロームが深く潜った！\n海面に巨大な渦が生まれ始めている……！",
      reservedAction: { id: "tiefstrom_whirlpool", name: "深淵の大渦", actionType: "spell", element: "arcane", spellPower: 65, powerMultiplier: 1, guardable: true, turnPriority: -100 } } }
  ],
  battleIntro: "二匹の巨大魚は、崖から遠く離れた荒波の中を泳いでいる。\nこの距離では、近接攻撃は届きそうにない……。",
  event: {
    prompt: "足元は切り立った崖となっており、思わず足がすくんだ。目前には荒れ狂う海が広がり、ここが本当に迷宮なのかと思わず疑いたくなる。\n\n＊Aボタンで次へ　Bボタンで立ち去る",
    start: "そして荒波の中から突如、2匹の巨大な魚が姿を現すとこちらに向かって襲いかかってくる！",
    autoStartDelay: 3000, reserveMessageLines: 7,
    remains: "荒れ狂っていた海は静まり返っている。\n＊Aボタン：次へ"
  }
});
export const TIEFSTROM_SECOND = Object.freeze({ ...TIEFSTROM, id: TIEFSTROM_SECOND_ID });
