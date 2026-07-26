import {
  getLevelForExperience,
  getLevelGrowth,
  normalizeExperience
} from "../data/growth.js?v=20260727-2";

export function createInnRecovery(character) {
  return {
    hp: character.maxHp,
    sp: character.maxSp,
    statuses: [],
    condition: "GOOD",
    alive: true
  };
}

export function awardBattleExperience(character, amount) {
  const reward = Math.max(0, Math.floor(Number(amount) || 0));
  return {
    carriedExperience: Math.max(0, Math.floor(Number(character.carriedExperience) || 0)) + reward
  };
}

export function resolveInnStay(character) {
  const gainedExperience = Math.max(0, Math.floor(Number(character.carriedExperience) || 0));
  const experience = normalizeExperience((Number(character.experience) || 0) + gainedExperience);
  const previousLevel = Math.max(1, Math.floor(Number(character.level) || 1));
  const level = getLevelForExperience(experience);
  const growth = getLevelGrowth(character.job, level);
  return {
    changes: {
      experience,
      carriedExperience: 0,
      level,
      deckCost: growth.deckCost,
      maxHp: growth.hp,
      maxSp: growth.sp,
      hp: growth.hp,
      sp: growth.sp,
      statuses: [],
      condition: "GOOD",
      alive: true
    },
    gainedExperience,
    levelsGained: Math.max(0, level - previousLevel)
  };
}

export function createTempleRevival(character) {
  return {
    hp: 1,
    sp: character.sp,
    statuses: [],
    condition: "GOOD",
    alive: true
  };
}
