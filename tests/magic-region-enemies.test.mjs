import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { getEnemyById, getMagicRegionEncounterFormation } from "../data/enemies.js";
import { resolveSpell } from "../combat/resolve-spell.js";

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

test("magic-region stats and spell damage stay appropriate for the shallow B10F band", () => {
  const expectedBalance = {
    junghexe: { level: 14, maxHp: 100, int: 12, def: 9, attack: 9, experienceReward: 75 },
    merseburg_spell: { level: 11, maxHp: 38, int: 9, def: 6, attack: 6, experienceReward: 25 },
    geistflamme: { level: 13, maxHp: 44, int: 11, def: 6, attack: 7, experienceReward: 30 },
    tanzlichter: { level: 10, maxHp: 32, int: 8, def: 5, attack: 6, experienceReward: 20 }
  };
  for (const [id, balance] of Object.entries(expectedBalance)) {
    const enemy = getEnemyById(id);
    for (const [key, value] of Object.entries(balance)) {
      assert.equal(key === "int" ? enemy.stats.int : enemy[key], value, `${id}.${key}`);
    }
    for (const entry of enemy.actions.filter(entry => entry.action.actionType === "spell")) {
      const result = resolveSpell({
        attacker: { int: enemy.stats.int }, defender: {}, spell: entry.action, rng: () => 0.999999
      });
      assert.ok(result.totalDamage <= 19, `${id}.${entry.action.id}: ${result.totalDamage}`);
    }
  }
});

test("B10F begins with single enemies and unlocks larger groups gradually", () => {
  const maximumPartySize = depth => {
    let maximum = 0;
    for (let index = 0; index < 1000; index += 1) {
      maximum = Math.max(maximum, getMagicRegionEncounterFormation({
        depth, rng: () => (index + 0.5) / 1000
      }).length);
    }
    return maximum;
  };
  assert.equal(maximumPartySize(10), 1);
  assert.equal(maximumPartySize(11), 2);
  assert.equal(maximumPartySize(13), 3);
  assert.equal(maximumPartySize(19), 3);
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
