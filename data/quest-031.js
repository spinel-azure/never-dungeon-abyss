import { consumeKeyItem, grantKeyItem, hasKeyItem } from "./key-items.js";
import {
  JOHANNA_RESCUE_QUEST_ID,
  MAERCHENTIERE_QUEST_ID,
  getQuestProgress,
  recordCustomQuestProgress
} from "./quests.js";

export const JOHANNA_RESCUE_RUMOR_READ_FLAG = "tavern_rumor_008_base_read";
export const JOHANNA_RESCUE_REQUEST_UNLOCKED_FLAG = "quest_031_anna_request_unlocked";
export const JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG = "quest_031_kirke_consulted";
export const JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG = "quest_031_spring_intro_seen";
export const FLEISCHFRESSERKNOSPE_DEFEATED_FLAG = "boss_fleischfresserknospe_b57f_defeated";
export const JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG = "quest_031_night_dew_flower_received";
export const JOHANNA_RESCUE_MEDICINE_BREWED_FLAG = "quest_031_medicine_brewed";
export const JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG = "quest_031_medicine_delivered";
export const JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG = "quest_031_anna_recovery_completed";
export const JOHANNA_RESCUE_THANKS_PENDING_FLAG = "quest_031_johanna_thanks_pending";
export const JOHANNA_RESCUE_THANKS_SEEN_FLAG = "quest_031_johanna_thanks_seen";
export const JOHANNA_BONUS_UNLOCKED_FLAG = "johanna_bonus_unlocked";
export const NIGHT_DEW_FLOWER_KEY_ITEM_ID = "night_dew_flower";
export const JOHANNA_MEDICINE_KEY_ITEM_ID = "johanna_medicine";
export const POST_QUEST_ANNA_KEEPER_RATE = 0.25;

export function getJohannaRescueInnPhase(character) {
  const flags = character?.eventFlags || {};
  if (flags[JOHANNA_RESCUE_THANKS_PENDING_FLAG]
    && !flags[JOHANNA_RESCUE_THANKS_SEEN_FLAG]) return "johannaThanks";
  if (flags[JOHANNA_RESCUE_THANKS_SEEN_FLAG]) return "postQuest";
  if (flags[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]
    || flags[JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG]) return "annaHappy";
  if (flags[JOHANNA_RESCUE_RUMOR_READ_FLAG]) return "annaSad";
  return "normal";
}

export function getJohannaRescueKirkeMode(character) {
  const progress = getQuestProgress(character, JOHANNA_RESCUE_QUEST_ID);
  const flags = character?.eventFlags || {};
  if (!progress.active || progress.completed
    || flags[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]
    || flags[JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG]) return "none";
  if (hasKeyItem(character?.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID)
    || flags[JOHANNA_RESCUE_MEDICINE_BREWED_FLAG]) return "medicineReady";
  if (hasKeyItem(character?.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID)) return "brew";
  return flags[JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG] ? "reminder" : "consult";
}

export function canEnterJohannaRescueSpring(character) {
  return ["intro", "retry", "flowerHandoff"].includes(getJohannaRescueSpringMode(character));
}

export function getJohannaRescueSpringMode(character) {
  const progress = getQuestProgress(character, JOHANNA_RESCUE_QUEST_ID);
  const flags = character?.eventFlags || {};
  if (!progress.active || progress.completed || !flags[JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG]) {
    return "unavailable";
  }
  if (flags[JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG]
    || flags[JOHANNA_RESCUE_MEDICINE_BREWED_FLAG]
    || flags[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]
    || flags[JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG]) return "resolved";
  if (flags[FLEISCHFRESSERKNOSPE_DEFEATED_FLAG]) return "flowerHandoff";
  return flags[JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG] ? "retry" : "intro";
}

export function unlockJohannaRescueQuest(character) {
  if (!character) return transition(character, false, "missingCharacter");
  const prerequisitesMet = getQuestProgress(character, MAERCHENTIERE_QUEST_ID).completed;
  if (!prerequisitesMet || !character.eventFlags?.[JOHANNA_RESCUE_RUMOR_READ_FLAG]) {
    return transition(character, false, "notReady");
  }
  if (character.eventFlags?.[JOHANNA_RESCUE_REQUEST_UNLOCKED_FLAG]) {
    return transition(character, true, "alreadyUnlocked", { changed: false });
  }
  return transition(withFlags(character, {
    [JOHANNA_RESCUE_REQUEST_UNLOCKED_FLAG]: true
  }), true, "", { changed: true });
}

export function consultKirkeForJohannaMedicine(character) {
  if (!isActiveJohannaRescue(character)) return transition(character, false, "notReady");
  if (character.eventFlags?.[JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG]) {
    return transition(character, true, "alreadyConsulted", { changed: false });
  }
  return transition(withFlags(character, {
    [JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG]: true
  }), true, "", { changed: true });
}

export function markJohannaRescueSpringIntroSeen(character) {
  if (!canEnterJohannaRescueSpring(character)) return transition(character, false, "notReady");
  if (character.eventFlags?.[JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG]) {
    return transition(character, true, "alreadySeen", { changed: false });
  }
  return transition(withFlags(character, {
    [JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG]: true
  }), true, "", { changed: true });
}

