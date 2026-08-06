import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantItem, getItemCount } from "../data/inventory.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import {
  configurePresence, getPresence, getPresenceSuppressedSteps, onPlayerStep, resetPresence,
  restorePresence, suppressPresence
} from "../js/presence.js";
import { grantEventItems, unlockGuildRequest } from "../js/character-services.js";
import { purchaseBuybackEquipment, purchaseEquipment, purchaseItem, sellEquipmentInstance, sellItem } from "../data/commerce.js";
import { getItem, getShopItemIdsForDepth } from "../data/items.js";

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

test("shop equipment costs 100G and creates an individual weapon instance", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 100;
  const result = purchaseEquipment(character, "iron_greatsword");
  assert.equal(result.accepted, true);
  assert.equal(result.character.gold, 0);
  assert.equal(result.character.equipmentInventory.instances.at(-1).equipmentId, "iron_greatsword");
});

test("inventory respects the per-item ownership limit", () => {
  const character = characterWith("healing_potion", 120);
  assert.equal(getItemCount(character.inventory, "healing_potion"), 99);
});

test("healing potion restores 30 HP and is consumed", () => {
  const character = characterWith("healing_potion");
  character.maxHp = 60;
  character.hp = 3;
  const result = resolveFieldItemUse({ character, itemId: "healing_potion", context: "dungeon" });
  assert.equal(result.accepted, true);
  assert.equal(result.character.hp, 33);
  assert.equal(getItemCount(result.character.inventory, "healing_potion"), 0);
});

test("small, medium and large healing potions use the intended recovery and prices", () => {
  assert.deepEqual([
    ["healing_potion", "回復薬（小）", 30, 20, 10],
    ["healing_potion_medium", "回復薬（中）", 60, 60, 30],
    ["healing_potion_large", "回復薬（大）", 120, 120, 60]
  ].map(([id, name, healing, buyPrice, sellPrice]) => {
    const item = getItem(id);
    return [item.id, item.name, item.effects[0].value, item.buyPrice, item.sellPrice];
  }), [
    ["healing_potion", "回復薬（小）", 30, 20, 10],
    ["healing_potion_medium", "回復薬（中）", 60, 60, 30],
    ["healing_potion_large", "回復薬（大）", 120, 120, 60]
  ]);

  for (const [itemId, healing] of [["healing_potion_medium", 60], ["healing_potion_large", 120]]) {
    const character = characterWith(itemId);
    character.maxHp = 200;
    character.hp = 1;
    const result = resolveFieldItemUse({ character, itemId, context: "dungeon" });
    assert.equal(result.healing, healing);
    assert.equal(result.character.hp, healing + 1);
  }
});

test("shop healing potions unlock permanently by deepest reached floor", () => {
  assert.deepEqual(getShopItemIdsForDepth(9).filter(id => id.startsWith("healing_potion")), [
    "healing_potion"
  ]);
  assert.deepEqual(getShopItemIdsForDepth(10).filter(id => id.startsWith("healing_potion")), [
    "healing_potion", "healing_potion_medium"
  ]);
  assert.deepEqual(getShopItemIdsForDepth(20).filter(id => id.startsWith("healing_potion")), [
    "healing_potion", "healing_potion_medium", "healing_potion_large"
  ]);

  const legacyB10Character = createInitialCharacter({ name: "TEST", job: "warrior" });
  delete legacyB10Character.highestDungeonDepthReached;
  legacyB10Character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.equal(normalizeCharacter(legacyB10Character).highestDungeonDepthReached, 10);
});

test("antidote cures poison and restores 15 HP", () => {
  const character = characterWith("antidote");
  character.hp = 10;
  character.statuses = [{ statusId: "poison", remainingTurns: 3 }];
  const result = resolveFieldItemUse({ character, itemId: "antidote", context: "town" });
  assert.equal(result.character.hp, 25);
  assert.equal(result.character.statuses.length, 0);
  assert.equal(result.character.condition, "GOOD");
});

test("styptic cures bleeding and restores 15 HP", () => {
  let character = characterWith("styptic");
  character.hp = Math.max(1, character.maxHp - 20);
  character.statuses = [{ statusId: "bleeding" }];
  character.condition = "BLEED";
  const result = resolveFieldItemUse({ character, itemId: "styptic", context: "dungeon" });
  assert.equal(result.accepted, true);
  assert.equal(result.character.hp, character.hp + 15);
  assert.equal(result.character.statuses.some(status => status.statusId === "bleeding"), false);
  assert.equal(result.character.condition, "GOOD");
});

test("shop and temple purchases spend gold and grant the selected item", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 760;
  for (const [itemId, price] of [
    ["healing_potion", 20],
    ["antidote", 30],
    ["guiding_torch", 40],
    ["exorcism_talisman", 50],
    ["holy_water", 20],
    ["treasure_compass", 500],
    ["auto_walker", 100]
  ]) {
    const result = purchaseItem(character, itemId);
    assert.equal(result.accepted, true);
    assert.equal(result.cost, price);
    character = result.character;
    assert.equal(getItemCount(character.inventory, itemId), 1);
  }
  assert.equal(character.gold, 0);
});

test("purchases reject insufficient gold and send full-stack overflow to storage", () => {
  const poor = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(purchaseItem(poor, "healing_potion").reason, "insufficientGold");

  const full = characterWith("healing_potion", 99);
  full.gold = 999;
  const result = purchaseItem(full, "healing_potion");
  assert.equal(result.accepted, true);
  assert.equal(result.stored, 1);
  assert.equal(result.character.gold, 979);
  assert.deepEqual(result.character.warehouse.itemStacks, [{ itemId: "healing_potion", count: 1 }]);
});

