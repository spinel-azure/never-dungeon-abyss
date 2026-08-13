import test from "node:test";
import assert from "node:assert/strict";

import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { collectStats } from "../combat/collect-stats.js";
import { resolvePhysicalAttack } from "../combat/resolve-physical-attack.js";
import { resolveSpell } from "../combat/resolve-spell.js";
import { createInitialCharacter } from "../data/classes.js";
import { grantItem } from "../data/inventory.js";
import { getItem, getShopItemIdsForCharacter } from "../data/items.js";

const enemy = {
  id: "barrier_test_enemy", name: "TEST", hp: 999, maxHp: 999, alive: true,
  attack: 1, def: 0, baseStats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
  statuses: [], inventory: { counts: {} }, experienceReward: 0
};

test("elemental barriers are expensive one-battle consumables behind independent shop flags", () => {
  const fire = getItem("scorching_barrier");
  const ice = getItem("extreme_cold_barrier");
  for (const item of [fire, ice]) {
    assert.equal(item.buyPrice, 3000);
    assert.equal(item.sellPrice, 1500);
    assert.deepEqual(item.usableIn, ["battle"]);
    assert.equal(item.effects[0].value, 0.3);
  }
  assert.equal(getShopItemIdsForCharacter({ eventFlags: {} }).includes(fire.id), false);
  assert.equal(getShopItemIdsForCharacter({ eventFlags: { scorching_barrier_shop_unlocked: true } }).includes(fire.id), true);
  assert.equal(getShopItemIdsForCharacter({ eventFlags: { extreme_cold_barrier_shop_unlocked: true } }).includes(ice.id), true);
});

test("using an elemental barrier consumes one item and rejects duplicate use", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "scorching_barrier", 2).inventory;
  let battle = createBattleState({ character, enemy });
  const first = resolveBattleRound({ battle, playerCommand: { type: "item", itemId: "scorching_barrier" }, rng: () => 0.5 });
  assert.equal(first.accepted, true);
  assert.ok(first.battle.player.statuses.some(status => status.id === "fire_barrier" && status.expiresAfterBattle));
  assert.equal(first.battle.player.inventory.counts.scorching_barrier, 1);
  battle = first.battle;
  const duplicate = resolveBattleRound({ battle, playerCommand: { type: "item", itemId: "scorching_barrier" }, rng: () => 0.5 });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "alreadyActive");
  assert.equal(duplicate.battle.player.inventory.counts.scorching_barrier, 1);
});

test("fire and ice reductions affect physical and spell damage and cap at 75 percent", () => {
  const capped = collectStats({
    fireDamageReduction: 0.3,
    equipmentStatBonuses: { fireDamageReduction: 0.15 },
    cardStatBonuses: { fireDamageReduction: 0.6 },
    iceDamageReduction: 0.8
  });
  assert.equal(capped.fireDamageReduction, 0.75);
  assert.equal(capped.iceDamageReduction, 0.75);
  const spell = { id: "barrier_spell", spellPower: 100, powerMultiplier: 1, unavoidable: true };
  const normalIceSpell = resolveSpell({ attacker: {}, defender: {}, spell: { ...spell, element: "ice" }, rng: () => 0.5 });
  const protectedIceSpell = resolveSpell({ attacker: {}, defender: { iceDamageReduction: 0.3 }, spell: { ...spell, element: "ice" }, rng: () => 0.5 });
  assert.equal(protectedIceSpell.totalDamage, Math.floor(normalIceSpell.totalDamage * 0.7));
  const attack = { weaponAttack: 100, attackStatMultiplier: 0, element: "ice", unavoidable: true, powerPerHit: 1 };
  const normalIcePhysical = resolvePhysicalAttack({ attacker: {}, defender: {}, attack, rng: () => 0.5 });
  const protectedIcePhysical = resolvePhysicalAttack({ attacker: {}, defender: { iceDamageReduction: 0.3 }, attack, rng: () => 0.5 });
  assert.equal(protectedIcePhysical.totalDamage, Math.floor(normalIcePhysical.totalDamage * 0.7));
});
