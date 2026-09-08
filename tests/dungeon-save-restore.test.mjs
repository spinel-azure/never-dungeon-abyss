import test from "node:test";
import assert from "node:assert/strict";

import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getRestoredTreasureType } from "../js/dungeon-save-restore.js";

function restoreSavedTreasures(savedCells, depth, eventFlags = {}) {
  return savedCells.map(row => row.map(cell => ({
    ...cell,
    treasure: getRestoredTreasureType(cell, {
      depth,
      blackChestsUnlocked: Boolean(eventFlags.black_chests_unlocked),
      specialRoomHasFixedContent: false
    })
  })));
}

for (const depth of [3, 10, 40, 80]) {
  test(`B${depth}F restores generated unopened red chests at their saved positions`, () => {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true, maikaeferNestRoll: 1 });
    const saved = structuredClone(cells);
    const redPositions = saved.flatMap((row, y) => row.flatMap((cell, x) => (
      cell.treasure === "red" ? [{ x, y }] : []
    )));
    assert.ok(redPositions.length > 0, `B${depth}F generated red chest`);

    const restored = restoreSavedTreasures(saved, depth, { black_chests_unlocked: true });
    assert.deepEqual(redPositions.map(({ x, y }) => restored[y][x].treasure), redPositions.map(() => "red"));
  });
}

test("opened chests remain absent while other saved treasure kinds keep their existing rules", () => {
  const opened = getRestoredTreasureType({ treasure: null }, { depth: 80, blackChestsUnlocked: true });
  assert.equal(opened, null);
  assert.equal(getRestoredTreasureType({ treasure: "black" }, { depth: 80, blackChestsUnlocked: true }), "black");
  assert.equal(getRestoredTreasureType({ treasure: "gold" }, { depth: 90, blackChestsUnlocked: true }), "gold");
  assert.equal(getRestoredTreasureType({ treasure: "gold", eventTreasureId: "event_chest" }, { depth: 99 }), "gold");
  assert.equal(getRestoredTreasureType({ treasure: "purple", specialRoom: { type: "unused" } }, { depth: 10 }), "purple");
  assert.equal(getRestoredTreasureType({ treasure: "black" }, { depth: 80, blackChestsUnlocked: false }), null);
});
