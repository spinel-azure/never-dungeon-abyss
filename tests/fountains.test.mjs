import test from "node:test";
import assert from "node:assert/strict";
import {
  DESERT_OASIS,
  DESERT_OASIS_FLOORS,
  DESERT_OASIS_MIRAGE,
  FOUNTAIN_FLOORS,
  floorHasHealingFountain,
  getFountainById,
  isDesertOasisFloor,
  restAtHealingFountain
} from "../data/fountains.js";
import { createInitialCharacter } from "../data/classes.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";

test("healing fountains appear on floors ending in 5 or 9 through B99F", () => {
  assert.deepEqual(FOUNTAIN_FLOORS, [
    5, 9, 15, 19, 25, 29, 35, 39, 45, 49,
    55, 59, 65, 69, 75, 79, 85, 89, 95, 99
  ]);
  for (let depth = 1; depth <= 99; depth++) {
    const shouldHaveFountain = depth % 10 === 5 || depth % 10 === 9;
    assert.equal(floorHasHealingFountain(depth), shouldHaveFountain, `B${depth}F`);
  }
  assert.equal(floorHasHealingFountain(100), false);
  assert.equal(floorHasHealingFountain(8), false);
});

test("configured floors place fountains without competing with stairs, NPCs, or treasures", () => {
  for (const depth of FOUNTAIN_FLOORS) {
    buildBoundaryWallMap(depth, () => 0.5);
    const fountains = cells.flat().filter(cell => cell.fountain);
    assert.equal(fountains.length, isDesertOasisFloor(depth) ? 3 : 1, `B${depth}F`);
    for (const fountain of fountains) {
      assert.equal(fountain.type, "floor");
      assert.equal(fountain.npc, null);
      assert.equal(fountain.treasure, null);
      assert.equal(fountain.bossId, null);
      assert.equal(fountain.eventTreasureId, null);
    }
  }
  buildBoundaryWallMap(6, () => 0.5);
  assert.equal(cells.flat().filter(cell => cell.fountain).length, 0);
});

test("B65F and B69F contain one real oasis and two identical mirages", () => {
  assert.deepEqual(DESERT_OASIS_FLOORS, [65, 69]);
  assert.equal(DESERT_OASIS.image, "images/npc/fountain_02.avif");
  assert.equal(DESERT_OASIS_MIRAGE.image, DESERT_OASIS.image);
  assert.equal(DESERT_OASIS_MIRAGE.minimapMark, DESERT_OASIS.minimapMark);
  assert.equal(getFountainById(DESERT_OASIS.id).kind, "real");
  assert.equal(getFountainById(DESERT_OASIS_MIRAGE.id).kind, "mirage");
  for (const depth of DESERT_OASIS_FLOORS) {
    buildBoundaryWallMap(depth, () => 0.5);
    const ids = cells.flat().map(cell => cell.fountain).filter(Boolean);
    assert.equal(ids.filter(id => id === DESERT_OASIS.id).length, 1, `B${depth}F real oasis`);
    assert.equal(ids.filter(id => id === DESERT_OASIS_MIRAGE.id).length, 2, `B${depth}F mirages`);
  }
});

test("oasis mirages share the prompt and disappear with a reduced-motion-safe fade", async () => {
  const { readFile } = await import("node:fs/promises");
  const [playerSource, rendererSource] = await Promise.all([
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);
  assert.match(playerSource, /オアシスがある。ここで休んでいけそうだ。休みますか？/);
  assert.match(playerSource, /オアシスはゆらゆらと陽炎のごとく消え去った……。/);
  assert.match(playerSource, /removeFountainAt\(event\.fountainGX, event\.fountainGY\)/);
  assert.match(rendererSource, /event\.phase === "mirageFading"/);
  assert.match(rendererSource, /prefers-reduced-motion: reduce/);
  assert.match(rendererSource, /Math\.sin\(mirageProgress \* Math\.PI \* 12\)/);
});

test("fountain rest fully restores HP and SP without curing status conditions", () => {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.hp = 1;
  character.sp = 2;
  character.statuses = [{ id: "poison", remaining: 3 }];
  const rested = restAtHealingFountain(character);
  assert.equal(rested.hp, character.maxHp);
  assert.equal(rested.sp, character.maxSp);
  assert.deepEqual(rested.statuses, character.statuses);
});
