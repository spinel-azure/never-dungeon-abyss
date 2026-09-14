export const ZENTAURIN_ID = "zentaurin_b96f";
export const ZENTAURIN_SEAL_MESSAGE = "封印の矢により、スキル・呪文・奇蹟は使用できない！";

export const ZENTAURIN = Object.freeze({
  id: ZENTAURIN_ID, name: "ツェンタウリン", level: 110, floor: 96,
  imageId: ZENTAURIN_ID, image: "images/bosses/boss_24.avif",
  encounterImageId: "zentaurin_event_b96f", encounterImage: "images/background/dungeon_event_15.avif",
  battleSize: "huge-wide", race: "beast", maxHp: 40000,
  stats: { str: 30, int: 20, agi: 28, dex: 30, luc: 26 },
  def: 42, attack: 58, experienceReward: 45000,
  escapeRate: 1, surpriseRate: 0, surpriseRateMaximum: 0,
  noDrop: true, isBoss: true, bossKind: "event", battleBgmKey: "eventBoss",
  defeatedFlag: "achievement_zentaurin_defeated",
  reward: { type: "card", cardId: "zodiac_sagittarius", amount: 1 },
  elementMultipliers: { fire: 1, ice: 1, lightning: 1, holy: 1, dark: 1, arcane: 1 },
  statusResistances: {
    poison: { resistancePoints: 65, immune: false },
    deadly_poison: { resistancePoints: 90, immune: false },
    death_poison: { resistancePoints: 90, immune: false },
    bleeding: { resistancePoints: 65, immune: false },
    action_skip: { resistancePoints: 90, immune: false },
    speed_down: { resistancePoints: 75, immune: false }
  },
  actions: [
    { weight: 60, action: { id: "zentaurin_triple", name: "三連射", actionType: "physicalAttack", hitCount: 3, powerPerHit: 0.65,
      afterDamageStatus: { statusId: "bleeding", baseRate: 0.3 } } },
    { weight: 20, action: { id: "zentaurin_pride", name: "ツェンタウルの誇り", actionType: "zentaurinPride" } },
    { weight: 20, action: { id: "zentaurin_prepare", name: "星穿ちの矢の準備", actionType: "prepareAction",
      prepareMessage: "ツェンタウリンは弓を引き絞り、あなたに狙いを定めた！",
      reservedAction: { id: "zentaurin_star_arrow", name: "星穿ちの矢", actionType: "physicalAttack", hitCount: 1, powerPerHit: 2, turnPriority: -100 } } }
  ],
  event: {
    prompt: "扉を開けて中に入ると、部屋の中央に女性のケンタウロスが静かに座っていた。\n逞しく、引き締まった肢体を露わにする一方で兜で顔を覆い、表情を伺い知る事は出来ない。\n＊Aボタンで次へ",
    start: "彼女はこちらに気付くと、おもむろに矢を番えた！",
    autoStartDelay: 3000, reserveMessageLines: 7,
    remains: "部屋は静まり返っている。ツェンタウリンの姿はもうない。\n＊Aボタン：次へ"
  }
});

export function getZentaurinOpening(enemy, deckSlots = []) {
  if (enemy?.id !== ZENTAURIN_ID) return null;
  const broken = deckSlots.includes("zodiac_aries");
  return { broken, sealed: !broken, message: broken
    ? "ツェンタウリンが構えた封印の矢を破壊した！"
    : `ツェンタウリンの封印の矢！\n${ZENTAURIN_SEAL_MESSAGE}` };
}
