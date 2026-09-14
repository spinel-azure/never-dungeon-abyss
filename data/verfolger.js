export const VERFOLGER_DEFEAT_MESSAGE = 'フェルフォルガーは「ギャギャッ！」と耳障りな叫び声を上げながら姿を消した…。';
export const verfolger = Object.freeze({
  id: 'verfolger', name: 'フェルフォルガー', level: 100,
  imageId: 'verfolger', image: 'images/bosses/boss_22.avif', battleSize: 'huge-wide',
  ambientEffect: 'blood-drip', race: 'beast', randomEncounter: false, isBoss: true, battleBgmKey: 'eventBoss',
  maxHp: 12000, attack: 48, def: 40,
  stats: Object.freeze({ str: 46, int: 20, agi: 32, dex: 40, luc: 30 }),
  experienceReward: 30000, noDrop: true, escapeRate: 1, surpriseRate: 0, surpriseRateMaximum: 0,
  elementMultipliers: Object.freeze({ fire: 1, ice: 1, lightning: .5, holy: 1.5, dark: 1, arcane: 1 }),
  statusResistances: Object.freeze({
    bleeding: Object.freeze({ resistancePoints: 65, immune: false }),
    poison: Object.freeze({ resistancePoints: 65, immune: false }),
    deadly_poison: Object.freeze({ resistancePoints: 90, immune: false }),
    death_poison: Object.freeze({ resistancePoints: 90, immune: false }),
    action_skip: Object.freeze({ resistancePoints: 80, immune: false }),
    speed_down: Object.freeze({ resistancePoints: 50, immune: false }),
    instant_death: Object.freeze({ resistancePoints: 100, immune: true })
  }),
  actions: Object.freeze([
    Object.freeze({ weight: 40, action: Object.freeze({ id: 'verfolger_claw', name: '裂爪', actionType: 'physicalAttack', hitCount: 1, powerPerHit: 1, effects: Object.freeze([]) }) }),
    Object.freeze({ weight: 35, action: Object.freeze({ id: 'verfolger_bites', name: '連続かみつき', actionType: 'physicalAttack', hitCount: 2, powerPerHit: .65,
      effects: Object.freeze([Object.freeze({ statusId: 'bleeding', trigger: 'firstHitOnly', statusKind: 'physical', baseRate: .3 })]) }) }),
    Object.freeze({ weight: 25, action: Object.freeze({ id: 'verfolger_hunt', name: '狩りの構え', actionType: 'prepareAction',
      prepareMessage: 'フェルフォルガーは身を低く沈め、狩りの構えを取った！',
      reservedAction: Object.freeze({ id: 'verfolger_rend', name: '獲物裂き', actionType: 'physicalAttack', hitCount: 1, powerPerHit: 2,
        canceledMessage: 'フェルフォルガーの獲物裂きは阻まれた！',
        effects: Object.freeze([Object.freeze({ statusId: 'deadly_poison', trigger: 'firstHitOnly', statusKind: 'physical', baseRate: .4 })]) }) }) })
  ]),
  reservedActionBreakTrait: Object.freeze({ element: 'holy', requireActualHpDamage: true,
    message: '聖なる光がフェルフォルガーを怯ませ、狩りの構えが崩れた！' })
});

export function recordVerfolgerDefeat(character, depth) {
  const floor = Math.floor(Number(depth));
  if (!character || floor < 90 || floor > 98) return character;
  return { ...character, eventFlags: { ...character.eventFlags,
    achievement_verfolger_defeated: true, [`verfolger_b${floor}_defeated`]: true } };
}
export function isVerfolgerDefeatedOnFloor(character, depth) {
  return Boolean(character?.eventFlags?.[`verfolger_b${Math.floor(Number(depth))}_defeated`]);
}