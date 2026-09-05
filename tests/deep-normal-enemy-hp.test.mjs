import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { recordMonsterDefeat } from "../data/compendium.js";
import {
  createEnemyCombatant,
  getCrystalRegionEncounterFormation,
  getDarkRegionEncounterFormation,
  getEnemyById,
  getEnemyEncounterCount,
  getWaterRegionEncounterFormation,
  enemies
} from "../data/enemies.js";
import { getBossById } from "../data/bosses.js";
import { getMonsterCompendiumEntries } from "../data/monster-compendium.js";

const EXPECTED_HP = Object.freeze({
  abyss_lizard: 240,
  abyss_giant_scorpion: 480,
  cobra_gator: 560,
  abyss_piranha: 280,
  abgrund_aal: 540,
  abgrund_krabbe: 650,
  abyss_giant_catfish: 850,
  abyss_crystal_beetle: 400,
  prism_moth: 420,
  amethyst_golem: 1100,
  crystal_mimic: 950,
  sensenmann: 700,
  wraith: 1050,
  will_o_wisp: 420,
  schleipnir: 1500
});

const NON_HP_FINGERPRINTS = Object.freeze({
  abyss_lizard: "7e961e7935193ca13493bfe2cfe211416b5f58293acbd8f42b56c97fab55b8bf",
  abyss_giant_scorpion: "bbef233b585b3fa3d959b91bb6bb82c7f9e5490f82836676a14db8f8d3e5f081",
  cobra_gator: "5e436ac23b1f2902e2f2b31887b094ad4a52c856a179fec33e7bc736bc4d7ef2",
  abyss_piranha: "6ce2852d7d11e55d75411837b141238467cb42cbd1ad0fe319e0115bd600baab",
  abgrund_aal: "edcd22a9ad706c2804fe03d663b87ae18711c25e473b75f4b9dc3917fa5cb40b",
  abgrund_krabbe: "fb073745bd7a6cf998db41c0f8131fc9bcd5f335d38a328fba88237a3a624abf",
  abyss_giant_catfish: "b7db4365dcc4548a5b11b0d8a02f0f2cd74f543ef150138ce78868387c2e053e",
  abyss_crystal_beetle: "8f1b4a816cf3c474a252d504a32aed262487200818cfbb6ea68aead1a14b94f4",
  prism_moth: "218ee01a7f94f713094af456356b8a9282b792a076b695aa2acf79de0094ebe8",
  amethyst_golem: "caef49a7c3a113b9ed86ec346493a72f097d1435ae97016e35a60677e250d456",
  crystal_mimic: "cfe48e3b427126fa321f15082d571798cce9535a919564dac376d5965324569e",
  sensenmann: "1be62bd48cf9ab0b819cfe115fe3a37d487fea44a506e0de65bcb8cdbf76378c",
  wraith: "7c0b35cc28996cb255f6a34e20f5d1eb93f8c13a27b2c03595c2b8e690f62a2e",
  will_o_wisp: "4c2d18ba8e99754de41a32c041737fa7449161cb37659e7d6b25444851b978bf",
  schleipnir: "279264d3da076e356383ef631e2f4ecd52f7497623751d0b241c8042dc48fe94"
});

const hashWithoutHp = enemy => createHash("sha256")
  .update(JSON.stringify(Object.fromEntries(Object.entries(enemy).filter(([key]) => key !== "maxHp"))))
  .digest("hex");

const ids = formation => formation.map(enemy => enemy.id);

test("B60F through B99F normal enemies use the requested HP and spawn at full health", () => {
  for (const [id, expected] of Object.entries(EXPECTED_HP)) {
    const definition = getEnemyById(id);
    const combatant = createEnemyCombatant(definition);
    assert.equal(definition.maxHp, expected, id);
    assert.equal(combatant.maxHp, expected, id);
    assert.equal(combatant.hp, expected, id);
    assert.equal(combatant.alive, true, id);
  }
});

