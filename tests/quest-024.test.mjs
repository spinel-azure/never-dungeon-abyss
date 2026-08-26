import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { getCardById } from "../data/cards.js";
import { createInitialCharacter } from "../data/classes.js";
import { grantCard, getOwnedCardCount } from "../data/deck.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getKeyItem } from "../data/key-items.js";
import {
  acceptQuest, abandonQuest, completeSecondQueenShadowInvestigation,
  getQuestById, getQuestProgress, isQuestAvailable,
  recordSecondQueenShadowEncounter, reportQuest
} from "../data/quests.js";
import { getQuestRequiredSpecialRoomAccess, getSpecialRoomDefinition } from "../data/special-rooms.js";

const playerSource = fs.readFileSync(new URL("../js/player.js", import.meta.url), "utf8");

function questReadyCharacter() {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_020"
  );
  return character;
}

test("quest 024 unlocks after quest 020 and keeps accepted legacy progress", () => {
  const character = questReadyCharacter();
  assert.equal(isQuestAvailable(character, "guild_024"), true);
  let accepted = acceptQuest(character, "guild_024").character;
  accepted = recordSecondQueenShadowEncounter(accepted, 63);
  accepted = abandonQuest(accepted, "guild_024").character;
  accepted = acceptQuest(accepted, "guild_024").character;
  assert.equal(getQuestProgress(accepted, "guild_024").progress, 1);
  assert.equal(recordSecondQueenShadowEncounter(accepted, 63), accepted);
});

test("quest 024 records B60F-B65F in any order and finishes at the B66F event room", () => {
  let character = acceptQuest(questReadyCharacter(), "guild_024").character;
  for (const depth of [65, 60, 63, 61, 64, 62]) {
    character = recordSecondQueenShadowEncounter(character, depth);
  }
  assert.equal(getQuestProgress(character, "guild_024").progress, 6);
  assert.equal(getQuestProgress(character, "guild_024").readyToReport, false);
  const room = getSpecialRoomDefinition(66);
  assert.equal(room.content.type, "secondQueenShadowFinale");
  assert.equal(getQuestRequiredSpecialRoomAccess(room, getQuestProgress(character, "guild_024")).blocked, false);
  character = completeSecondQueenShadowInvestigation(character);
  assert.equal(getQuestProgress(character, "guild_024").readyToReport, true);
});

test("quest 024 suppresses Mikan throughout the desert and places only unfound shadows on B60F-B65F", () => {
  const progress = { active: true, completed: false, progress: 0 };
  buildBoundaryWallMap(60, () => 0.5, { secondQueenShadowQuest: progress, eventFlags: {} });
  assert.equal(cells.flat().filter(cell => cell.npc === "queen_shadow_desert").length, 1);
  buildBoundaryWallMap(60, () => 0.5, {
    secondQueenShadowQuest: progress,
    eventFlags: { quest_024_shadow_b60f_found: true }
  });
  assert.equal(cells.flat().filter(cell => cell.npc).length, 0);
  buildBoundaryWallMap(69, () => 0.5, { secondQueenShadowQuest: progress, eventFlags: {} });
  assert.equal(cells.flat().filter(cell => String(cell.npc || "").startsWith("NPC_01")).length, 0);
});

test("quest 024 copy, earring, reward, and finale dialogue match the specification", () => {
  const quest = getQuestById("guild_024");
  assert.equal(quest.title, "女王の影を追え――その2");
  assert.equal(quest.objectiveLabel, "砂漠区域で女王の影を見つける");
  assert.ok(quest.description.every(line => Array.from(line).length <= 23));
  assert.deepEqual(quest.reward, { type: "card", label: "デッキカード×1", amount: 1, cardId: "sr_mirage" });
  assert.equal(getKeyItem("queen_earring").name, "女王のイヤリング");
  assert.match(playerSource, /どこにいっても暑いにゃあ/);
  assert.match(playerSource, /「女王のイヤリング」を手に入れた！/);

  let character = acceptQuest(questReadyCharacter(), "guild_024").character;
  for (const depth of [60, 61, 62, 63, 64, 65]) character = recordSecondQueenShadowEncounter(character, depth);
  character = completeSecondQueenShadowInvestigation(character);
  const report = reportQuest(character, "guild_024");
  assert.equal(report.rewardCardId, "sr_mirage");
  assert.equal(getOwnedCardCount(report.character.cards, "sr_mirage"), 1);
});

test("Mirage rolls once for the first enemy attack and evades the whole attack on success", () => {
  const card = getCardById("sr_mirage");
  assert.deepEqual([card.rarity, card.cost, card.effectValue], ["SR", 4, 0.5]);
  let character = createInitialCharacter({ name: "MIRAGE", job: "warrior" });
  character.cards = grantCard(character.cards, card.id, 1, 99).cards;
  character.cards.deckSlots[0] = card.id;
  character.hp = character.maxHp = 200;
  const enemy = {
    id: "dummy", name: "DUMMY", hp: 9999, maxHp: 9999, sp: 0, maxSp: 0,
    attack: 100, def: 0, stats: { str: 100, dex: 100, agi: 1 }, statuses: [],
    actions: [{ weight: 1, action: { id: "double", name: "二連撃", actionType: "physicalAttack", hitCount: 2, powerPerHit: 1 } }]
  };
  const first = resolveBattleRound({
    battle: createBattleState({ character, enemy }), playerCommand: { type: "guard" }, rng: () => 0
  }).battle;
  assert.equal(first.player.hp, 200);
  assert.equal(first.mirageFirstAttackAvailable, false);
  assert.equal(first.presentationEvents.filter(event => event.actorSide === "enemy" && event.type === "attackHit").every(event => !event.hit), true);
  const second = resolveBattleRound({ battle: first, playerCommand: { type: "guard" }, rng: () => 0 }).battle;
  assert.ok(second.player.hp < 200);
});
