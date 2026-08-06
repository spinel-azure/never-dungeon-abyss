import test from "node:test";
import assert from "node:assert/strict";
import { FOUNTAIN_FLOORS, floorHasHealingFountain, restAtHealingFountain } from "../data/fountains.js";
import { createInitialCharacter } from "../data/classes.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";

test("healing fountain floors are data-driven and include B5F, B9F, B15F and B19F", () => {
  assert.deepEqual(FOUNTAIN_FLOORS, [5, 9, 15, 19]);
  assert.equal(floorHasHealingFountain(5), true);
  assert.equal(floorHasHealingFountain(9), true);
  assert.equal(floorHasHealingFountain(15), true);
  assert.equal(floorHasHealingFountain(19), true);
  assert.equal(floorHasHealingFountain(8), false);
});

test("configured floors place one fountain without competing with stairs, NPCs, or treasures", () => {
  for (const depth of FOUNTAIN_FLOORS) {
    buildBoundaryWallMap(depth, () => 0.5);
    const fountains = cells.flat().filter(cell => cell.fountain);
    assert.equal(fountains.length, 1, `B${depth}F`);
    assert.equal(fountains[0].type, "floor");
    assert.equal(fountains[0].npc, null);
    assert.equal(fountains[0].treasure, null);
    assert.equal(fountains[0].bossId, null);
    assert.equal(fountains[0].eventTreasureId, null);
  }
  buildBoundaryWallMap(6, () => 0.5);
  assert.equal(cells.flat().filter(cell => cell.fountain).length, 0);
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
