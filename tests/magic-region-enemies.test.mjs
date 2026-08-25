import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { getEnemyById, getMagicRegionEncounterFormation } from "../data/enemies.js";

const expected = Object.freeze([
  ["junghexe", "ユングヘクセ", "images/enemies/enemy_45.avif", "medium", 1, 1],
  ["merseburg_spell", "メルゼブルクの呪文", "images/enemies/enemy_46.avif", "small", 1, 3],
  ["geistflamme", "ガイストフラメ", "images/enemies/enemy_47.avif", "small", 1, 3],
  ["tanzlichter", "タンツロイヒター", "images/enemies/enemy_48.avif", "small", 1, 3]
]);

test("B10F to B19F magic-region enemies use the requested names, images and display sizes", async () => {
  for (const [id, name, image, battleSize, minimum, maximum] of expected) {
    const enemy = getEnemyById(id);
    assert.ok(enemy, id);
    assert.equal(enemy.name, name);
    assert.equal(enemy.image, image);
    assert.equal(enemy.battleSize, battleSize);
    assert.equal(enemy.minimumDepth, 10);
    assert.equal(enemy.maximumDepth, 19);
    assert.deepEqual(enemy.encounterCountRange, [minimum, maximum]);
    await access(new URL(`../${image}`, import.meta.url));
  }
});

test("magic-region enemies use the B90F-style three-action weighting", () => {
  for (const [id] of expected) {
    const enemy = getEnemyById(id);
    assert.deepEqual(enemy.actions.map(entry => entry.weight), [55, 35, 10], id);
    assert.deepEqual(enemy.actions[2].when, { hpRateBelow: 0.5 }, id);
  }
});

test("magic-region formations keep Junghexe single and the smaller enemies at one to three", () => {
  const seen = new Set();
  for (let index = 0; index < 1000; index += 1) {
    const party = getMagicRegionEncounterFormation({ depth: 10 + (index % 10), rng: () => (index + 0.5) / 1000 });
    assert.ok(party.length >= 1 && party.length <= 3);
    assert.equal(new Set(party.map(enemy => enemy.id)).size, 1);
    const id = party[0].id;
    seen.add(id);
    assert.equal(id === "junghexe" ? party.length === 1 : party.length <= 3, true);
  }
  assert.deepEqual([...seen].sort(), expected.map(([id]) => id).sort());
  assert.deepEqual(getMagicRegionEncounterFormation({ depth: 9, rng: () => 0 }), []);
  assert.deepEqual(getMagicRegionEncounterFormation({ depth: 20, rng: () => 0 }), []);
});

test("random encounters route B10F to B19F through the magic-region formation table", async () => {
  const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(main, /currentDepth >= 10 && currentDepth <= 19[\s\S]*?getMagicRegionEncounterFormation/);
});
