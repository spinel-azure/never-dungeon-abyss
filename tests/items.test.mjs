import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantItem, getItemCount } from "../data/inventory.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import {
  clearPresenceIncreaseReduction, configurePresence, getEffectivePresenceIncreaseReduction, getPresence, getPresenceIncreaseReduction,
  getPresenceSuppressedSteps, onPlayerStep, resetPresence, restorePresence,
  setPassivePresenceIncreaseReduction, setPresenceIncreaseReduction, suppressPresence
} from "../js/presence.js";
import { grantEventItems, unlockGuildRequest } from "../js/character-services.js";
import { purchaseBuybackEquipment, purchaseBuybackItem, purchaseEquipment, purchaseItem, sellEquipmentInstance, sellItem } from "../data/commerce.js";
import { getItem, getShopItemIdsForCharacter, getShopItemIdsForDepth } from "../data/items.js";
import { equipInstance, getEquipmentInstanceDefinition, grantEquipmentInstance, setEquipmentInstanceLocked } from "../data/equipment-inventory.js";
import { getShopEquipmentOffer, getShopEquipmentStock } from "../data/shop-stock.js";
import { readFile } from "node:fs/promises";

function characterWith(itemId, amount = 1) {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, itemId, amount).inventory;
  return character;
}

test("Molten Brass is a valuable unique material that can be bought back", () => {
  const item = getItem("molten_brass");
  assert.equal(item.maxOwned, 1);
  assert.equal(item.sellPrice, 5000);
  assert.equal(item.buybackPrice, 10000);
  const sold = sellItem(characterWith(item.id), item.id);
  assert.equal(sold.accepted, true);
  assert.equal(sold.character.itemBuyback[0].price, 10000);
  const bought = purchaseBuybackItem({ ...sold.character, gold: 10000 }, item.id);
  assert.equal(bought.accepted, true);
  assert.equal(getItemCount(bought.character.inventory, item.id), 1);
  assert.equal(bought.character.itemBuyback.length, 0);
});

test("buyback keeps only the latest eligible item or equipment", () => {
  let character = sellItem(characterWith("molten_brass"), "molten_brass").character;
  assert.equal(character.itemBuyback.length, 1);
  const enhanced = grantEquipmentInstance(character, "stiletto", "rightArmId", { enhancement: 3 });
  character = sellEquipmentInstance(enhanced.character, enhanced.instance.instanceId).character;
  assert.equal(character.itemBuyback.length, 0);
  assert.equal(character.equipmentBuyback.length, 1);
  assert.equal(character.equipmentBuyback[0].instance.instanceId, enhanced.instance.instanceId);
});

test("selling ordinary equipment does not erase the single eligible buyback slot", () => {
  let character = sellItem(characterWith("molten_brass"), "molten_brass").character;
  const ordinary = grantEquipmentInstance(character, "stiletto", "rightArmId", { enhancement: 2 });
  character = sellEquipmentInstance(ordinary.character, ordinary.instance.instanceId).character;
  assert.equal(character.itemBuyback.length, 1);
  assert.equal(character.itemBuyback[0].itemId, "molten_brass");
  assert.equal(character.equipmentBuyback.length, 0);
});

test("legacy buyback records receive stable ids and quantity-correct totals", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.itemBuyback = [
    { itemId: "molten_brass", amount: 1, price: 10000 },
    { itemId: "molten_brass", amount: 2, price: 10000 }
  ];
  const normalized = normalizeCharacter(character);
  assert.equal(normalized.itemBuyback.length, 1);
  assert.equal(normalized.itemBuyback[0].entryId, "item:latest");
  assert.equal(normalized.itemBuyback[0].unitPrice, 10000);
  assert.equal(normalized.itemBuyback[0].price, 20000);
});

