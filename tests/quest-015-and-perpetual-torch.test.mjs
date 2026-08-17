import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  acceptQuest,
  B2F_UNLOCK_QUEST_IDS,
  BRASS_BULL_QUEST_ID,
  FIFTH_RED_DOOR_INVESTIGATION_QUEST_ID,
  FOURTH_RED_DOOR_INVESTIGATION_QUEST_ID,
  GUILD_018_QUEST_ID,
  getQuestById,
  getQuestProgress,
  reportQuest
} from "../data/quests.js";
import {
  GODDESS_GRACE_CARD_ID,
  GODDESS_MERCY_CARD_ID,
  PERPETUAL_TORCH_CARD_ID,
  getCardById,
  hasCardEffect
} from "../data/cards.js";
import {
  createInitialCardState,
  getDeckSlotRejectionReason,
  grantCard,
  setDeckSlot
} from "../data/deck.js";
import { createDepthReturnSettlement, formatDepthReturnSettlement } from "../data/experience-settlement.js";

function questCharacter() {
  return {
    gold: 0,
    deckCost: 20,
    cards: createInitialCardState(),
    eventFlags: {},
    quests: {
      active: {},
      completedQuestIds: [...B2F_UNLOCK_QUEST_IDS, BRASS_BULL_QUEST_ID]
    }
  };
}

test("quest 015 follows quest 014 and restores the three B39F/B40F flags", () => {
  const quest = getQuestById(FOURTH_RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(quest.number, "015");
  assert.equal(quest.title, "赤い扉の調査――その4");
  assert.deepEqual(quest.prerequisiteQuestIds, [BRASS_BULL_QUEST_ID]);

  let character = acceptQuest(questCharacter(), quest.id).character;
  for (const [index, flag] of quest.persistentProgressFlags.entries()) {
    character = { ...character, eventFlags: { ...character.eventFlags, [flag]: true } };
    assert.equal(getQuestProgress(character, quest.id).progress, index + 1);
  }

  const report = reportQuest(character, quest.id);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, GODDESS_MERCY_CARD_ID);
  assert.equal(report.bonusGold, 5000);
});

test("quest 019 is prepared after quest 018 and restores the three B49F/B50F flags", () => {
  const quest = getQuestById(FIFTH_RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(quest.number, "019");
  assert.equal(quest.title, "赤い扉の調査――その5");
  assert.deepEqual(quest.prerequisiteQuestIds, [GUILD_018_QUEST_ID]);
  assert.equal(quest.reward.cardId, PERPETUAL_TORCH_CARD_ID);

  let character = questCharacter();
  character.quests.active[quest.id] = { progress: 0 };
  for (const [index, flag] of quest.persistentProgressFlags.entries()) {
    character = { ...character, eventFlags: { ...character.eventFlags, [flag]: true } };
    assert.equal(getQuestProgress(character, quest.id).progress, index + 1);
  }

  const report = reportQuest(character, quest.id);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, PERPETUAL_TORCH_CARD_ID);
  assert.equal(report.bonusGold, 5000);
});

test("Goddess's Mercy combines Grace and Floor Detection without separating the original pair", () => {
  const mercy = getCardById(GODDESS_MERCY_CARD_ID);
  assert.equal(mercy.rarity, "L");
  assert.equal(mercy.cost, 6);
  assert.equal(hasCardEffect([mercy.id], "preserve_experience_on_defeat"), true);
  assert.equal(hasCardEffect([mercy.id], "floor_detection"), true);

  let cards = createInitialCardState();
  for (const id of [GODDESS_GRACE_CARD_ID, "sr_floor_detection", GODDESS_MERCY_CARD_ID]) {
    cards = grantCard(cards, id, 1, 20).cards;
  }
  cards = setDeckSlot(cards, 0, GODDESS_GRACE_CARD_ID, 20);
  cards = setDeckSlot(cards, 1, "sr_floor_detection", 20);
  assert.equal(getDeckSlotRejectionReason(cards, 2, GODDESS_MERCY_CARD_ID, 20), "cardConflict");

  const settlement = createDepthReturnSettlement({ carriedExperience: 1000, cards: { deckSlots: [GODDESS_MERCY_CARD_ID] } }, 40);
  assert.equal(settlement.depthBonusExp, 0);
  assert.match(formatDepthReturnSettlement(settlement), /女神の慈愛.*セット中/);
});

test("Perpetual Torch exposes consumption suppression and forced torch effects", async () => {
  const card = getCardById(PERPETUAL_TORCH_CARD_ID);
  assert.equal(card.nameJa, "恒久の灯火");
  assert.equal(card.rarity, "L");
  assert.equal(card.cost, 6);
  assert.equal(hasCardEffect([card.id], "torch_consumption_disabled"), true);
  assert.equal(hasCardEffect([card.id], "force_torch_effect_active"), true);

  const playerSource = await readFile(new URL("../js/player.js", import.meta.url), "utf8");
  const rendererSource = await readFile(new URL("../js/renderer.js", import.meta.url), "utf8");
  assert.match(playerSource, /!torchFuelDisabled && !torchConsumptionDisabledByCard/);
  assert.match(rendererSource, /torchEffectForced[\s\S]*?torchFuel/);
});