test("shop sells one consumable for half its purchase price", () => {
  const character = characterWith("auto_walker", 2);
  character.gold = 10;
  const result = sellItem(character, "auto_walker");
  assert.equal(result.accepted, true);
  assert.equal(result.value, 50);
  assert.equal(result.character.gold, 60);
  assert.equal(getItemCount(result.character.inventory, "auto_walker"), 1);
  assert.equal(sellItem(createInitialCharacter({ name: "TEST", job: "warrior" }), "auto_walker").reason, "notOwned");
});

test("shop can sell several stacked consumables at once", () => {
  const character = characterWith("slime_jelly", 6);
  character.gold = 10;
  const result = sellItem(character, "slime_jelly", { amount: 4 });
  assert.equal(result.accepted, true);
  assert.equal(result.quantity, 4);
  assert.equal(result.unitValue, 5);
  assert.equal(result.value, 20);
  assert.equal(result.character.gold, 30);
  assert.equal(getItemCount(result.character.inventory, "slime_jelly"), 2);
});

test("shop sells unequipped equipment instances but rejects equipped ones", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 100;
  const purchased = purchaseEquipment(character, "iron_greatsword");
  const instance = purchased.character.equipmentInventory.instances.at(-1);
  const sold = sellEquipmentInstance(purchased.character, instance.instanceId);

  assert.equal(sold.accepted, true);
  assert.equal(sold.value, 50);
  assert.equal(sold.character.gold, 50);
  assert.equal(sold.character.equipmentInventory.instances.some(entry => entry.instanceId === instance.instanceId), false);

  const equippedId = character.equippedInstanceIds.rightArmId;
  assert.equal(sellEquipmentInstance(character, equippedId).reason, "equipped");
});

test("sold equipment can be bought back as the same individual instance", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 20000;
  const purchased = purchaseEquipment(character, "iron_greatsword");
  character = purchased.character;
  const instance = character.equipmentInventory.instances.at(-1);
  const sold = sellEquipmentInstance(character, instance.instanceId);
  assert.equal(sold.accepted, true);
  const bought = purchaseBuybackEquipment(sold.character, instance.instanceId);
  assert.equal(bought.accepted, true);
  assert.ok(bought.character.equipmentInventory.instances.some(entry => entry.instanceId === instance.instanceId));
  assert.equal(bought.character.equipmentBuyback.length, 0);
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

  const compassUser = characterWith("treasure_compass");
  const compass = resolveFieldItemUse({
    character: compassUser, itemId: "treasure_compass", context: "dungeon"
  });
  assert.equal(compass.environment.treasureCompassActive, true);
  assert.equal(getItemCount(compass.character.inventory, "treasure_compass"), 0);
  assert.equal(resolveFieldItemUse({
    character: characterWith("treasure_compass"), itemId: "treasure_compass",
    context: "dungeon", treasureCompassActive: true
  }).reason, "noEffect");

  const walker = resolveFieldItemUse({
    character: characterWith("auto_walker"), itemId: "auto_walker", context: "dungeon"
  });
  assert.equal(walker.environment.startAutoWalker, true);
  assert.equal(getItemCount(walker.character.inventory, "auto_walker"), 0);
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

test("a restored full presence gauge can trigger an encounter on the next step", () => {
  let encounters = 0;
  configurePresence({ onEncounter: () => { encounters += 1; } });
  restorePresence(100);
  assert.equal(onPlayerStep({ random: () => 0 }), true);
  assert.equal(encounters, 1);
  resetPresence();
});

test("temple and shop event rewards enter inventory once only", () => {
  const base = createInitialCharacter({ name: "TEST", job: "warrior" });
  const temple = grantEventItems(base, "temple_first_talk_items", [
    "exorcism_talisman", "holy_water"
  ]);
  assert.deepEqual(temple.gainedItemIds, ["exorcism_talisman", "holy_water"]);
  assert.equal(getItemCount(temple.character.inventory, "exorcism_talisman"), 1);
  assert.equal(getItemCount(temple.character.inventory, "holy_water"), 1);

  const repeatedTemple = grantEventItems(temple.character, "temple_first_talk_items", [
    "exorcism_talisman", "holy_water"
  ]);
  assert.equal(repeatedTemple.alreadyReceived, true);
  assert.equal(getItemCount(repeatedTemple.character.inventory, "holy_water"), 1);

  const shop = grantEventItems(temple.character, "shop_first_talk_items", [
    "healing_potion", "antidote", "guiding_torch"
  ]);
  assert.deepEqual(shop.gainedItemIds, ["healing_potion", "antidote", "guiding_torch"]);
  assert.equal(getItemCount(shop.character.inventory, "healing_potion"), 1);
  assert.equal(getItemCount(shop.character.inventory, "antidote"), 1);
  assert.equal(getItemCount(shop.character.inventory, "guiding_torch"), 1);
});

test("guild request unlocks only after every town introduction event", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.eventFlags = {
    guild_registration_card: true,
    inn_first_talk_card: true,
    temple_first_talk_items: true,
    shop_first_talk_items: true
  };
  const incomplete = unlockGuildRequest(character);
  assert.equal(incomplete.unlocked, false);
  assert.equal(incomplete.character.eventFlags.guild_first_request_unlocked, undefined);

  character.eventFlags.library_first_talk_card = true;
  const complete = unlockGuildRequest(character);
  assert.equal(complete.unlocked, true);
  assert.equal(complete.character.eventFlags.guild_first_request_unlocked, true);

  const repeated = unlockGuildRequest(complete.character);
  assert.equal(repeated.unlocked, false);
});
