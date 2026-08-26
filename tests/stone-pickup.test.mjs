import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { createInitialCharacter } from "../data/classes.js";
import { getEnemyById } from "../data/enemies.js";
import { addLootItem, getItemCount, grantItem, settleLootBag } from "../data/inventory.js";
import { getItem } from "../data/items.js";
import { buildBoundaryWallMap, cells, setStartPosition } from "../js/dungeon.js";

function characterWithStone() {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.inventory = grantItem(character.inventory, "stone", 1).inventory;
  return character;
}

function characterWithStoneAndSearchDestroy() {
  const character = characterWithStone();
  character.cards.deckSlots = ["rare_search_and_destroy"];
  character.cards.ownedCardCounts.rare_search_and_destroy = 1;
  return character;
}

test("B1F creates one to three stone pickup circles and no later floor does", () => {
  setStartPosition(0, 0);
  buildBoundaryWallMap(1, () => 0.5, {});
  const stones = cells.flat().filter(cell => cell.questEvent?.type === "lootPickup");
  assert.ok(stones.length >= 1 && stones.length <= 3);
  assert.ok(stones.every(cell => cell.questEvent.itemId === "stone" && cell.questEvent.amount === 1));
  assert.ok(stones.every(cell => cell.type === "floor" && cell.treasure === null && cell.npc === null));

  buildBoundaryWallMap(2, () => 0.5, {});
  assert.equal(cells.flat().some(cell => cell.questEvent?.type === "lootPickup"), false);
});

test("stones enter the loot bag and settle into inventory", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.lootBag = addLootItem(character.lootBag, "stone", 2).lootBag;
  assert.equal(character.lootBag.items.stone, 2);
  character = settleLootBag(character).character;
  assert.equal(getItemCount(character.inventory, "stone"), 2);
  assert.equal(character.lootBag.items.stone, undefined);
});

test("a thrown stone uses normal hit chance and deals fixed nine damage", () => {
  const item = getItem("stone");
  assert.equal(item.description, "ただの石ころ。");
  assert.equal(item.sellPrice, 1);
  assert.deepEqual(item.effects, [{ id: "thrown_fixed_damage", value: 9 }]);

  const maikaefer = structuredClone(getEnemyById("maikaefer"));
  maikaefer.hp = maikaefer.maxHp;
  maikaefer.alive = true;
  maikaefer.actions = [{ weight: 1, action: { id: "wait", name: "待機", actionType: "wait" } }];
  const hit = resolveBattleRound({
    battle: createBattleState({ character: characterWithStone(), enemy: maikaefer }),
    playerCommand: { type: "item", itemId: "stone" },
    rng: () => 0
  });
  assert.equal(hit.accepted, true);
  assert.equal(hit.battle.outcome, "victory");
  assert.equal(hit.battle.enemy.hp, 0);
  assert.equal(getItemCount(hit.battle.player.inventory, "stone"), 0);

  const evasiveDummy = structuredClone(getEnemyById("maikaefer"));
  evasiveDummy.id = "evasive_dummy";
  evasiveDummy.name = "回避ダミー";
  evasiveDummy.hp = evasiveDummy.maxHp;
  evasiveDummy.alive = true;
  evasiveDummy.actions = [{ weight: 1, action: { id: "wait", name: "待機", actionType: "wait" } }];
  const miss = resolveBattleRound({
    battle: createBattleState({ character: characterWithStone(), enemy: evasiveDummy }),
    playerCommand: { type: "item", itemId: "stone" },
    rng: () => 0.999
  });
  assert.equal(miss.accepted, true);
  assert.equal(miss.battle.enemy.hp, 8);
  assert.match(miss.battle.log.join("\n"), /当たらなかった/);
});

test("the dungeon pickup handler adds stones to the loot bag", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /event\?\.type === "lootPickup"[\s\S]*?addLootItem\(character\.lootBag, item\.id/);
  assert.match(source, /石ころ|item\.name/);
});

test("floor materials and key items use the shared silhouette-hiding glow", async () => {
  const source = await readFile(new URL("../js/renderer.js", import.meta.url), "utf8");
  assert.match(source, /questEvent: cell\.questEvent/);
  assert.match(source, /event\.questEvent\?\.itemId \|\| event\.questEvent\?\.keyItemId/);
  assert.match(source, /createRadialGradient[\s\S]*?globalCompositeOperation = "lighter"/);
});

test("Search and Destroy makes thrown items hit even the Maikaefer at the maximum miss roll", () => {
  const maikaefer = structuredClone(getEnemyById("maikaefer"));
  maikaefer.hp = maikaefer.maxHp;
  maikaefer.alive = true;
  maikaefer.actions = [{ weight: 1, action: { id: "wait", name: "待機", actionType: "wait" } }];
  const result = resolveBattleRound({
    battle: createBattleState({ character: characterWithStoneAndSearchDestroy(), enemy: maikaefer }),
    playerCommand: { type: "item", itemId: "stone" },
    rng: () => 0.999999
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.throwingItemGuaranteedHitAtStart, true);
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.battle.enemy.hp, 0);
  assert.doesNotMatch(result.battle.log.join("\n"), /当たらなかった/);
});
