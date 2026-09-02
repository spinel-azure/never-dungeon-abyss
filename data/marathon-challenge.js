import { B80_TRANSFER_FLAG, isB80TransferUnlocked } from "./b80-transfer-unlock.js";

export const MARATHON_START_DEPTH = 1;
export const MARATHON_GOAL_DEPTH = 42;
export const MARATHON_BOSS_FLOORS = Object.freeze([9, 19, 29, 39]);
export const MARATHON_REWARD_CARD_ID = "zodiac_capricorn";
export const MARATHON_COMPLETION_FLAG = "b1_b42_marathon_completed";
export const LONG_MARCH_GOAL_DEPTH = 84;
export const LONG_MARCH_COMPLETION_FLAG = "b1_b84_long_march_completed";
export const LONG_MARCH_REQUIRED_TRANSFER_FLAG = B80_TRANSFER_FLAG;
export const LONG_MARCH_REWARD_CARD_ID = "zodiac_taurus";

export function createInitialMarathonChallenge() {
  return { active: false, currentDepth: 0 };
}

export function createInitialLongMarchChallenge() {
  return { active: false, currentDepth: 0 };
}

export function normalizeMarathonChallenge(value) {
  if (!value || typeof value !== "object" || value.active !== true) {
    return createInitialMarathonChallenge();
  }
  const currentDepth = Math.max(
    MARATHON_START_DEPTH,
    Math.min(MARATHON_GOAL_DEPTH - 1, Math.floor(Number(value.currentDepth) || MARATHON_START_DEPTH))
  );
  return { active: true, currentDepth };
}

export function normalizeLongMarchChallenge(value) {
  if (!value || typeof value !== "object" || value.active !== true) {
    return createInitialLongMarchChallenge();
  }
  const currentDepth = Math.max(
    MARATHON_START_DEPTH,
    Math.min(LONG_MARCH_GOAL_DEPTH - 1, Math.floor(Number(value.currentDepth) || MARATHON_START_DEPTH))
  );
  return { active: true, currentDepth };
}

export function startMarathonChallenge(character) {
  if (!character || character.eventFlags?.[MARATHON_COMPLETION_FLAG]) return character;
  return {
    ...character,
    marathonChallenge: { active: true, currentDepth: MARATHON_START_DEPTH }
  };
}

export function startLongMarchChallenge(character) {
  if (!character
    || character.eventFlags?.[LONG_MARCH_COMPLETION_FLAG]
    || !isB80TransferUnlocked(character)) return character;
  return {
    ...character,
    longMarchChallenge: { active: true, currentDepth: MARATHON_START_DEPTH }
  };
}

export function invalidateMarathonChallenge(character) {
  if (!character?.marathonChallenge?.active) return character;
  return { ...character, marathonChallenge: createInitialMarathonChallenge() };
}

export function invalidateLongMarchChallenge(character) {
  if (!character?.longMarchChallenge?.active) return character;
  return { ...character, longMarchChallenge: createInitialLongMarchChallenge() };
}

export function recordLongMarchDescent(character, { fromDepth, toDepth } = {}) {
  const challenge = normalizeLongMarchChallenge(character?.longMarchChallenge);
  if (!character || !challenge.active) return { character, completed: false };
  const from = Math.floor(Number(fromDepth) || 0);
  const to = Math.floor(Number(toDepth) || 0);
  if (challenge.currentDepth !== from || to !== from + 1) {
    return { character: invalidateLongMarchChallenge(character), completed: false };
  }
  if (to < LONG_MARCH_GOAL_DEPTH) {
    return {
      character: { ...character, longMarchChallenge: { active: true, currentDepth: to } },
      completed: false
    };
  }
  return {
    character: {
      ...character,
      longMarchChallenge: createInitialLongMarchChallenge(),
      eventFlags: {
        ...(character.eventFlags || {}),
        [LONG_MARCH_COMPLETION_FLAG]: true
      }
    },
    completed: true
  };
}

export function recordMarathonDescent(character, {
  fromDepth,
  toDepth,
  defeatedBossFloors = []
} = {}) {
  const challenge = normalizeMarathonChallenge(character?.marathonChallenge);
  if (!character || !challenge.active) return { character, completed: false, missingBossFloors: [] };
  const from = Math.floor(Number(fromDepth) || 0);
  const to = Math.floor(Number(toDepth) || 0);
  if (challenge.currentDepth !== from || to !== from + 1) {
    return {
      character: invalidateMarathonChallenge(character),
      completed: false,
      missingBossFloors: []
    };
  }
  if (to < MARATHON_GOAL_DEPTH) {
    return {
      character: { ...character, marathonChallenge: { active: true, currentDepth: to } },
      completed: false,
      missingBossFloors: []
    };
  }
  const defeated = new Set((defeatedBossFloors || []).map(value => Math.floor(Number(value) || 0)));
  const missingBossFloors = MARATHON_BOSS_FLOORS.filter(floor => !defeated.has(floor));
  if (missingBossFloors.length > 0) {
    return {
      character: invalidateMarathonChallenge(character),
      completed: false,
      missingBossFloors
    };
  }
  return {
    character: {
      ...character,
      marathonChallenge: createInitialMarathonChallenge(),
      eventFlags: {
        ...(character.eventFlags || {}),
        [MARATHON_COMPLETION_FLAG]: true
      }
    },
    completed: true,
    missingBossFloors: []
  };
}
