import test from "node:test";
import assert from "node:assert/strict";

import {
  DUNGEON_FEATURE_PRIORITIES,
  DUNGEON_PLACEMENT_ORDER,
  reserveDungeonFeature,
  runDungeonPlacementTransaction
} from "../js/dungeon-feature-placement.js";
import {
  buildBoundaryWallMap,
  cells,
  getLastDungeonBuildReport,
  setStartPosition,
  validateDungeonLayout
} from "../js/dungeon.js";

test("feature reservations protect footprints and their interaction approaches", () => {
  const grid = makeGrid(3, 3);
  const reservation = reserveDungeonFeature(grid, {
    featureId: "boss_room_test",
    type: "bossRoom",
    footprint: [{ x: 1, y: 1 }],
    approaches: [{ x: 1, y: 0 }],
    priority: DUNGEON_FEATURE_PRIORITIES.bossRoom
  });
  assert.equal(reservation.accepted, true);
  assert.equal(grid[1][1].reserved, "bossRoom");
  assert.equal(grid[0][1].featureApproach.id, "boss_room_test");
  assert.equal(reserveDungeonFeature(grid, {
    featureId: "conflict",
    type: "specialRoom",
    footprint: [{ x: 1, y: 0 }]
  }).reason, "conflict");
});

test("failed placement transactions restore every changed cell", () => {
  const grid = makeGrid(2, 2);
  const before = structuredClone(grid);
  const result = runDungeonPlacementTransaction(grid, () => {
    grid[0][0].reserved = "temporary";
    grid[1][1].walls.N = false;
    return null;
  });
  assert.equal(result, null);
  assert.deepEqual(grid, before);
});

test("generation order keeps mandatory boss rooms ahead of optional features", () => {
  assert.ok(DUNGEON_PLACEMENT_ORDER.indexOf("bossRoom") < DUNGEON_PLACEMENT_ORDER.indexOf("specialRoom"));
  assert.ok(DUNGEON_PLACEMENT_ORDER.indexOf("specialRoom") < DUNGEON_PLACEMENT_ORDER.indexOf("npc"));
  assert.ok(DUNGEON_FEATURE_PRIORITIES.bossRoom > DUNGEON_FEATURE_PRIORITIES.specialRoom);
});

test("post-generation validation protects future feature approaches", () => {
  setStartPosition(0, 0);
  for (const depth of [1, 5, 9, 10, 19, 100]) {
    buildBoundaryWallMap(depth, seeded(depth * 17), {});
    const report = validateDungeonLayout({ depth });
    assert.equal(report.valid, true, report.errors.join(" / "));
    assert.equal(getLastDungeonBuildReport().valid, true);
    for (const cell of cells.flat().filter(candidate => candidate.featureApproach)) {
      assert.equal(cell.npc, null);
      assert.equal(cell.treasure, null);
      assert.equal(cell.fountain, null);
    }
  }
});

function makeGrid(width, height) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => ({
    x,
    y,
    reserved: null,
    featureReservation: null,
    featureApproach: null,
    walls: { N: true, E: true, S: true, W: true }
  })));
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
