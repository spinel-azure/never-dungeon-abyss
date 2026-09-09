import test from "node:test";
import assert from "node:assert/strict";

import { getCardById, RETURN_FAVOR_CARD_ID } from "../data/cards.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getAdventureChronicle } from "../data/adventure-records.js";
import { getOwnedCardCount } from "../data/deck.js";
import { getKeyItem, getKeyItemCount, hasKeyItem } from "../data/key-items.js";
import {
  FLEISCHFRESSERKNOSPE_DEFEATED_FLAG,
  JOHANNA_BONUS_UNLOCKED_FLAG,
  JOHANNA_MEDICINE_KEY_ITEM_ID,
  JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG,
  JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG,
  JOHANNA_RESCUE_MEDICINE_BREWED_FLAG,
  JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG,
  JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG,
  JOHANNA_RESCUE_REQUEST_UNLOCKED_FLAG,
  JOHANNA_RESCUE_RUMOR_READ_FLAG,
  JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG,
  JOHANNA_RESCUE_THANKS_PENDING_FLAG,
  JOHANNA_RESCUE_THANKS_SEEN_FLAG,
  NIGHT_DEW_FLOWER_KEY_ITEM_ID,
  POST_QUEST_ANNA_KEEPER_RATE,
  brewJohannaMedicine,
  canEnterJohannaRescueSpring,
  completeJohannaRecovery,
  completeJohannaThanks,
  consultKirkeForJohannaMedicine,
  deliverJohannaMedicine,
  getJohannaRescueInnPhase,
  getJohannaRescueKirkeMode,
  getJohannaRescueSpringMode,
  grantJohannaRescueFlower,
  markJohannaRescueSpringIntroSeen,
  recordFleischfresserknospeDefeat,
  selectPostQuestInnKeeper,
  unlockJohannaRescueQuest
} from "../data/quest-031.js";
import {
  JOHANNA_RESCUE_QUEST_ID,
  MAERCHENTIERE_QUEST_ID,
  QUESTS,
  acceptQuest,
  getQuestById,
  getQuestProgress,
  isQuestAvailable,
  reportQuest
} from "../data/quests.js";
import { loadGame, writeGame } from "../js/save-data.js";

function prerequisiteCharacter() {
  const character = createInitialCharacter({ name: "アンナの使い", job: "priest" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat",
    "guild_002_cave_slime",
    "guild_003_b1f_survey",
    MAERCHENTIERE_QUEST_ID
  );
  return character;
}

function acceptedJohannaRescue() {
  let character = prerequisiteCharacter();
  character.eventFlags[JOHANNA_RESCUE_RUMOR_READ_FLAG] = true;
  character = unlockJohannaRescueQuest(character).character;
  return acceptQuest(character, JOHANNA_RESCUE_QUEST_ID).character;
}

test("quest 031 has the requested unique paper and unlocks only after Anna explains the problem", () => {
  const quest = getQuestById(JOHANNA_RESCUE_QUEST_ID);
  assert.equal(quest.number, "031");
  assert.equal(quest.title, "おかあさんを助けて");
  assert.equal(quest.client, "アンナ");
  assert.equal(quest.objectiveHeading, "内容");
  assert.equal(quest.objectiveLabel, "ヨハンナの薬をアンナに届ける");
  assert.deepEqual(quest.prerequisiteQuestIds, [MAERCHENTIERE_QUEST_ID]);
  assert.deepEqual(quest.reward, {
    type: "card", label: "デッキカード×1", amount: 1, cardId: RETURN_FAVOR_CARD_ID
  });
  assert.deepEqual(quest.description, [
    "わたし、宿屋の娘アンナです。おかあさんの具合が",
    "悪くなっちゃった。キルケおばあちゃんに",
    "お薬を作ってもらって、おかあさんを助けて。",
    ""
  ]);
  assert.ok(quest.description.every(line => Array.from(line).length <= 23));
  assert.equal(QUESTS.filter(entry => entry.number === "031").length, 1);

  const noPrerequisite = createInitialCharacter({ name: "未達", job: "warrior" });
  noPrerequisite.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey"
  );
  noPrerequisite.eventFlags[JOHANNA_RESCUE_RUMOR_READ_FLAG] = true;
  assert.equal(unlockJohannaRescueQuest(noPrerequisite).accepted, false);
  assert.equal(isQuestAvailable(noPrerequisite, quest), false);

  let ready = prerequisiteCharacter();
  ready.eventFlags[JOHANNA_RESCUE_RUMOR_READ_FLAG] = true;
  assert.equal(isQuestAvailable(ready, quest), false);
  const unlocked = unlockJohannaRescueQuest(ready);
  assert.equal(unlocked.accepted, true);
  assert.equal(unlocked.character.eventFlags[JOHANNA_RESCUE_REQUEST_UNLOCKED_FLAG], true);
  assert.equal(isQuestAvailable(unlocked.character, quest), true);
});

