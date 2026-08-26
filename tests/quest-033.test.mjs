import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { getCardById } from "../data/cards.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantCard, getOwnedCardCount } from "../data/deck.js";
import { grantKeyItem } from "../data/key-items.js";
import { acceptQuest, getQuestById, getQuestProgress, isQuestAvailable, reportQuest } from "../data/quests.js";
import { getSpecialRoomDefinition } from "../data/special-rooms.js";
import { applyVirgoFloorRecovery } from "../data/virgo-card.js";

const mainSource = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

function questReadyCharacter() {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_030"
  );
  return character;
}

test("quest 033 unlocks after quest 030 and preserves an already-owned Lichtbringer", () => {
  const locked = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(isQuestAvailable(locked, "guild_033"), false);
  const ready = questReadyCharacter();
  assert.equal(isQuestAvailable(ready, "guild_033"), true);
  ready.keyItems = grantKeyItem(ready.keyItems, "lichtbringer").keyItems;
  const accepted = acceptQuest(ready, "guild_033");
  assert.equal(accepted.accepted, true);
  assert.equal(getQuestProgress(accepted.character, "guild_033").readyToReport, true);
});

test("quest 033 copy, event room, client scene, and Virgo reward match the specification", () => {
  const quest = getQuestById("guild_033");
  assert.equal(quest.title, "闇を照らすもの");
  assert.equal(quest.client, "キルケ");
  assert.equal(quest.objectiveLabel, "リヒトブリンガーの入手");
  assert.ok(quest.description.every(line => Array.from(line).length <= 23));
  assert.deepEqual(quest.prerequisiteQuestIds, ["guild_030"]);
  assert.deepEqual(quest.reward, {
    type: "card", label: "デッキカード×1", amount: 1, cardId: "zodiac_virgo"
  });
  const room = getSpecialRoomDefinition(95);
  assert.equal(room.content.type, "keyItemPickup");
  assert.equal(room.content.keyItemId, "lichtbringer");
  assert.match(mainSource, /clientPortrait: "images\/npc\/NPC_23\.avif"/);
  assert.match(mainSource, /漆黒の闇を手探りで進むのは容易ではない/);
});

test("reporting quest 033 grants the one-copy Z Virgo card", () => {
  let character = acceptQuest(questReadyCharacter(), "guild_033").character;
  character.keyItems = grantKeyItem(character.keyItems, "lichtbringer").keyItems;
  character.eventFlags.lichtbringer_b95f_found = true;
  const report = reportQuest(character, "guild_033");
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "zodiac_virgo");
  assert.equal(getOwnedCardCount(report.character.cards, "zodiac_virgo"), 1);
});

test("Virgo raises maximum HP and SP by 25 percent and heals 10 percent on descent", () => {
  const card = getCardById("zodiac_virgo");
  assert.deepEqual([card.rarity, card.cost, card.maxOwned, card.maxCopies], ["Z", 8, 1, 1]);
  let character = createInitialCharacter({ name: "VIRGO", job: "priest" });
  character.level = 11;
  character = normalizeCharacter(character);
  const before = { hp: character.maxHp, sp: character.maxSp };
  character.cards = grantCard(character.cards, card.id, 1, character.deckCost).cards;
  character.cards.deckSlots[0] = card.id;
  character = normalizeCharacter(character);
  assert.equal(character.maxHp, Math.ceil(before.hp * 1.25));
  assert.equal(character.maxSp, Math.ceil(before.sp * 1.25));
  character.hp = 1;
  character.sp = 1;
  const recovered = applyVirgoFloorRecovery(character);
  assert.equal(recovered.hpRecovered, Math.ceil(character.maxHp * 0.1));
  assert.equal(recovered.spRecovered, Math.ceil(character.maxSp * 0.1));
});