test("locked equipment cannot be sold and retains its lock through normalization", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 100;
  const purchased = purchaseEquipment(character, "iron_greatsword");
  const locked = setEquipmentInstanceLocked(purchased.character, purchased.instance.instanceId, true);
  assert.equal(locked.accepted, true);
  assert.equal(normalizeCharacter(locked.character).equipmentInventory.instances.find(entry => entry.instanceId === purchased.instance.instanceId).locked, true);
  const sold = sellEquipmentInstance(locked.character, purchased.instance.instanceId);
  assert.equal(sold.accepted, false);
  assert.equal(sold.reason, "locked");
});

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

test("B10 weapon upgrades require the strange statue victory and keep their enhancement profiles", () => {
  const expected = {
    warrior: ["steel_longsword", 11, {}],
    thief: ["baselard", 8, { dex: 2 }],
    priest: ["silver_flail", 10, { luc: 1 }]
  };
  for (const [job, [weaponId, attack, bonuses]] of Object.entries(expected)) {
    const character = createInitialCharacter({ name: "TEST", job });
    character.highestDungeonDepthReached = 10;
    character.eventFlags.transfer_portal_b10f_unlocked = true;
    assert.equal(getShopEquipmentStock(character).some(entry => entry.equipmentId === weaponId), false);
    character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
    const offer = getShopEquipmentStock(character).find(entry => entry.equipmentId === weaponId);
    assert.equal(offer?.attack, attack);
    assert.equal(offer?.buyPrice, 1200);
    assert.deepEqual(offer?.statBonuses, bonuses);
  }

  assert.deepEqual(
    [0, 1, 2, 3].map(enhancement => {
      const definition = getEquipmentInstanceDefinition({ equipmentId: "baselard", slot: "rightArmId", enhancement });
      return [definition.attack, definition.statBonuses.dex];
    }),
    [[8, 2], [9, 2], [9, 3], [10, 4]]
  );
  assert.deepEqual(
    [0, 1, 2, 3].map(enhancement => {
      const definition = getEquipmentInstanceDefinition({ equipmentId: "silver_flail", slot: "rightArmId", enhancement });
      return [definition.attack, definition.statBonuses.luc];
    }),
    [[10, 1], [11, 1], [11, 2], [12, 3]]
  );
  assert.deepEqual(
    [0, 1, 2, 3].map(enhancement => {
      const definition = getEquipmentInstanceDefinition({ equipmentId: "steel_longsword", slot: "rightArmId", enhancement });
      return [definition.attack, definition.statBonuses.str || 0];
    }),
    [[11, 0], [12, 0], [13, 1], [14, 2]]
  );
});

test("the anti-magic necklace unlocks after B10 and the strange statue victory", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 1500;
  character.highestDungeonDepthReached = 10;
  character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.equal(getShopEquipmentOffer(character, "shop_anti_magic_necklace"), null);

  character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  const offer = getShopEquipmentOffer(character, "shop_anti_magic_necklace");
  assert.equal(offer?.slot, "accessoryId");
  assert.equal(offer?.buyPrice, 1500);
  assert.equal(offer?.statBonuses.magicDamageReduction, 0.05);

  const purchased = purchaseEquipment(character, offer);
  assert.equal(purchased.accepted, true);
  character = equipInstance(purchased.character, "accessoryId", purchased.instance.instanceId).character;
  character = normalizeCharacter(character);
  assert.equal(character.equipment.accessoryId, "anti_magic_necklace");
  assert.equal(character.equipmentStatBonuses.magicDamageReduction, 0.05);
});

test("Spell-Sealing Talisman unlocks at B50 and scales spell resistance through plus three", () => {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.highestDungeonDepthReached = 50;
  character.eventFlags.transfer_portal_b50f_unlocked = true;
  assert.equal(getShopEquipmentOffer(character, "shop_spell_sealing_talisman"), null);
  character.eventFlags.boss_eiskoenigin_b49f_defeated = true;
  const offer = getShopEquipmentOffer(character, "shop_spell_sealing_talisman");
  assert.equal(offer.buyPrice, 10000);
  assert.deepEqual(
    [0, 1, 2, 3].map(enhancement => {
      const definition = getEquipmentInstanceDefinition({
        equipmentId: "spell_sealing_talisman", slot: "accessoryId", enhancement
      });
      return [definition.statBonuses.def, definition.statBonuses.magicDamageReduction];
    }),
    [[2, 0.1], [2, 0.15], [2, 0.2], [3, 0.25]]
  );
});