test("quest 031 flower, brewing, delivery, and recovery transitions are atomic and idempotent", () => {
  let character = acceptedJohannaRescue();
  assert.equal(getJohannaRescueInnPhase(character), "annaSad");
  assert.equal(getJohannaRescueKirkeMode(character), "consult");
  assert.equal(getJohannaRescueSpringMode(character), "unavailable");
  assert.equal(canEnterJohannaRescueSpring(character), false);

  let step = consultKirkeForJohannaMedicine(character);
  assert.equal(step.accepted, true);
  character = step.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG], true);
  assert.equal(getJohannaRescueKirkeMode(character), "reminder");
  assert.equal(canEnterJohannaRescueSpring(character), true);
  assert.equal(getJohannaRescueSpringMode(character), "intro");

  step = markJohannaRescueSpringIntroSeen(character);
  assert.equal(step.accepted, true);
  character = step.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG], true);
  assert.equal(getJohannaRescueSpringMode(character), "retry");

  step = recordFleischfresserknospeDefeat(character);
  assert.equal(step.accepted, true);
  character = step.character;
  assert.equal(character.eventFlags[FLEISCHFRESSERKNOSPE_DEFEATED_FLAG], true);
  assert.equal(getJohannaRescueSpringMode(character), "flowerHandoff");

  step = grantJohannaRescueFlower(character);
  assert.equal(step.gained, true);
  character = step.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG], true);
  assert.equal(getJohannaRescueSpringMode(character), "resolved");
  assert.equal(getKeyItemCount(character.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID), 1);
  const duplicateFlower = grantJohannaRescueFlower(character);
  assert.equal(duplicateFlower.gained, false);
  assert.equal(getKeyItemCount(duplicateFlower.character.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID), 1);
  assert.equal(getJohannaRescueKirkeMode(character), "brew");

  step = brewJohannaMedicine(character);
  assert.equal(step.brewed, true);
  character = step.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_MEDICINE_BREWED_FLAG], true);
  assert.equal(hasKeyItem(character.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID), false);
  assert.equal(getKeyItemCount(character.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID), 1);
  assert.equal(getJohannaRescueKirkeMode(character), "medicineReady");
  const duplicateBrew = brewJohannaMedicine(character);
  assert.equal(duplicateBrew.brewed, false);
  assert.equal(getKeyItemCount(duplicateBrew.character.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID), 1);

  step = deliverJohannaMedicine(character);
  assert.equal(step.delivered, true);
  character = step.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_MEDICINE_DELIVERED_FLAG], true);
  assert.equal(hasKeyItem(character.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID), false);
  const duplicateDelivery = deliverJohannaMedicine(character);
  assert.equal(duplicateDelivery.delivered, false);
  assert.equal(hasKeyItem(duplicateDelivery.character.keyItems, JOHANNA_MEDICINE_KEY_ITEM_ID), false);
  assert.equal(getJohannaRescueInnPhase(character), "annaHappy");

  step = completeJohannaRecovery(character);
  assert.equal(step.completed, true);
  character = step.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_RECOVERY_COMPLETED_FLAG], true);
  assert.equal(getQuestProgress(character, JOHANNA_RESCUE_QUEST_ID).readyToReport, true);
  const duplicateCompletion = completeJohannaRecovery(character);
  assert.equal(duplicateCompletion.completed, false);
  assert.equal(getQuestProgress(duplicateCompletion.character, JOHANNA_RESCUE_QUEST_ID).progress, 1);
});

test("quest 031 report grants Return the Favor once and Johanna's thanks unlocks the bonus once", () => {
  let character = acceptedJohannaRescue();
  character = consultKirkeForJohannaMedicine(character).character;
  character = recordFleischfresserknospeDefeat(character).character;
  character = grantJohannaRescueFlower(character).character;
  character = brewJohannaMedicine(character).character;
  character = deliverJohannaMedicine(character).character;
  character = completeJohannaRecovery(character).character;

  const report = reportQuest(character, JOHANNA_RESCUE_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, RETURN_FAVOR_CARD_ID);
  character = report.character;
  assert.equal(getOwnedCardCount(character.cards, RETURN_FAVOR_CARD_ID), 1);
  assert.equal(character.eventFlags[JOHANNA_RESCUE_THANKS_PENDING_FLAG], true);
  assert.equal(getJohannaRescueInnPhase(character), "johannaThanks");
  assert.equal(reportQuest(character, JOHANNA_RESCUE_QUEST_ID).accepted, false);
  assert.equal(getOwnedCardCount(character.cards, RETURN_FAVOR_CARD_ID), 1);

  const thanks = completeJohannaThanks(character);
  assert.equal(thanks.bonusUnlocked, true);
  character = thanks.character;
  assert.equal(character.eventFlags[JOHANNA_RESCUE_THANKS_PENDING_FLAG], false);
  assert.equal(character.eventFlags[JOHANNA_RESCUE_THANKS_SEEN_FLAG], true);
  assert.equal(character.eventFlags[JOHANNA_BONUS_UNLOCKED_FLAG], true);
  assert.equal(getJohannaRescueInnPhase(character), "postQuest");
  const duplicateThanks = completeJohannaThanks(character);
  assert.equal(duplicateThanks.bonusUnlocked, false);
  assert.equal(duplicateThanks.character.eventFlags[JOHANNA_BONUS_UNLOCKED_FLAG], true);
});

