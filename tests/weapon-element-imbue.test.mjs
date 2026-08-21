import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import { CARDS, getCardById } from "../data/cards.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { grantItem, getItemCount } from "../data/inventory.js";
import { getItem, getShopItemIdsForCharacter } from "../data/items.js";
import { getWeapon } from "../data/weapons.js";
import {
  createBattleState,
  createPlayerAction,
  getPlayerWeaponElement,
  resolveBattleRound
} from "../combat/battle-engine.js";

function enemy() {
  return {
    id: "imbue_test_enemy", name: "TEST ENEMY", hp: 999, maxHp: 999,
    sp: 0, maxSp: 0, attack: 1, def: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    statuses: [], statusResistances: {}, elementMultipliers: { fire: 1.5, ice: 0.5 },
    isBoss: false, alive: true
  };
}

test("elemental oils cost 500G and unlock together after quest 013 reporting", () => {
  for (const itemId of ["fire_lizard_oil", "ice_lizard_oil", "lightning_lizard_oil"]) {
    const item = getItem(itemId);
    assert.equal(item.buyPrice, 500);
    assert.deepEqual(item.usableIn, ["battle"]);
  }
  assert.equal(getShopItemIdsForCharacter({ eventFlags: {} }).includes("fire_lizard_oil"), false);
  const stock = getShopItemIdsForCharacter({ eventFlags: { weapon_imbue_oils_shop_unlocked: true } });
  assert.equal(stock.includes("fire_lizard_oil"), true);
  assert.equal(stock.includes("ice_lizard_oil"), true);
  const legacyStock = getShopItemIdsForCharacter({ quests: { completedQuestIds: ["guild_013"] } });
  assert.equal(legacyStock.includes("fire_lizard_oil"), true);
  assert.equal(legacyStock.includes("ice_lizard_oil"), true);
  assert.equal(getShopItemIdsForCharacter({ eventFlags: {} }).includes("lightning_lizard_oil"), false);
  assert.equal(getShopItemIdsForCharacter({ eventFlags: { transfer_portal_b70f_unlocked: true } }).includes("lightning_lizard_oil"), true);
});

test("elemental armament cards are exclusive SR cost-four cards with future sale values", () => {
  const fire = getCardById("sr_flame_armament");
  const ice = getCardById("sr_ice_armament");
  const lightning = getCardById("sr_lightning_armament");
  for (const card of [fire, ice, lightning]) {
    assert.equal(card.rarity, "SR");
    assert.equal(card.cost, 4);
    assert.equal(card.maxOwned, 1);
    assert.equal(card.maxCopies, 1);
    assert.equal(card.exclusiveGroup, "weapon_element_imbue");
    assert.equal(card.sellPrice, 5000);
    assert.equal(card.buybackPrice, 50000);
  }
  let cards = grantCard(createInitialCharacter({ name: "TEST", job: "warrior" }).cards, fire.id, 1, 8).cards;
  cards = grantCard(cards, ice.id, 1, 8).cards;
  cards = setDeckSlot(cards, 0, fire.id, 8);
  const rejected = setDeckSlot(cards, 1, ice.id, 8);
  assert.equal(rejected.deckSlots[0], fire.id);
  assert.equal(rejected.deckSlots[1], null);
});

test("every card follows the fixed rarity cost table", () => {
  const costs = { C: 1, R: 2, SR: 4, L: 6, Z: 8 };
  for (const card of CARDS) assert.equal(card.cost, costs[card.rarity], card.id);
});

test("physical attack element priority is skill, oil, weapon, card, then physical", () => {
  const player = createInitialCharacter({ name: "TEST", job: "warrior" });
  const physicalAction = { actionType: "physicalAttack", weapon: getWeapon("iron_longsword") };
  assert.equal(getPlayerWeaponElement(player, physicalAction), "physical");
  player.cards = grantCard(player.cards, "sr_flame_armament", 1, 8).cards;
  player.cards = setDeckSlot(player.cards, 0, "sr_flame_armament", 8);
  assert.equal(getPlayerWeaponElement(player, physicalAction), "fire");
  assert.equal(getPlayerWeaponElement(player, { ...physicalAction, weapon: getWeapon("glacies_hammer") }), "ice");
  player.statuses.push({ id: "weapon_element_imbue", element: "fire", active: true });
  assert.equal(getPlayerWeaponElement(player, { ...physicalAction, weapon: getWeapon("glacies_hammer") }), "fire");
  assert.equal(getPlayerWeaponElement(player, { ...physicalAction, element: "ice" }), "ice");
});

test("elemental oil lasts for the battle, rejects the same oil, and another oil overwrites it", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "fire_lizard_oil", 2).inventory;
  character.inventory = grantItem(character.inventory, "ice_lizard_oil", 1).inventory;
  let battle = createBattleState({ character, enemy: enemy() });
  const fire = resolveBattleRound({ battle, playerCommand: { type: "item", itemId: "fire_lizard_oil" }, rng: () => 0.5 });
  assert.equal(fire.accepted, true);
  battle = fire.battle;
  assert.equal(createPlayerAction(battle.player, { type: "attack" }).action.element, "fire");
  assert.equal(getItemCount(battle.player.inventory, "fire_lizard_oil"), 1);
  const duplicate = resolveBattleRound({ battle, playerCommand: { type: "item", itemId: "fire_lizard_oil" }, rng: () => 0.5 });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "alreadyActive");
  const ice = resolveBattleRound({ battle, playerCommand: { type: "item", itemId: "ice_lizard_oil" }, rng: () => 0.5 });
  assert.equal(ice.accepted, true);
  assert.equal(createPlayerAction(ice.battle.player, { type: "attack" }).action.element, "ice");
});

test("deck UI uses the shared warning effect for elemental conflicts", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../js/menu.js", import.meta.url), "utf8");
  assert.match(source, /exclusiveConflict[\s\S]*ELEMENT CONFLICT/);
  assert.match(source, /menu\.playSe\("costOver"\)/);
});
