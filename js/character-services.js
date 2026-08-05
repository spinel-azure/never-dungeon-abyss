import {
  getLevelForExperience,
  getLevelGrowth,
  normalizeExperience
} from "../data/growth.js";
import { grantItemWithOverflow } from "../data/inventory.js";
import {
  calculateDepthReturnSettlement,
  normalizeDepthReturnSettlement
} from "../data/experience-settlement.js";
import { getLevelUnlockedSkillIds } from "../data/skills.js";

export const TOWN_INTRODUCTION_FLAGS = Object.freeze([
  "inn_first_talk_card",
  "temple_first_talk_items",
  "shop_first_talk_items",
  "library_first_talk_card"
]);
export const TEMPLE_POISON_TREATMENT_FEE = 15;

export function createInnRecovery(character) {
  const statuses = retainPoisonStatuses(character);
  return {
    hp: character.maxHp,
    sp: character.maxSp,
    statuses,
    condition: statuses.length ? "POISON" : "GOOD",
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
  const persistentStatuses = retainPoisonStatuses(character);
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
  const previousSkillIds = Array.isArray(character.skillIds) ? character.skillIds : [];
  const unlockedSkillIds = getLevelUnlockedSkillIds(character.job, level);
  const skillIds = [...new Set([...previousSkillIds, ...unlockedSkillIds])];
  const learnedSkillIds = skillIds.filter(id => !previousSkillIds.includes(id));
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
      statuses: persistentStatuses,
      condition: persistentStatuses.length ? "POISON" : "GOOD",
      alive: true,
      skillIds
    },
    settlement,
    hadPendingSettlement: Boolean(pendingSettlement),
    gainedExperience,
    levelsGained: Math.max(0, level - previousLevel),
    hpGained: Math.max(0, growth.hp - previousGrowth.hp),
    spGained: Math.max(0, growth.sp - previousGrowth.sp),
    deckCostGained: Math.max(0, growth.deckCost - previousGrowth.deckCost),
    learnedSkillIds
  };
}

export function getInnStayFee(character) {
  return Math.max(2, Math.floor(Number(character?.level) || 1) * 2);
}

export function createInnStableRecovery(character) {
  const maxHp = Math.max(1, Math.floor(Number(character?.maxHp) || 1));
  const maxSp = Math.max(0, Math.floor(Number(character?.maxSp) || 0));
  return {
    hp: Math.min(maxHp, Math.max(0, Math.floor(Number(character?.hp) || 0)) + Math.ceil(maxHp * 0.3)),
    sp: Math.min(maxSp, Math.max(0, Math.floor(Number(character?.sp) || 0)) + Math.ceil(maxSp * 0.3))
  };
}

export function resolveInnStableStay(character) {
  const result = resolveInnStay(character);
  const recovery = createInnStableRecovery({
    ...character,
    maxHp: result.changes.maxHp,
    maxSp: result.changes.maxSp
  });
  return {
    ...result,
    changes: {
      ...result.changes,
      ...recovery,
      statuses: [...(character?.statuses || [])],
      condition: character?.condition || "GOOD",
      alive: character?.alive !== false
    }
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

function retainPoisonStatuses(character) {
  return structuredClone(character?.statuses || []).filter(status => (status.statusId || status.id) === "poison");
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

export function resolveTemplePoisonTreatment(character) {
  const poisonStatuses = (character?.statuses || []).filter(status => (status.statusId || status.id) === "poison");
  if (!poisonStatuses.length) return { character, success: false, reason: "notPoisoned", fee: TEMPLE_POISON_TREATMENT_FEE };
  const gold = Math.max(0, Math.floor(Number(character?.gold) || 0));
  if (gold < TEMPLE_POISON_TREATMENT_FEE) return { character, success: false, reason: "insufficientGold", fee: TEMPLE_POISON_TREATMENT_FEE };
  const next = structuredClone(character);
  next.gold = gold - TEMPLE_POISON_TREATMENT_FEE;
  next.statuses = (next.statuses || []).filter(status => (status.statusId || status.id) !== "poison");
  next.condition = "GOOD";
  return { character: next, success: true, reason: "treated", fee: TEMPLE_POISON_TREATMENT_FEE };
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
    const result = grantItemWithOverflow(next, itemId, 1);
    Object.assign(next, result.character);
    if (result.gained > 0 || result.stored > 0) gainedItemIds.push(itemId);
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
