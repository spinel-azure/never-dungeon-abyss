export const BOSSES = Object.freeze({
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
    transferUnlockFlag: "transfer_portal_b10f_unlocked"
  })
});

export function getBossById(id) {
  return BOSSES[String(id || "")] || null;
}

export function isBossDefeated(character, bossOrId) {
  const boss = typeof bossOrId === "string" ? getBossById(bossOrId) : bossOrId;
  return Boolean(boss?.defeatedFlag && character?.eventFlags?.[boss.defeatedFlag]);
}

export function applyBossVictory(character, bossOrId) {
  const boss = typeof bossOrId === "string" ? getBossById(bossOrId) : bossOrId;
  if (!character || !boss) return { character, accepted: false, reward: null };
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
    reward: structuredClone(boss.reward || { type: "none" }),
    elementMultipliers: { ...boss.elementMultipliers },
    statusResistances: structuredClone(boss.statusResistances || {}),
    statuses: [],
    alive: true
  };
}