export function recordFleischfresserknospeDefeat(character) {
  if (!isActiveJohannaRescue(character)
    || !character?.eventFlags?.[JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG]) {
    return transition(character, false, "notReady");
  }
  if (character.eventFlags?.[FLEISCHFRESSERKNOSPE_DEFEATED_FLAG]) {
    return transition(character, true, "alreadyDefeated", { changed: false });
  }
  return transition(withFlags(character, {
    [FLEISCHFRESSERKNOSPE_DEFEATED_FLAG]: true
  }), true, "", { changed: true });
}

export function grantJohannaRescueFlower(character) {
  if (!isActiveJohannaRescue(character)
    || !character?.eventFlags?.[FLEISCHFRESSERKNOSPE_DEFEATED_FLAG]) {
    return transition(character, false, "notReady", { gained: false });
  }
  if (character.eventFlags?.[JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG]) {
    return transition(character, true, "alreadyReceived", { changed: false, gained: false });
  }
  const granted = grantKeyItem(character.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID);
  return transition({
    ...character,
    keyItems: granted.keyItems,
    eventFlags: {
      ...(character.eventFlags || {}),
      [JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG]: true
    }
  }, true, "", { changed: true, gained: Boolean(granted.gained) });
}

export function brewJohannaMedicine(character) {
  if (!isActiveJohannaRescue(character)) {
    return transition(character, false, "notReady", { brewed: false });
  }
  if (character.eventFlags?.[JOHANNA_RESCUE_MEDICINE_BREWED_FLAG]
    || character.eventFlags?.[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]) {
    return transition(character, true, "alreadyBrewed", { changed: false, brewed: false });
  }
  if (hasKeyItem(character.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID)) {
    return transition(withFlags(character, {
      [JOHANNA_RESCUE_MEDICINE_BREWED_FLAG]: true
    }), true, "recoveredExistingMedicine", { changed: true, brewed: false });
  }
  const consumed = consumeKeyItem(character.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID);
  if (!consumed.consumed) return transition(character, false, "missingFlower", { brewed: false });
  const granted = grantKeyItem(consumed.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID);
  if (!granted.gained) return transition(character, false, "medicineGrantFailed", { brewed: false });
  return transition({
    ...character,
    keyItems: granted.keyItems,
    eventFlags: {
      ...(character.eventFlags || {}),
      [JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG]: true,
      [JOHANNA_RESCUE_MEDICINE_BREWED_FLAG]: true
    }
  }, true, "", { changed: true, brewed: true });
}

export function deliverJohannaMedicine(character) {
  if (!isActiveJohannaRescue(character)) {
    return transition(character, false, "notReady", { delivered: false });
  }
  if (character.eventFlags?.[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]) {
    return transition(character, true, "alreadyDelivered", { changed: false, delivered: false });
  }
  const consumed = consumeKeyItem(character.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID);
  if (!consumed.consumed) return transition(character, false, "missingMedicine", { delivered: false });
  return transition({
    ...character,
    keyItems: consumed.keyItems,
    eventFlags: {
      ...(character.eventFlags || {}),
      [JOHANNA_RESCUE_MEDICINE_BREWED_FLAG]: true,
      [JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]: true
    }
  }, true, "", { changed: true, delivered: true });
}

export function completeJohannaRecovery(character) {
  if (!isActiveJohannaRescue(character)
    || !character?.eventFlags?.[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG]) {
    return transition(character, false, "notReady", { completed: false });
  }
  if (character.eventFlags?.[JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG]) {
    return transition(character, true, "alreadyCompleted", { changed: false, completed: false });
  }
  const next = recordCustomQuestProgress(withFlags(character, {
    [JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG]: true
  }), JOHANNA_RESCUE_QUEST_ID, 1);
  return transition(next, true, "", { changed: true, completed: true });
}

export function completeJohannaThanks(character) {
  const progress = getQuestProgress(character, JOHANNA_RESCUE_QUEST_ID);
  if (!progress.completed) return transition(character, false, "notReady", { bonusUnlocked: false });
  if (character.eventFlags?.[JOHANNA_RESCUE_THANKS_SEEN_FLAG]
    && character.eventFlags?.[JOHANNA_BONUS_UNLOCKED_FLAG]) {
    return transition(character, true, "alreadyCompleted", {
      changed: false, bonusUnlocked: false
    });
  }
  return transition(withFlags(character, {
    [JOHANNA_RESCUE_THANKS_PENDING_FLAG]: false,
    [JOHANNA_RESCUE_THANKS_SEEN_FLAG]: true,
    [JOHANNA_BONUS_UNLOCKED_FLAG]: true
  }), true, "", { changed: true, bonusUnlocked: true });
}

export function selectPostQuestInnKeeper(character, random = 1) {
  if (!character?.eventFlags?.[JOHANNA_RESCUE_THANKS_SEEN_FLAG]) return "johanna";
  const roll = typeof random === "function" ? Number(random()) : Number(random);
  const normalizedRoll = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 1;
  return normalizedRoll < POST_QUEST_ANNA_KEEPER_RATE ? "anna" : "johanna";
}

function isActiveJohannaRescue(character) {
  const progress = getQuestProgress(character, JOHANNA_RESCUE_QUEST_ID);
  return Boolean(progress.active && !progress.completed);
}

function withFlags(character, flags) {
  return {
    ...character,
    eventFlags: { ...(character?.eventFlags || {}), ...flags }
  };
}

function transition(character, accepted, reason = "", details = {}) {
  return { character, accepted, reason, ...details };
}
