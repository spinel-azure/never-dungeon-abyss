import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EFFECT_PART_TYPES, normalizeEffectDefinition } from "../js/effects/effect-schema.js";
import { prepareBattleSkillEffect } from "../js/battle-skill-presentation.js";
import { SPELLS } from "../data/spells.js";
import { getEquipmentHighlightClass, getLotEquipmentHighlightClass, hasUncertainLoot, isHighlightedLotCardRarity, isHighlightedLotEquipment } from "../js/loot-identification.js";

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
  assert.equal(effect.duration, 1600);
  assert.deepEqual(effect.parts.map(part => [part.type, part.start, part.duration]), [
    ["depthOrb", 0, 500],
    ["explosion", 483, 500],
    ["shake", 483, 300],
    ["popup", 700, 500]
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

test("inventory, equipment selection, status, and lot bag share equipment highlight priority", () => {
  assert.equal(getEquipmentHighlightClass({ enhancement: 2 }, {}), "");
  assert.equal(getEquipmentHighlightClass({ enhancement: 3 }, {}), "is-super-rare");
  assert.equal(getEquipmentHighlightClass({ enhancement: 0 }, { lotBagHighlight: "orange" }), "is-special-unique");
  assert.equal(getEquipmentHighlightClass({ enhancement: 3 }, { lotBagHighlight: "orange" }), "is-special-unique");
  assert.equal(
    getEquipmentHighlightClass({ enhancement: 3 }, { lotBagHighlight: "orange" }),
    getLotEquipmentHighlightClass({ enhancement: 3 }, { lotBagHighlight: "orange" })
  );
});

test('lightning spells share the requested temporary enemy-following timeline', async () => {
  const registry=JSON.parse(await readFile(new URL('../data/effects/battle-presentations.json',import.meta.url),'utf8'));
  assert.equal(registry.lightning_pierce,'data/effects/lightning.json');
  assert.equal(registry.lightning_bolt,registry.lightning_pierce);
  const source=JSON.parse(await readFile(new URL('../data/effects/lightning.json',import.meta.url),'utf8'));
  const effect=normalizeEffectDefinition(prepareBattleSkillEffect(source,456));
  assert.equal(effect.duration,1600);
  assert.deepEqual(effect.parts.map(p=>[p.type,p.anchor,p.start,p.duration]),[
    ['lightning','enemy',0,500],['spark','enemy',180,500],['shake','screen',200,300],['popup','enemy',220,500]
  ]);
  assert.equal(effect.parts[0].width,50);assert.equal(effect.parts[0].lineWidth,8);
  assert.equal(effect.parts[3].text,'456');assert.equal(effect.parts[3].fontFamily,'pixel');assert.equal(effect.parts[3].fontSize,42);
});

test('fire export preserves its screen trajectory, enemy impact and 100ms SE', async () => {
  const effect=JSON.parse(await readFile(new URL('../data/effects/fire_ball.json',import.meta.url),'utf8'));
  assert.equal(effect.parts[0].anchor,'screen');assert.equal(effect.parts[0].pathPoints,'314,527;395,46;481,280');
  assert.equal(effect.parts[0].depthDirection,'nearToFar');assert.equal(effect.parts[1].anchor,'enemy');
  assert.equal(effect.parts[3].anchor,'enemy');assert.equal(effect.parts[3].fontFamily,'pixel');
  assert.deepEqual(effect.audioTracks.map(t=>[t.src,t.start,t.duration,t.volume,t.loop]),[['se/fire_attack.wav',0,100,80,false]]);
  const wav=await readFile(new URL('../se/fire_attack.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
});

test('ice spell uses one enemy-relative orbit with screen damage and the requested cutoff',async()=>{
 const registry=JSON.parse(await readFile(new URL('../data/effects/battle-presentations.json',import.meta.url),'utf8'));
 assert.equal(registry[SPELLS.ice_bind.presentationId||SPELLS.ice_bind.id],'data/effects/ice.json');
 const source=JSON.parse(await readFile(new URL('../data/effects/ice.json',import.meta.url),'utf8'));
 const effect=normalizeEffectDefinition(prepareBattleSkillEffect(source,654));
 assert.equal(effect.duration,900);
 assert.deepEqual(effect.parts.map(p=>[p.type,p.anchor,p.start,p.duration]),[['ice','enemy',0,700],['shake','screen',180,300],['popup','screen',200,800]]);
 assert.equal(effect.parts[0].spinTurns,1);assert.equal(effect.parts[0].easing,'linear');
 assert.equal(effect.parts[2].text,'654');assert.equal(effect.parts[2].fontFamily,'pixel');
 assert.deepEqual(effect.audioTracks.map(t=>[t.src,t.start,t.duration,t.volume,t.loop]),[['se/water_attack.wav',0,100,80,false]]);
 const wav=await readFile(new URL('../se/water_attack.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');
});
