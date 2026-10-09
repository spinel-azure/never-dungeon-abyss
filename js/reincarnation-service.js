import { normalizeCharacter, getCharacterClass } from "../data/classes.js";
import { DECK_SLOT_COUNT } from "../data/deck.js";
import { hasKeyItem } from "../data/key-items.js";
import { MAX_LEVEL } from "../data/growth.js";
import { createInitialPlayerCharge } from "../combat/player-charge.js";
import {
  MAX_REINCARNATIONS,
  getReincarnationCost,
  getReincarnationExperienceMultiplier,
  normalizeReincarnationCount
} from "../data/reincarnation.js";

export function hasReincarnationQualification(character) {
  const count = normalizeReincarnationCount(character?.reincarnationCount);
  return Boolean(character
    && count < MAX_REINCARNATIONS
    && Number(character.level) >= MAX_LEVEL
    && character.eventFlags?.boss_amayenak_b100f_defeated
    && hasKeyItem(character.keyItems, "royal_cat_medal"));
}

export function getReincarnationPreview(character) {
  const currentCount = normalizeReincarnationCount(character?.reincarnationCount);
  const nextCount = Math.min(MAX_REINCARNATIONS, currentCount + 1);
  const fee = getReincarnationCost(nextCount);
  let reason = "";
  if (!character) reason = "noCharacter";
  else if (currentCount >= MAX_REINCARNATIONS) reason = "maximumReached";
  else if (Number(character.level) < MAX_LEVEL) reason = "levelRequired";
  else if (!character.eventFlags?.boss_amayenak_b100f_defeated) reason = "amayenakRequired";
  else if (!hasKeyItem(character.keyItems, "royal_cat_medal")) reason = "medalRequired";
  else if (Math.max(0, Math.floor(Number(character.gold) || 0)) < fee) reason = "insufficientGold";

  const nextCharacter = character ? buildReincarnatedCharacter(character, nextCount, fee) : null;
  return {
    accepted: !reason,
    reason,
    currentCount,
    nextCount,
    fee,
    experienceMultiplier: getReincarnationExperienceMultiplier(nextCount),
    goldAfter: Math.max(0, Math.floor(Number(character?.gold) || 0) - fee),
    currentMaxHp: Math.max(1, Math.floor(Number(character?.maxHp) || 1)),
    currentMaxSp: Math.max(0, Math.floor(Number(character?.maxSp) || 0)),
    nextMaxHp: nextCharacter?.maxHp || 0,
    nextMaxSp: nextCharacter?.maxSp || 0,
    nextCharacter
  };
}

export function applyReincarnation(character) {
  const preview = getReincarnationPreview(character);
  return preview.accepted
    ? { ...preview, character: preview.nextCharacter }
    : { ...preview, character };
}

function buildReincarnatedCharacter(character, nextCount, fee) {
  const characterClass = getCharacterClass(character.job);
  const cards = {
    ...character.cards,
    deckSlots: Array(DECK_SLOT_COUNT).fill(null)
  };
  const reincarnated = normalizeCharacter({
    ...structuredClone(character),
    level: 1,
    reincarnationCount: nextCount,
    experience: 0,
    carriedExperience: 0,
    guildExperiencePool: 0,
    pendingExperienceSettlement: null,
    deckCost: 3,
    cards,
    skillIds: [...(characterClass?.initialSkillIds || [])],
    statuses: [],
    condition: "GOOD",
    alive: true,
    adventureDefeatRecoveryUsed: false,
    playerCharge: createInitialPlayerCharge(),
    gold: Math.max(0, Math.floor(Number(character.gold) || 0) - fee),
    eventFlags: {
      ...(character.eventFlags || {}),
      achievement_level_197_reached: true,
      reincarnation_unlocked_notified: true
    }
  });
  return { ...reincarnated, hp: reincarnated.maxHp, sp: reincarnated.maxSp };
}