test("B60 shop unlocks four new base accessories and their plus-three profiles", () => {
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.highestDungeonDepthReached = 60;
  assert.equal(getShopEquipmentOffer(character, "shop_mana_amplifier"), null);
  character.eventFlags.transfer_portal_b60f_unlocked = true;
  const offers = ["mana_amplifier", "masters_necklace", "poison_mask", "grain_choker"]
    .map(id => getShopEquipmentOffer(character, `shop_${id}`));
  assert.deepEqual(offers.map(offer => offer.buyPrice), [15000, 10000, 10000, 10000]);
  assert.deepEqual(
    offers.map(offer => offer.statBonuses),
    [{ attackSpellDamageBonus: 0.05 }, { passiveInstantDeathRateBonus: 0.01 },
      { poisonResistance: 0.15 }, { healingMiracleBonus: 0.05 }]
  );
  assert.deepEqual(
    ["mana_amplifier", "masters_necklace", "poison_mask", "grain_choker"].map(equipmentId =>
      getEquipmentInstanceDefinition({ equipmentId, slot: "accessoryId", enhancement: 3 }).statBonuses),
    [
      { int: 3, attackSpellDamageBonus: 0.2 },
      { luc: 3, passiveInstantDeathRateBonus: 0.04 },
      { def: 3, poisonResistance: 0.3 },
      { luc: 3, healingMiracleBonus: 0.2 }
    ]
  );
});

test("Rebellious Choker unlocks with the large healing potion and grants action-skip resistance", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const initialEquipmentDef = character.equipmentStatBonuses.def;
  character.gold = 2000;
  character.highestDungeonDepthReached = 20;
  assert.equal(getShopEquipmentOffer(character, "shop_rebellious_choker"), null);

  character.eventFlags.shop_stock_b20f_unlocked = true;
  const offer = getShopEquipmentOffer(character, "shop_rebellious_choker");
  assert.equal(offer?.name, "反骨のチョーカー");
  assert.equal(offer?.slot, "accessoryId");
  assert.equal(offer?.buyPrice, 2000);
  assert.equal(offer?.sellPrice, 1000);
  assert.deepEqual(offer?.statBonuses, { def: 3, actionSkipResistance: 0.15 });

  const purchased = purchaseEquipment(character, offer);
  assert.equal(purchased.accepted, true);
  character = equipInstance(purchased.character, "accessoryId", purchased.instance.instanceId).character;
  character = normalizeCharacter(character);
  assert.equal(character.equipment.accessoryId, "rebellious_choker");
  assert.equal(character.equipmentStatBonuses.def, initialEquipmentDef + 3);
  assert.equal(character.equipmentStatBonuses.actionSkipResistance, 0.15);
});

test("Rebellious Choker uses the compact Japanese resistance label in status displays", async () => {
  const [menuSource, mainSource] = await Promise.all([
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  const compactLabel = /key === "actionSkipResistance"[\s\S]*?`行動不能耐性\$\{Math\.round\(Number\(value\) \* 100\)\}%`/;
  assert.match(menuSource, compactLabel);
  assert.match(mainSource, compactLabel);
});

test("Rebellious Choker compact resistance label is also used by the detail status screen", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /key === "actionSkipResistance"[\s\S]*?Math\.round\(Number\(value\) \* 100\)/);
});