test("quest 031 report reward, thanks handoff, and achievement survive protected save loading without duplication", () => {
  let character = acceptedJohannaRescue();
  character = consultKirkeForJohannaMedicine(character).character;
  character = recordFleischfresserknospeDefeat(character).character;
  character = grantJohannaRescueFlower(character).character;
  character = brewJohannaMedicine(character).character;
  character = deliverJohannaMedicine(character).character;
  character = completeJohannaRecovery(character).character;
  character = reportQuest(character, JOHANNA_RESCUE_QUEST_ID).character;

  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  globalThis.window = { dispatchEvent() {} };
  globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

  const snapshot = {
    character,
    player: { gridX: 0, gridY: 0, dir: 0 },
    dungeon: { cells: [[{ type: "floor" }]], explored: [[true]] }
  };
  assert.equal(writeGame(snapshot, "auto"), true);
  const restored = normalizeCharacter(loadGame("auto").character);

  assert.equal(getQuestProgress(restored, JOHANNA_RESCUE_QUEST_ID).completed, true);
  assert.equal(getOwnedCardCount(restored.cards, RETURN_FAVOR_CARD_ID), 1);
  assert.equal(restored.eventFlags[JOHANNA_RESCUE_THANKS_PENDING_FLAG], true);
  assert.equal(getAdventureChronicle(restored).find(entry => entry.id === "johannaMedicine")?.achieved, true);
  assert.equal(reportQuest(restored, JOHANNA_RESCUE_QUEST_ID).accepted, false);
  assert.equal(getOwnedCardCount(restored.cards, RETURN_FAVOR_CARD_ID), 1);
});

test("post-quest innkeeper selection uses the 25 percent boundary without consuming hidden randomness", () => {
  const character = prerequisiteCharacter();
  character.quests.completedQuestIds.push(JOHANNA_RESCUE_QUEST_ID);
  character.eventFlags[JOHANNA_RESCUE_THANKS_SEEN_FLAG] = true;
  assert.equal(POST_QUEST_ANNA_KEEPER_RATE, 0.25);
  assert.equal(selectPostQuestInnKeeper(character, 0), "anna");
  assert.equal(selectPostQuestInnKeeper(character, 0.249999999), "anna");
  assert.equal(selectPostQuestInnKeeper(character, 0.25), "johanna");
  assert.equal(selectPostQuestInnKeeper(character, 0.999999999), "johanna");
  assert.equal(selectPostQuestInnKeeper({ ...character, eventFlags: {} }, 0), "johanna");
  let calls = 0;
  assert.equal(selectPostQuestInnKeeper(character, () => { calls += 1; return 0.1; }), "anna");
  assert.equal(calls, 1);
});

test("quest 031 definitions and progression survive legacy normalization without duplicating key items", () => {
  assert.deepEqual(
    [getKeyItem(NIGHT_DEW_FLOWER_KEY_ITEM_ID).sellable, getKeyItem(NIGHT_DEW_FLOWER_KEY_ITEM_ID).consumable],
    [false, true]
  );
  assert.deepEqual(
    [getKeyItem(JOHANNA_MEDICINE_KEY_ITEM_ID).sellable, getKeyItem(JOHANNA_MEDICINE_KEY_ITEM_ID).consumable],
    [false, true]
  );
  const card = getCardById(RETURN_FAVOR_CARD_ID);
  assert.deepEqual(
    [card.nameJa, card.rarity, card.cost, card.effectId, card.effectValue, card.maxOwned, card.maxCopies],
    ["恩返し", "L", 6, "healing_item_sp_return", 0.1, 1, 1]
  );
  assert.equal(card.excludesHpSpRecoveryItems, true);
  assert.equal(card.flavorText, "受けた優しさは、いつかあなたの力になる。");

  let character = acceptedJohannaRescue();
  character = consultKirkeForJohannaMedicine(character).character;
  character = recordFleischfresserknospeDefeat(character).character;
  const restored = normalizeCharacter(JSON.parse(JSON.stringify(character)));
  const flower = grantJohannaRescueFlower(restored);
  assert.equal(flower.gained, true);
  assert.equal(getKeyItemCount(flower.character.keyItems, NIGHT_DEW_FLOWER_KEY_ITEM_ID), 1);

  const legacyAccepted = prerequisiteCharacter();
  legacyAccepted.quests.active[JOHANNA_RESCUE_QUEST_ID] = { progress: 0 };
  delete legacyAccepted.eventFlags[JOHANNA_RESCUE_REQUEST_UNLOCKED_FLAG];
  assert.equal(getQuestProgress(normalizeCharacter(legacyAccepted), JOHANNA_RESCUE_QUEST_ID).active, true);
});
