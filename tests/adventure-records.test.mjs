import test from "node:test";
import assert from "node:assert/strict";

import { getAdventureRecords } from "../data/adventure-records.js";
import { createInitialCharacter } from "../data/classes.js";

test("adventure records summarize values already stored in the save", () => {
  const character = createInitialCharacter({ name: "記録係", job: "thief" });
  character.level = 20;
  character.highestDungeonDepthReached = 9;
  character.gold = 1234;
  character.quests.completedQuestIds = ["guild_001_abyss_rat", "guild_002_cave_slime"];
  character.cards.ownedCardCounts = { common_hp_up: 2, common_sp_up: 1 };
  character.cards.ownedCardIds = ["common_hp_up", "common_sp_up"];
  character.warehouse.itemStacks = [{ itemId: "healing_potion", count: 4 }];
  character.warehouse.equipmentInstances = [{ instanceId: "stored-1" }];
  character.eventFlags = {
    boss_strange_knight_statue_b9f_defeated: true,
    lingering_ghost_b2f_defeated_once: true
  };

  const values = Object.fromEntries(getAdventureRecords(character).map(entry => [entry.id, entry.value]));
  assert.equal(values.name, "記録係");
  assert.equal(values.job, "盗賊");
  assert.equal(values.level, "LV20");
  assert.equal(values.deepestFloor, "B9F");
  assert.equal(values.completedQuests, "2件");
  assert.equal(values.defeatedBosses, "2体");
  assert.equal(values.cardTypes, "2種類");
  assert.equal(values.totalCards, "3枚");
  assert.equal(values.gold, "1,234G");
  assert.equal(values.warehouse, "5個");
});

test("the first adventure-record page contains ten stable entries", () => {
  const character = createInitialCharacter({ name: "新人", job: "mage" });
  assert.equal(getAdventureRecords(character).length, 10);
});