test("thief armor shop tiers share enhancement-aware purchase and stat handling", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.gold = 2000;
  const initialArmor = character.equipmentInventory.instances
    .filter(instance => instance.slot !== "rightArmId")
    .map(getEquipmentInstanceDefinition);
  assert.deepEqual(initialArmor.map(item => item.sellPrice), [25, 25, 25, 25]);

  assert.equal(getShopEquipmentStock(character).filter(item => item.enhancement === 1).length, 4);
  assert.equal(getShopEquipmentStock(character).some(item => item.enhancement === 2), false);
  character.highestDungeonDepthReached = 10;
  character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.equal(getShopEquipmentStock(character).some(item => item.enhancement === 2), false);
  character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;

  for (const offer of getShopEquipmentStock(character).filter(item => item.enhancement === 2)) {
    const purchased = purchaseEquipment(character, offer);
    assert.equal(purchased.accepted, true);
    assert.equal(purchased.cost, 500);
    character = purchased.character;
    const equipped = equipInstance(character, offer.slot, purchased.instance.instanceId);
    assert.equal(equipped.accepted, true);
    character = equipped.character;
  }
  character = normalizeCharacter(character);
  assert.deepEqual(character.equipmentStatBonuses, { def: 10, dex: 3, agi: 2 });
});

test("thief plus-three armor requires both B20 progression flags", () => {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.highestDungeonDepthReached = 20;
  character.eventFlags.shop_stock_b20f_unlocked = true;
  assert.equal(getShopEquipmentStock(character).some(item => item.enhancement === 3), false);
  character.eventFlags.boss_fallen_mage_b19f_defeated = true;
  const offer = getShopEquipmentOffer(character, "shop_leather_armor_plus_3");
  assert.equal(offer.buyPrice, 1500);
  assert.deepEqual(offer.statBonuses, { def: 3, dex: 2 });
});

test("warrior armor tiers preserve the shield and two-handed defense tradeoff", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const initialArmor = character.equipmentInventory.instances
    .filter(instance => instance.slot !== "rightArmId")
    .map(getEquipmentInstanceDefinition);
  assert.deepEqual(initialArmor.map(item => item.sellPrice), [25, 25, 25, 25]);
  character.gold = 10000;
  character.highestDungeonDepthReached = 20;
  Object.assign(character.eventFlags, {
    shop_stock_b20f_unlocked: true,
    boss_fallen_mage_b19f_defeated: true
  });
  const offers = getShopEquipmentStock(character)
    .filter(item => item.enhancement === 3 && item.allowedJobs?.includes("warrior"));
  assert.equal(offers.length, 4);
  for (const offer of offers) {
    const purchased = purchaseEquipment(character, offer);
    assert.equal(purchased.accepted, true);
    assert.equal(purchased.cost, 1500);
    character = equipInstance(purchased.character, offer.slot, purchased.instance.instanceId).character;
  }
  character = normalizeCharacter(character);
  assert.deepEqual(character.equipmentStatBonuses, { def: 16, dex: 1, str: 3 });

  const greatsword = purchaseEquipment(character, "iron_greatsword");
  const twoHanded = equipInstance(greatsword.character, "rightArmId", greatsword.instance.instanceId);
  assert.equal(twoHanded.character.equippedInstanceIds.leftArmId, null);
  const normalized = normalizeCharacter(twoHanded.character);
  assert.deepEqual(normalized.equipmentStatBonuses, { def: 12, str: 3 });
});

test("equipment below plus three is sold without entering buyback", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 750;
  character.highestDungeonDepthReached = 10;
  Object.assign(character.eventFlags, {
    transfer_portal_b10f_unlocked: true,
    boss_strange_knight_statue_b9f_defeated: true
  });
  const offer = getShopEquipmentOffer(character, "shop_iron_helmet_plus_2");
  const purchased = purchaseEquipment(character, offer);
  const sold = sellEquipmentInstance(purchased.character, purchased.instance.instanceId);
  assert.equal(sold.accepted, true);
  assert.equal(sold.value, 250);
  assert.equal(sold.character.equipmentBuyback.length, 0);
  const boughtBack = purchaseBuybackEquipment(sold.character, purchased.instance.instanceId);
  assert.equal(boughtBack.accepted, false);
  assert.equal(boughtBack.reason, "notFound");
});

