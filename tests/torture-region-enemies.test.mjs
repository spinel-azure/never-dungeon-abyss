import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

import { getEnemyById, getTortureRegionEncounterFormation } from "../data/enemies.js";
import { resolvePhysicalAttack } from "../combat/resolve-physical-attack.js";

const IDS = ["morgenstern", "inquisitorin", "folterzange", "folterpanzer"];

test("B20F torture-region enemies use their supplied images and replace the prior pool", async () => {
  const expected = new Map([
    ["morgenstern", ["images/enemies/enemy_44.avif", 20, 29, [1, 3]]],
    ["inquisitorin", ["images/enemies/enemy_41.avif", 20, 29, [1, 2]]],
    ["folterzange", ["images/enemies/enemy_42.avif", 22, 29, [1, 2]]],
    ["folterpanzer", ["images/enemies/enemy_43.avif", 25, 29, undefined]]
  ]);
  for (const id of IDS) {
    const enemy = getEnemyById(id);
    const [image, minimumDepth, maximumDepth, countRange] = expected.get(id);
    assert.equal(enemy.image, image);
    assert.equal(enemy.minimumDepth, minimumDepth);
    assert.equal(enemy.maximumDepth, maximumDepth);
    assert.deepEqual(enemy.encounterCountRange, countRange);
    await access(new URL(`../${image}`, import.meta.url));
  }
  for (const id of ["giant_spider", "wasp", "poison_toad", "banshee"]) {
    assert.equal(getEnemyById(id).maximumDepth, 19);
  }
});

test("all torture-region enemies use the B90F three-action pattern", () => {
  for (const id of IDS) {
    const enemy = getEnemyById(id);
    assert.deepEqual(enemy.actions.map(entry => entry.weight), [55, 35, 10]);
    assert.equal(enemy.actions[2].when.hpRateBelow, 0.5);
  }
});

test("torture-region third actions implement bleeding, defense ignore, and restraint", () => {
  assert.equal(getEnemyById("morgenstern").actions[2].action.effects[0].statusId, "bleeding");
  assert.equal(getEnemyById("inquisitorin").actions[2].action.ignoresDefense, true);
  assert.equal(getEnemyById("folterzange").actions[2].action.effects[0].statusId, "action_skip");
  assert.equal(getEnemyById("folterpanzer").actions[2].action.effects[0].statusId, "bleeding");
  const inquisitor = getEnemyById("inquisitorin");
  const result = resolvePhysicalAttack({
    attacker: { ...inquisitor.stats },
    defender: { def: 999, stats: {} },
    attack: inquisitor.actions[2].action,
    rng: () => 0.5
  });
  assert.equal(result.effectiveDefense, 0);
});

test("torture-region formations unlock progressively and stay within three enemies", () => {
  for (const [depth, expectedIds] of [[20, ["morgenstern", "inquisitorin"]], [22, ["morgenstern", "inquisitorin", "folterzange"]], [25, IDS]]) {
    const seen = new Set();
    for (let index = 0; index < 200; index += 1) {
      const party = getTortureRegionEncounterFormation({ depth, rng: () => index / 200 });
      assert.ok(party.length >= 1 && party.length <= 3);
      party.forEach(enemy => seen.add(enemy.id));
    }
    assert.deepEqual([...seen].sort(), [...expectedIds].sort());
  }
});
