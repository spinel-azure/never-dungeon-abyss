import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantItem, getItemCount } from "../data/inventory.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import {
  getPresence, getPresenceSuppressedSteps, onPlayerStep, resetPresence,
  restorePresence, suppressPresence
} from "../js/presence.js";

function characterWith(itemId, amount = 1) {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, itemId, amount).inventory;
  return character;
}

test("legacy characters receive an empty normalized inventory", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  delete character.inventory;
  assert.deepEqual(normalizeCharacter(character).inventory, { counts: {} });
});

test("inventory respects the per-item ownership limit", () => {
  const character = characterWith("healing_potion", 120);
  assert.equal(getItemCount(character.inventory, "healing_potion"), 99);
});

test("healing potion restores 20 HP and is consumed", () => {
  const character = characterWith("healing_potion");
  character.hp = 3;
  const result = resolveFieldItemUse({ character, itemId: "healing_potion", context: "dungeon" });
  assert.equal(result.accepted, true);
  assert.equal(result.character.hp, 23);
  assert.equal(getItemCount(result.character.inventory, "healing_potion"), 0);
});

test("antidote cures poison and restores 15 HP", () => {
  const character = characterWith("antidote");
  character.hp = 10;
  character.statuses = [{ statusId: "poison", remainingTurns: 3 }];
  const result = resolveFieldItemUse({ character, itemId: "antidote", context: "town" });
  assert.equal(result.character.hp, 25);
  assert.equal(result.character.statuses.length, 0);
});

test("torch and talisman expose dungeon environment effects", () => {
  const torchUser = characterWith("guiding_torch");
  const torch = resolveFieldItemUse({
    character: torchUser, itemId: "guiding_torch", context: "dungeon", torchFuel: 12
  });
  assert.equal(torch.environment.torchFuel, 100);

  const talismanUser = characterWith("exorcism_talisman");
  const talisman = resolveFieldItemUse({
    character: talismanUser, itemId: "exorcism_talisman", context: "dungeon"
  });
  assert.equal(talisman.environment.resetPresence, true);
  assert.equal(talisman.environment.suppressPresenceSteps, 30);
});

test("holy water only banishes a non-boss undead and awards no experience", () => {
  const character = characterWith("holy_water");
  const enemy = {
    id: "test_undead", name: "UNDEAD", race: "undead", hp: 10, maxHp: 10,
    sp: 0, maxSp: 0, stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0, attack: 1, experienceReward: 999, statuses: [], equipment: {},
    elementMultipliers: {}, statusResistances: {}, isBoss: false, alive: true
  };
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy }),
    playerCommand: { type: "item", itemId: "holy_water" },
    rng: () => 0
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.battle.enemy.experienceReward, 0);
  assert.equal(getItemCount(result.battle.player.inventory, "holy_water"), 0);
});

test("presence reset clears a lingering talisman suppression", () => {
  restorePresence(0);
  suppressPresence(30);
  onPlayerStep({ random: () => 0 });
  assert.equal(getPresence(), 0);
  assert.equal(getPresenceSuppressedSteps(), 29);
  resetPresence();
  assert.equal(getPresenceSuppressedSteps(), 0);
  onPlayerStep({ random: () => 0 });
  assert.equal(getPresence(), 4);
});

test("restored presence suppression is capped at the item-defined 30 steps", () => {
  restorePresence(0, 999999);
  assert.equal(getPresenceSuppressedSteps(), 30);
  resetPresence();
});