test("priest armor tiers trade some defense growth for LUC and AGI", () => {
  let character = createInitialCharacter({ name: "TEST", job: "priest" });
  const initialArmor = character.equipmentInventory.instances
    .filter(instance => instance.slot !== "rightArmId")
    .map(getEquipmentInstanceDefinition);
  assert.deepEqual(initialArmor.map(item => item.sellPrice), [25, 25, 25, 25]);
  assert.equal(getShopEquipmentStock(character).filter(item => item.enhancement === 1).length, 4);

  character.highestDungeonDepthReached = 20;
  Object.assign(character.eventFlags, {
    shop_stock_b20f_unlocked: true,
    boss_fallen_mage_b19f_defeated: true
  });
  character.gold = 6000;
  const offers = getShopEquipmentStock(character)
    .filter(item => item.enhancement === 3 && item.allowedJobs?.includes("priest"));
  assert.equal(offers.length, 4);
  for (const offer of offers) {
    const purchased = purchaseEquipment(character, offer);
    assert.equal(purchased.accepted, true);
    assert.equal(purchased.cost, 1500);
    character = equipInstance(purchased.character, offer.slot, purchased.instance.instanceId).character;
  }
  character = normalizeCharacter(character);
  assert.deepEqual(character.equipmentStatBonuses, { def: 14, luc: 3, agi: 3 });
});

test("priest plus-two armor requires B10 arrival and the strange statue victory", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.highestDungeonDepthReached = 10;
  character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.equal(getShopEquipmentOffer(character, "shop_priest_robe_plus_2"), null);
  character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  const offer = getShopEquipmentOffer(character, "shop_priest_robe_plus_2");
  assert.equal(offer.buyPrice, 500);
  assert.deepEqual(offer.statBonuses, { def: 3, luc: 1 });
});

test("mage armor tiers exchange defense for INT and AGI", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  const initialArmor = character.equipmentInventory.instances
    .filter(instance => instance.slot !== "rightArmId")
    .map(getEquipmentInstanceDefinition);
  assert.deepEqual(initialArmor.map(item => item.sellPrice), [25, 25, 25, 25]);
  assert.equal(getShopEquipmentStock(character).filter(item => item.enhancement === 1).length, 4);

  character.highestDungeonDepthReached = 20;
  Object.assign(character.eventFlags, {
    shop_stock_b20f_unlocked: true,
    boss_fallen_mage_b19f_defeated: true
  });
  character.gold = 6000;
  const offers = getShopEquipmentStock(character)
    .filter(item => item.enhancement === 3 && item.allowedJobs?.includes("mage"));
  assert.equal(offers.length, 4);
  for (const offer of offers) {
    const purchased = purchaseEquipment(character, offer);
    assert.equal(purchased.accepted, true);
    assert.equal(purchased.cost, 1500);
    character = equipInstance(purchased.character, offer.slot, purchased.instance.instanceId).character;
  }
  character = normalizeCharacter(character);
  assert.deepEqual(character.equipmentStatBonuses, { int: 5, def: 10, agi: 3 });
  assert.notEqual(character.equippedInstanceIds.leftArmId, null);
});

