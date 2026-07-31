import {
  getLevelForExperience,
  getLevelGrowth,
  normalizeExperience
} from "../data/growth.js";
import { grantItem } from "../data/inventory.js";
import {
  calculateDepthReturnSettlement,
  normalizeDepthReturnSettlement
} from "../data/experience-settlement.js";

export const TOWN_INTRODUCTION_FLAGS = Object.freeze([
  "inn_first_talk_card",
  "temple_first_talk_items",
  "shop_first_talk_items",
  "library_first_talk_card"
]);

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
    carriedExperience: Math.max(0, Math.floor(Number(character.carriedExperience) || 0)) + reward,
    pendingExperienceSettlement: null
  };
}

export function resolveInnStay(character) {
  const baseSettlementExp = Math.max(
    0,
    Math.floor(Number(character.carriedExperience) || 0)
  );
  const pendingSettlement = normalizeDepthReturnSettlement(
    character.pendingExperienceSettlement,
    baseSettlementExp
  );
  const settlement = pendingSettlement || calculateDepthReturnSettlement({
    baseSettlementExp,
    returnFloor: 0,
    isGoddessGraceEquipped: false
  });
  const gainedExperience = settlement.finalSettlementExp;
  const experience = normalizeExperience((Number(character.experience) || 0) + gainedExperience);
  const previousLevel = Math.max(1, Math.floor(Number(character.level) || 1));
  const level = getLevelForExperience(experience);
  const previousGrowth = getLevelGrowth(character.job, previousLevel);
  const growth = getLevelGrowth(character.job, level);
  const maxHpBonus = getVitalBonus(character, "maxHp");
  const maxSpBonus = getVitalBonus(character, "maxSp");
  const maxHp = growth.hp + maxHpBonus;
  const maxSp = growth.sp + maxSpBonus;
  return {
    changes: {
      experience,
      carriedExperience: 0,
      pendingExperienceSettlement: null,
      level,
      deckCost: growth.deckCost,
      maxHp,
      maxSp,
      hp: maxHp,
      sp: maxSp,
      statuses: [],
      condition: "GOOD",
      alive: true
    },
    settlement,
    hadPendingSettlement: Boolean(pendingSettlement),
    gainedExperience,
    levelsGained: Math.max(0, level - previousLevel),
    hpGained: Math.max(0, growth.hp - previousGrowth.hp),
    spGained: Math.max(0, growth.sp - previousGrowth.sp),
    deckCostGained: Math.max(0, growth.deckCost - previousGrowth.deckCost)
  };
}

function getVitalBonus(character, key) {
  const equipment = Math.max(
    0,
    Math.floor(Number(character?.equipmentStatBonuses?.[key]) || 0)
  );
  const cards = Math.max(
    0,
    Math.floor(Number(character?.cardStatBonuses?.[key]) || 0)
  );
  return equipment + cards;
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

export function resolveDungeonDefeat(character, { preserveExperience = false } = {}) {
  return {
    ...createTempleRevival(character),
    carriedExperience: preserveExperience
      ? Math.max(0, Math.floor(Number(character?.carriedExperience) || 0))
      : 0,
    pendingExperienceSettlement: null
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

export function unlockGuildRequest(character) {
  if (!character || character.eventFlags?.guild_first_request_unlocked) {
    return { character, unlocked: false };
  }
  const completed = TOWN_INTRODUCTION_FLAGS.every(flag => character.eventFlags?.[flag]);
  if (!completed) return { character, unlocked: false };
  return {
    character: {
      ...character,
      eventFlags: {
        ...(character.eventFlags || {}),
        guild_first_request_unlocked: true
      }
    },
    unlocked: true
  };
}
