import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EFFECT_PART_TYPES, normalizeEffectDefinition } from "../js/effects/effect-schema.js";
import { prepareBattleSkillEffect } from "../js/battle-skill-presentation.js";
import { SPELLS } from "../data/spells.js";
import { getLotEquipmentHighlightClass, hasUncertainLoot, isHighlightedLotCardRarity, isHighlightedLotEquipment } from "../js/loot-identification.js";

test("lot bag cracker JSON remains compatible with the generic effect schema", async () => {
  const source = JSON.parse(await readFile(new URL("../data/effects/lot_bag_identify.json", import.meta.url), "utf8"));
  const effect = normalizeEffectDefinition(source);
  assert.equal(effect.id, "lot_bag_identify");
  assert.equal(effect.parts.length, 1);
  assert.equal(effect.parts[0].type, "cracker");
  assert.equal(effect.parts[0].count, 200);
});

test("fire ball uses its data-driven depth orb timeline and runtime damage popup", async () => {
  const source = JSON.parse(await readFile(new URL("../data/effects/fire_ball.json", import.meta.url), "utf8"));
  const effect = normalizeEffectDefinition(prepareBattleSkillEffect(source, 321));
  assert.equal(effect.version, 3);
  assert.equal(effect.id, "fire_ball");
  assert.equal(effect.name, "炎よ、燃やせ！");
  assert.equal(effect.description, "魔術師向けの炎属性魔法スキル。");
  assert.equal(effect.duration, 1300);
  assert.deepEqual(effect.parts.map(part => [part.type, part.start, part.duration]), [
    ["depthOrb", 0, 600],
    ["explosion", 600, 300],
    ["popup", 900, 500],
    ["shake", 900, 300]
  ]);
  assert.equal(effect.parts.find(part => part.type === "popup").text, "321");
  assert.equal(effect.parts.find(part => part.type === "popup").valueSource, "fixed");
  assert.equal(SPELLS.fireball.name, "炎よ、燃やせ！");
  assert.equal(SPELLS.fireball.presentationId, "fire_ball");
});

test("the shared battle effect schema retains every generator-only presentation part", () => {
  for (const type of ["cutin", "whiteout", "blackout", "depthOrb"]) {
    assert.ok(EFFECT_PART_TYPES[type], `${type} must be available in the NDA runtime`);
  }
  const effect = normalizeEffectDefinition({
    version: 3,
    duration: 900,
    parts: [{
      type: "cutin",
      imageData: "data:image/png;base64,abc",
      fileName: "cutin.png",
      start: 0,
      duration: 900
    }]
  });
  assert.equal(effect.parts[0].imageData, "data:image/png;base64,abc");
});

test("lot bag identification is skipped only when all carried loot is already known", () => {
  const getItem = id => ({ rat_tail: { category: "material" }, healing_potion: { category: "consumable" } })[id];
  assert.equal(hasUncertainLoot({ gold: 100, items: { rat_tail: 2 }, equipmentInstances: [] }, getItem), false);
  assert.equal(hasUncertainLoot({ items: { healing_potion: 1 }, equipmentInstances: [] }, getItem), true);
  assert.equal(hasUncertainLoot({ items: {}, equipmentInstances: [{ id: "weapon_1" }] }, getItem), true);
});

test("lot bag highlights SR-or-higher cards and equipment enhanced to plus three or more", () => {
  assert.equal(isHighlightedLotCardRarity("R"), false);
  for (const rarity of ["SR", "L", "Z"]) assert.equal(isHighlightedLotCardRarity(rarity), true);
  assert.equal(isHighlightedLotEquipment({ enhancement: 2 }), false);
  assert.equal(isHighlightedLotEquipment({ enhancement: 3 }), true);
  assert.equal(isHighlightedLotEquipment({ enhancement: 4 }), true);
});

test("special unique weapons use the orange lot-bag highlight ahead of plus-three yellow", () => {
  assert.equal(getLotEquipmentHighlightClass({ enhancement: 0 }, { lotBagHighlight: "orange" }), "is-special-unique");
  assert.equal(getLotEquipmentHighlightClass({ enhancement: 3 }, { lotBagHighlight: "orange" }), "is-special-unique");
  assert.equal(getLotEquipmentHighlightClass({ enhancement: 3 }, {}), "is-super-rare");
  assert.equal(getLotEquipmentHighlightClass({ enhancement: 0 }, {}), "");
});
