import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantItem } from "../data/inventory.js";
import { grantKeyItem } from "../data/key-items.js";
import {
  createInitialCompendium,
  normalizeCompendium,
  recordEquipmentObtained,
  recordMonsterDefeat,
  recordMonsterDrop,
  recordMonsterEncounter
} from "../data/compendium.js";

test("compendium records encounters, defeats, counts, and discovered drops", () => {
  let compendium = createInitialCompendium();
  compendium = recordMonsterEncounter(compendium, ["abyss_rat", "abyss_rabbit"]);
  compendium = recordMonsterDefeat(compendium, "abyss_rat");
  compendium = recordMonsterDefeat(compendium, "abyss_rat", 2);
  compendium = recordMonsterDrop(compendium, "abyss_rat", "rat_tail");
  assert.deepEqual(compendium.monsters.abyss_rat, {
    encountered: true,
    defeated: true,
    defeatCount: 3,
    discoveredDropIds: ["rat_tail"]
  });
  assert.equal(compendium.monsters.abyss_rabbit.encountered, true);
  assert.equal(compendium.monsters.abyss_rabbit.defeated, false);
});

test("equipment compendium uses the base equipment id independently of enhancement", () => {
  let compendium = recordEquipmentObtained(createInitialCompendium(), "iron_longsword");
  compendium = recordEquipmentObtained(compendium, "iron_longsword");
  assert.deepEqual(Object.keys(compendium.equipment), ["iron_longsword"]);
  assert.deepEqual(compendium.equipment.iron_longsword, { discovered: true, obtained: true });
});

test("legacy saves backfill held collectibles and existing boss victory flags", () => {
  const legacy = createInitialCharacter({ name: "OLD", job: "warrior" });
  delete legacy.compendium;
  legacy.inventory = grantItem(legacy.inventory, "antidote", 1).inventory;
  legacy.warehouse.itemStacks.push({ itemId: "healing_potion", count: 7 });
  legacy.keyItems = grantKeyItem(legacy.keyItems, "queen_tiara").keyItems;
  legacy.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  legacy.equipmentInventory.instances[0].enhancement = 3;

  const restored = normalizeCharacter(legacy).compendium;
  assert.equal(restored.items.antidote.obtained, true);
  assert.equal(restored.items.healing_potion.obtained, true);
  assert.equal(restored.keyItems.queen_tiara.obtained, true);
  assert.equal(restored.equipment.iron_longsword.obtained, true);
  assert.equal(restored.monsters.strange_knight_statue_b9f.defeated, true);
  assert.equal(restored.monsters.strange_knight_statue_b9f.defeatCount, 1);
});

test("compendium normalization discards unknown ids without losing known progress", () => {
  const normalized = normalizeCompendium({
    monsters: {
      abyss_rat: { encountered: true, defeated: false, defeatCount: 0, discoveredDropIds: [] },
      future_monster: { encountered: true, defeated: true, defeatCount: 99 }
    },
    items: { antidote: { discovered: true, obtained: true, obtainedCount: 4 }, fake_item: { discovered: true } },
    keyItems: {},
    equipment: {}
  });
  assert.equal(normalized.monsters.abyss_rat.encountered, true);
  assert.equal(normalized.monsters.future_monster, undefined);
  assert.equal(normalized.items.antidote.obtainedCount, 4);
  assert.equal(normalized.items.fake_item, undefined);
});

test("main game connects battle encounters, victories, drops, and saves to the compendium", async () => {
  const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(main, /if \(started\) recordCompendiumEncounter/);
  assert.match(main, /recordCompendiumMonsterDefeat\(character\.compendium, defeatedEnemy\.id\)/);
  assert.match(main, /recordMonsterDrop\(character\.compendium, battle\.enemy\.id, drop\.itemId\)/);
  assert.match(main, /backfillCompendiumFromCharacter\(character\.compendium, character\)/);
});
