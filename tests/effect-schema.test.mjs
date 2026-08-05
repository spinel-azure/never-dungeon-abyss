import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeEffectDefinition } from "../js/effects/effect-schema.js";
import { hasUncertainLoot } from "../js/loot-identification.js";

test("lot bag cracker JSON remains compatible with the generic effect schema", async () => {
  const source = JSON.parse(await readFile(new URL("../data/effects/lot_bag_identify.json", import.meta.url), "utf8"));
  const effect = normalizeEffectDefinition(source);
  assert.equal(effect.id, "lot_bag_identify");
  assert.equal(effect.parts.length, 1);
  assert.equal(effect.parts[0].type, "cracker");
  assert.equal(effect.parts[0].count, 200);
});

test("lot bag identification is skipped only when all carried loot is already known", () => {
  const getItem = id => ({ rat_tail: { category: "material" }, healing_potion: { category: "consumable" } })[id];
  assert.equal(hasUncertainLoot({ gold: 100, items: { rat_tail: 2 }, equipmentInstances: [] }, getItem), false);
  assert.equal(hasUncertainLoot({ items: { healing_potion: 1 }, equipmentInstances: [] }, getItem), true);
  assert.equal(hasUncertainLoot({ items: {}, equipmentInstances: [{ id: "weapon_1" }] }, getItem), true);
});
