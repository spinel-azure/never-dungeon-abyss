import test from "node:test";
import assert from "node:assert/strict";

import { getBossById } from "../data/bosses.js";
import { getCardById } from "../data/cards.js";
import { getItem } from "../data/items.js";
import { getQuestById } from "../data/quests.js";
import { createInitialCharacter } from "../data/classes.js";
import { grantItem } from "../data/inventory.js";
import { getItemUnavailableReasonForEnemies } from "../combat/resolve-item-use.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { readFile } from "node:fs/promises";

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
  assert.equal(vine.maxHp, 500);
  assert.equal(vine.def, 60);
  assert.equal(vine.physicalDamageReduction, 0.9);
  assert.equal(vine.magicDamageReduction, 0.75);
  assert.equal(vine.escapeRate, 1);
  const boss = getBossById("fleischfresser_b59f");
  assert.equal(boss.image, "images/bosses/boss_11.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_11b.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_12.avif");
  assert.equal(boss.regainRate, 0.05);
  assert.equal(boss.event.autoStartDelay, 2000);
  assert.equal(boss.event.prompt.split("\n").length, 3);
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
  assert.deepEqual(quest020.description, [
    "強力除草剤の試供品を入荷したんだけど、試しに",
    "密林区域で使ってもらいたいの。",
    "もしも効き目があるなら、店で正式に取り扱う",
    "つもりよ。お願いできるかしら？"
  ]);
  const quest023 = getQuestById("guild_023");
  assert.deepEqual(quest023.prerequisiteQuestIds, ["guild_020"]);
  assert.equal(quest023.reward.cardId, "legendary_goddess_breath");
  assert.equal(getCardById("legendary_mana_activation").effectId, "step_sp_recovery");
  assert.equal(getCardById("legendary_goddess_breath").effectId, "step_hp_recovery");
});

test("strong herbicide is available immediately when any living battle target is a giant vine", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "strong_herbicide", 1).inventory;
  const muskBeast = { id: "musk_beast_b56f", hp: 100, alive: true };
  const vine = { ...getBossById("giant_vine_obstacle"), hp: 500, alive: true };
  assert.equal(getItemUnavailableReasonForEnemies({
    character,
    itemId: "strong_herbicide",
    context: "battle",
    enemies: [vine, muskBeast, vine]
  }), "");
  assert.equal(getItemUnavailableReasonForEnemies({
    character,
    itemId: "strong_herbicide",
    context: "battle",
    enemies: [muskBeast]
  }), "plantOnly");
});

test("the hidden legacy enemy stage cannot appear behind a multi-enemy formation", async () => {
  const css = await readFile(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(css, /\.battle-enemy-stage\[hidden\]\s*\{\s*display:\s*none;/);
});

test("the formation highlight follows the target-selection cursor", async () => {
  const source = await readFile(new URL("../js/battle.js", import.meta.url), "utf8");
  assert.match(source, /battleUi\.mode === "targets" \? battleUi\.selectedIndex : battle\.targetIndex/);
  assert.match(source, /renderSelection\(\);\s*renderEnemyPartySelection\(\);/);
});

test("multi-enemy names use the k8x12 pixel font", async () => {
  const css = await readFile(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(css, /\.battle-enemy-member-name\s*\{[^}]*font-family:\s*"PixelFont"/);
});
