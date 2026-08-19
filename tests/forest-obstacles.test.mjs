import test from "node:test";
import assert from "node:assert/strict";

import { getBossById } from "../data/bosses.js";
import { getCardById } from "../data/cards.js";
import { getItem } from "../data/items.js";
import { getQuestById } from "../data/quests.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";

const fixedRng = () => 0.5;

test("B50F through B58F place five giant vines until Fleischfresser is defeated", () => {
  for (const depth of [50, 54, 58]) {
    buildBoundaryWallMap(depth, fixedRng, { eventFlags: {} });
    assert.equal(cells.flat().filter(cell => cell.bossId === "giant_vine_obstacle").length, 5);
  }
  buildBoundaryWallMap(50, fixedRng, { eventFlags: { boss_fleischfresser_b59f_defeated: true } });
  assert.equal(cells.flat().filter(cell => cell.bossId === "giant_vine_obstacle").length, 0);
  buildBoundaryWallMap(59, fixedRng, { eventFlags: {} });
  assert.equal(cells.flat().filter(cell => cell.bossId === "giant_vine_obstacle").length, 0);
});

test("giant vines and Fleischfresser use their dedicated confirmed artwork and escape rules", () => {
  const vine = getBossById("giant_vine_obstacle");
  assert.equal(vine.encounterImage, "images/npc/NPC_event_11.avif");
  assert.equal(vine.def, 60);
  assert.equal(vine.escapeRate, 1);
  const boss = getBossById("fleischfresser_b59f");
  assert.equal(boss.image, "images/bosses/boss_11.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_11b.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_12.avif");
  assert.equal(boss.regainRate, 0.05);
  assert.equal(boss.event.autoStartDelay, 2000);
  assert.equal(boss.escapeRate, 1);
});

test("herbicide quests, items, and legendary step-recovery cards keep their contract", () => {
  const trial = getItem("strong_herbicide_trial");
  const regular = getItem("strong_herbicide");
  assert.equal(trial.sellPrice, 0);
  assert.equal(regular.buyPrice, 100);
  assert.equal(regular.effects[0].value, 500);
  const quest020 = getQuestById("guild_020");
  assert.equal(quest020.client, "ヘレン");
  assert.equal(quest020.requiredCount, 5);
  assert.equal(quest020.reward.cardId, "legendary_mana_activation");
  const quest023 = getQuestById("guild_023");
  assert.deepEqual(quest023.prerequisiteQuestIds, ["guild_020"]);
  assert.equal(quest023.reward.cardId, "legendary_goddess_breath");
  assert.equal(getCardById("legendary_mana_activation").effectId, "step_sp_recovery");
  assert.equal(getCardById("legendary_goddess_breath").effectId, "step_hp_recovery");
});
