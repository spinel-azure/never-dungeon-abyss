import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createBattleState, createEnemyAction, resolveBattleRound } from "../combat/battle-engine.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { createInitialCharacter } from "../data/classes.js";
import { getEquipmentInstanceDefinition } from "../data/equipment-inventory.js";
import { grantItem } from "../data/inventory.js";
import { getItem, getShopItemIdsForCharacter, getShopItemIdsForDepth } from "../data/items.js";

function durableWarrior(weaponId = "iron_longsword") {
  return {
    ...createInitialCharacter({ name: "TEST", job: "warrior" }),
    hp: 9999,
    maxHp: 9999,
    baseStats: { str: 60, int: 1, agi: 60, dex: 30, luc: 30 },
    equipment: { weaponId, rightArmId: weaponId, rightArmEnhancement: 0 }
  };
}

test("Todes Scorpio uses the reduced regain and death-poison values", () => {
  const boss = getBossById("todes_scorpio_b64f");
  assert.equal(boss.regainAmount, 150);
  assert.equal(boss.regainRate, undefined);
  assert.equal(boss.actions.find(entry => entry.action.id === "todes_stich").action.effects[0].baseRate, 0.35);
});

test("Todes Scorpio lowers dangerous-action weights while chilled", () => {
  const boss = createBossCombatant("todes_scorpio_b64f");
  boss.statuses = [{ id: "todes_scorpio_chilled", statusId: "todes_scorpio_chilled", active: true }];
  assert.equal(createEnemyAction(boss, () => 0.34).id, "todes_scorpio_giant_claw");
  assert.equal(createEnemyAction(boss, () => 0.35).id, "todes_scorpio_double_crush");
  assert.equal(createEnemyAction(boss, () => 0.67).id, "todes_scorpio_tail_smash");
  assert.equal(createEnemyAction(boss, () => 0.82).id, "todes_stich");
});

test("an ice hit chills Todes Scorpio and blocks its next regain", () => {
  const enemy = createBossCombatant("todes_scorpio_b64f");
  enemy.hp = enemy.maxHp - 1000;
  const result = resolveBattleRound({
    battle: createBattleState({ character: durableWarrior("glacies_hammer"), enemy }),
    playerCommand: { type: "attack" },
    rng: () => 0
  });
  assert.equal(result.accepted, true);
  assert.ok(result.battle.enemy.statuses.some(status => (status.id || status.statusId) === "todes_scorpio_chilled"));
  assert.match(result.battle.log.join("\n"), /動きが鈍くなった/);
  assert.match(result.battle.log.join("\n"), /再生能力は冷気に阻まれた/);
  assert.equal(result.battle.presentationEvents.some(event => event.type === "healing" && event.actorSide === "enemy"), false);
});

test("Todes Scorpio regains exactly 150 HP when ice does not suppress it", () => {
  const enemy = createBossCombatant("todes_scorpio_b64f");
  enemy.hp = enemy.maxHp - 1000;
  const result = resolveBattleRound({
    battle: createBattleState({ character: durableWarrior(), enemy }),
    playerCommand: { type: "guard" },
    rng: () => 0
  });
  assert.equal(result.battle.enemy.hp, enemy.hp + 150);
});

test("Poison Mask resistance also reduces death-poison application", () => {
  const enemy = {
    id: "death_poison_test", name: "TEST", hp: 100, maxHp: 100, alive: true,
    attack: 1, def: 0, dex: 30, agi: 1, luc: 1,
    actions: [{ weight: 1, action: {
      id: "death_poison_test_attack", name: "死毒試験", actionType: "physicalAttack",
      hitCount: 1, powerPerHit: 0, hitBonus: 1,
      effects: [{ statusId: "death_poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.5 }]
    }}]
  };
  const player = durableWarrior();
  player.baseStats.luc = 30;
  player.equipmentStatBonuses = { poisonResistance: 0.3 };
  const result = resolveBattleRound({
    battle: createBattleState({ character: player, enemy }),
    playerCommand: { type: "guard" },
    rng: () => 0.25
  });
  assert.equal(result.battle.player.statuses.some(status => (status.id || status.statusId) === "death_poison"), false);
});

test("Strong Healing Potion (M) restores half max HP and unlocks at B70F", () => {
  const item = getItem("strong_healing_potion_medium");
  assert.deepEqual({ name: item.name, buyPrice: item.buyPrice, sellPrice: item.sellPrice }, {
    name: "強回復薬（中）", buyPrice: 2000, sellPrice: 1000
  });
  assert.equal(getShopItemIdsForDepth(69).includes(item.id), false);
  assert.equal(getShopItemIdsForDepth(70).includes(item.id), true);
  const beforeUnlock = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(getShopItemIdsForCharacter(beforeUnlock).includes(item.id), false);
  beforeUnlock.eventFlags.transfer_portal_b70f_unlocked = true;
  assert.equal(getShopItemIdsForCharacter(beforeUnlock).includes(item.id), true);

  const character = { ...beforeUnlock, hp: 100, maxHp: 400 };
  character.inventory = grantItem(character.inventory, item.id, 1).inventory;
  const used = resolveFieldItemUse({ character, itemId: item.id, context: "dungeon" });
  assert.equal(used.accepted, true);
  assert.equal(used.character.hp, 300);
});

test("Glacies Hammer explicitly describes its ice attack", () => {
  const definition = getEquipmentInstanceDefinition({
    equipmentId: "glacies_hammer", slot: "rightArmId", enhancement: 0
  });
  assert.equal(definition.description, "氷属性攻撃");
});

test("equipment screens describe the expanded poison resistance and Glacies ice attack", async () => {
  const [menuSource, mainSource, shopSource] = await Promise.all([
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../data/shop-stock.js", import.meta.url), "utf8")
  ]);
  assert.match(menuSource, /if \(definition\.description\) labels\.push\(definition\.description\)/);
  for (const source of [menuSource, mainSource, shopSource]) assert.match(source, /毒・猛毒・死毒耐性/);
});