test("the HP adjustment leaves every other field of the fifteen enemy definitions unchanged", () => {
  for (const [id, expected] of Object.entries(NON_HP_FINGERPRINTS)) {
    assert.equal(hashWithoutHp(getEnemyById(id)), expected, id);
  }
});

test("B30F through B59F normal-enemy HP remains unchanged", () => {
  const expected = {
    fire_spirit: 145, fire_lizard: 178, loren_lava: 225, cassowary: 205,
    ice_spirit: 230, ice_lizard: 275, ice_vogel: 260, ice_bear: 360,
    abyss_tiger: 430, abyss_panther: 340, abyss_mushroom: 365
  };
  assert.deepEqual(
    Object.fromEntries(enemies.filter(enemy => Object.hasOwn(expected, enemy.id)).map(enemy => [enemy.id, enemy.maxHp])),
    expected
  );
});

test("boss, fixed-enemy, obstacle, and B100F HP remains unchanged", () => {
  const expected = {
    wicker_man_b39f: 1100,
    eiskoenigin_b49f: 1350,
    musk_beast_b56f: 2000,
    giant_vine_obstacle: 500,
    fleischfresser_b59f: 10000,
    todes_scorpio_b64f: 40000,
    sphinx_b69f: 4200,
    jirene_b79f: 7000,
    kriechendes_chaos_b89f: 14000,
    seelenwuerger_b99f: 22000,
    erzdaemonin_b100f: 28000,
    amayenak_b100f: 36000
  };
  assert.deepEqual(
    Object.fromEntries(Object.keys(expected).map(id => [id, getBossById(id)?.maxHp])),
    expected
  );
});

test("deep-region formations keep their single, grouped, and mixed encounter shapes", () => {
  assert.equal(getEnemyEncounterCount("abyss_lizard", () => 0.999), 3);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 72, rng: () => 0.6 })), [
    "abyss_piranha", "abyss_piranha", "abyss_piranha"
  ]);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 78, rng: () => 0.999 })), [
    "abyss_piranha", "abyss_piranha", "abgrund_krabbe"
  ]);
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 81, rng: () => 0.999 })), [
    "abyss_crystal_beetle", "abyss_crystal_beetle", "abyss_crystal_beetle"
  ]);
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 88, rng: () => 0.999 })), [
    "amethyst_golem", "abyss_crystal_beetle", "abyss_crystal_beetle"
  ]);
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 95, rng: () => 0.2 })), [
    "sensenmann", "sensenmann"
  ]);
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 99, rng: () => 0.75 })), [
    "will_o_wisp", "will_o_wisp", "will_o_wisp"
  ]);
});

test("monster compendium reports the adjusted HP after a defeat is recorded", () => {
  let character = createInitialCharacter({ name: "COMPENDIUM", job: "warrior" });
  for (const id of Object.keys(EXPECTED_HP)) {
    character.compendium = recordMonsterDefeat(character.compendium, id);
  }
  const displayed = new Map(
    getMonsterCompendiumEntries(character).filter(entry => Object.hasOwn(EXPECTED_HP, entry.id))
      .map(entry => [entry.id, entry.maxHp])
  );
  for (const [id, expected] of Object.entries(EXPECTED_HP)) {
    assert.equal(displayed.get(id), expected.toLocaleString("ja-JP"), id);
  }
});

test("legacy character normalization is unaffected by enemy HP data changes", () => {
  const legacy = createInitialCharacter({ name: "LEGACY", job: "priest" });
  delete legacy.compendium;
  delete legacy.crystalFloorStepCount;
  const normalized = normalizeCharacter(structuredClone(legacy));
  assert.equal(normalized.name, "LEGACY");
  assert.equal(normalized.job, "priest");
  assert.deepEqual(normalized.compendium.monsters, {});
  assert.deepEqual(normalized.compendium.items, {});
  assert.deepEqual(normalized.compendium.keyItems, {});
  assert.ok(Object.keys(normalized.compendium.equipment).length > 0);
  assert.equal(normalized.crystalFloorStepCount, 0);
});