test("mage plus-two armor requires B10 arrival and the strange statue victory", () => {
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.highestDungeonDepthReached = 10;
  character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.equal(getShopEquipmentOffer(character, "shop_beginner_grimoire_plus_2"), null);
  character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  const offer = getShopEquipmentOffer(character, "shop_beginner_grimoire_plus_2");
  assert.equal(offer.buyPrice, 500);
  assert.deepEqual(offer.statBonuses, { int: 3 });
  const tier = getShopEquipmentStock(character).filter(item => item.enhancement === 2);
  const totals = tier.reduce((sum, item) => {
    for (const [key, value] of Object.entries(item.statBonuses || {})) {
      sum[key] = (sum[key] || 0) + value;
    }
    return sum;
  }, {});
  assert.deepEqual(totals, { int: 4, def: 8, agi: 2 });
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

test("strong small healing potion unlocks at B50F and heals 30 percent of max HP", () => {
  const item = getItem("strong_healing_potion_small");
  assert.equal(item.buyPrice, 200);
  assert.equal(getShopItemIdsForDepth(49).includes(item.id), false);
  assert.equal(getShopItemIdsForDepth(50).includes(item.id), true);
  const character = characterWith(item.id);
  character.maxHp = 403;
  character.hp = 100;
  const field = resolveFieldItemUse({ character, itemId: item.id, context: "dungeon" });
  assert.equal(field.healing, 121);
  assert.equal(field.character.hp, 221);
});

test("strong antidote unlocks at B50F and cures poison plus deadly poison while healing 60 HP", () => {
  const item = getItem("strong_antidote");
  assert.equal(item.buyPrice, 150);
  assert.equal(item.sellPrice, 75);
  assert.equal(getShopItemIdsForDepth(49).includes(item.id), false);
  assert.equal(getShopItemIdsForDepth(50).includes(item.id), true);
  const character = characterWith(item.id);
  character.maxHp = 200;
  character.hp = 40;
  character.statuses = [{ statusId: "poison" }, { statusId: "deadly_poison" }];
  const result = resolveFieldItemUse({ character, itemId: item.id, context: "dungeon" });
  assert.equal(result.accepted, true);
  assert.equal(result.healing, 60);
  assert.equal(result.character.hp, 100);
  assert.equal(result.character.statuses.some(status => ["poison", "deadly_poison"].includes(status.statusId)), false);
  assert.equal(result.character.condition, "GOOD");
});

test("B50F enemy materials resolve to their registered item data", () => {
  assert.equal(getItem("abyss_tiger_fur").name, "奈落虎の毛皮");
  assert.equal(getItem("abyss_mushroom_cap").name, "キノコの傘");
});

test("Silent Steps passively stacks with Conceal Presence up to full reduction", () => {
  restorePresence(0);
  setPassivePresenceIncreaseReduction(0.5);
  setPresenceIncreaseReduction(0.5);
  assert.equal(getEffectivePresenceIncreaseReduction(), 1);
  onPlayerStep({ random: () => 0 });
  assert.equal(getPresence(), 0);
  setPassivePresenceIncreaseReduction(0);
  clearPresenceIncreaseReduction();
});

test("shop stock uses explicit arrival flags instead of a debug-inflated deepest floor", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.highestDungeonDepthReached = 20;
  character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.deepEqual(getShopItemIdsForCharacter(character).filter(id => id.startsWith("healing_potion")), [
    "healing_potion", "healing_potion_medium"
  ]);
  character.eventFlags.shop_stock_b20f_unlocked = true;
  assert.deepEqual(getShopItemIdsForCharacter(character).filter(id => id.startsWith("healing_potion")), [
    "healing_potion", "healing_potion_medium", "healing_potion_large"
  ]);
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

test("medium antidote shares the final shop unlock and restores 30 HP with or without poison", () => {
  const character = characterWith("antidote_medium");
  character.maxHp = 100;
  character.hp = 10;
  character.statuses = [{ statusId: "poison", remainingTurns: 3 }];
  const result = resolveFieldItemUse({ character, itemId: "antidote_medium", context: "town" });
  assert.equal(result.accepted, true);
  assert.equal(result.character.hp, 40);
  assert.equal(result.character.statuses.length, 0);

  const shopper = createInitialCharacter({ name: "TEST", job: "warrior" });
  shopper.eventFlags.shop_stock_b30f_unlocked = true;
  assert.equal(getShopItemIdsForCharacter(shopper).includes("antidote_medium"), false);
  shopper.eventFlags.boss_iron_maiden_b29f_defeated = true;
  assert.equal(getShopItemIdsForCharacter(shopper).includes("antidote_medium"), true);
  assert.equal(getItem("antidote_medium").buyPrice, 60);
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
  character.gold = 360;
  for (const [itemId, price] of [
    ["healing_potion", 20],
    ["antidote", 30],
    ["guiding_torch", 40],
    ["exorcism_talisman", 50],
    ["holy_water", 20],
    ["treasure_compass", 100],
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

test("shop can purchase several consumables at once", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.gold = 100;
  const result = purchaseItem(character, "healing_potion", { amount: 4 });
  assert.equal(result.accepted, true);
  assert.equal(result.quantity, 4);
  assert.equal(result.cost, 80);
  assert.equal(result.character.gold, 20);
  assert.equal(getItemCount(result.character.inventory, "healing_potion"), 4);
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
  const granted = grantEquipmentInstance(character, "iron_greatsword", "rightArmId", { enhancement: 3 });
  character = granted.character;
  const instance = granted.instance;
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

test("Emergency Escape is an expensive shop consumable with a dungeon-only escape effect", () => {
  const item = getItem("emergency_escape");
  assert.equal(item.buyPrice, 2000);
  assert.equal(item.sellPrice, 1000);
  assert.ok(getShopItemIdsForDepth(1).includes(item.id));
  assert.ok(getShopItemIdsForCharacter(createInitialCharacter({ name: "TEST", job: "thief" })).includes(item.id));

  const user = characterWith(item.id);
  const used = resolveFieldItemUse({ character: user, itemId: item.id, context: "dungeon" });
  assert.equal(used.accepted, true);
  assert.equal(used.environment.emergencyEscape, true);
  assert.equal(getItemCount(used.character.inventory, item.id), 0);
  assert.equal(resolveFieldItemUse({ character: characterWith(item.id), itemId: item.id, context: "town" }).reason, "dungeonOnly");
  assert.equal(resolveFieldItemUse({ character: characterWith(item.id), itemId: item.id, context: "battle" }).reason, "fieldOnly");
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

test("Active Healing Potion Small overheals by one hundred once per battle", () => {
  const character = characterWith("active_healing_potion_small", 2);
  const enemy = {
    id: "test_dummy", name: "DUMMY", race: "beast", hp: 9999, maxHp: 9999,
    sp: 0, maxSp: 0, stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0, attack: 0, actions: [{ id: "wait", name: "待機", actionType: "wait", weight: 1 }],
    experienceReward: 0, statuses: [], equipment: {}, elementMultipliers: {},
    statusResistances: {}, isBoss: false, alive: true
  };
  const first = resolveBattleRound({
    battle: createBattleState({ character, enemy }),
    playerCommand: { type: "item", itemId: "active_healing_potion_small" },
    rng: () => 0.5
  });
  assert.equal(first.accepted, true);
  assert.equal(first.battle.player.hp, first.battle.player.maxHp + 100);
  assert.equal(getItemCount(first.battle.player.inventory, "active_healing_potion_small"), 1);

  const second = resolveBattleRound({
    battle: first.battle,
    playerCommand: { type: "item", itemId: "active_healing_potion_small" },
    rng: () => 0.5
  });
  assert.equal(second.accepted, false);
  assert.equal(second.reason, "oncePerBattle");
  assert.equal(resolveFieldItemUse({
    character: characterWith("active_healing_potion_small"),
    itemId: "active_healing_potion_small",
    context: "dungeon"
  }).reason, "battleOnly");
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

test("presence increase reduction halves odd gains in the player's favor and survives gauge resets", () => {
  restorePresence(0, 0, 0.5);
  onPlayerStep({ random: () => 0.2 });
  assert.equal(getPresence(), 2);
  resetPresence();
  assert.equal(getPresenceIncreaseReduction(), 0.5);
  clearPresenceIncreaseReduction();
  assert.equal(getPresenceIncreaseReduction(), 0);
  setPresenceIncreaseReduction(0.5);
  clearPresenceIncreaseReduction();
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
