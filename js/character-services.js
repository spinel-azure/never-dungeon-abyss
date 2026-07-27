import {
  getLevelForExperience,
  getLevelGrowth,
  normalizeExperience
} from "../data/growth.js";
import { grantItem } from "../data/inventory.js";

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
  const previousGrowth = getLevelGrowth(character.job, previousLevel);
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
    levelsGained: Math.max(0, level - previousLevel),
    hpGained: Math.max(0, growth.hp - previousGrowth.hp),
    spGained: Math.max(0, growth.sp - previousGrowth.sp),
    deckCostGained: Math.max(0, growth.deckCost - previousGrowth.deckCost)
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

export function grantEventItems(character, flagId, itemIds) {
  if (!character || character.eventFlags?.[flagId]) {
    return { character, gainedItemIds: [], alreadyReceived: true };
  }
  const next = structuredClone(character);
  const gainedItemIds = [];
  for (const itemId of itemIds || []) {
    const result = grantItem(next.inventory, itemId, 1);
    next.inventory = result.inventory;
    if (result.gained > 0) gainedItemIds.push(itemId);
  }
  next.eventFlags = { ...(next.eventFlags || {}), [flagId]: true };
  return { character: next, gainedItemIds, alreadyReceived: false };
}
