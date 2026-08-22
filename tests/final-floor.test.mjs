import test from "node:test";
import assert from "node:assert/strict";
import { buildBoundaryWallMap, cells, getStartPosition, validateDungeonLayout } from "../js/dungeon.js";

test("B100F is a terminal floor with only its upward stairs and transfer portal", () => {
  buildBoundaryWallMap(100, () => 0.5, {});
  const flat = cells.flat();
  assert.equal(flat.filter(cell => cell.type === "stairsUp").length, 1);
  assert.equal(flat.filter(cell => cell.type === "stairsDown").length, 0);
  const start = getStartPosition();
  assert.equal(cells[start.y][start.x].portal, "transfer_b100f");
  assert.equal(validateDungeonLayout({ depth: 100 }).valid, true);
});

test("floors before B100F retain one downward staircase", () => {
  buildBoundaryWallMap(99, () => 0.5, {});
  assert.equal(cells.flat().filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(validateDungeonLayout({ depth: 99 }).valid, true);
});
