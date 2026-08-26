import test from "node:test";
import assert from "node:assert/strict";
import { buildBoundaryWallMap, cells, getStartPosition, validateDungeonLayout } from "../js/dungeon.js";
import { getBossById, getFloorBossByDepth } from "../data/bosses.js";

test("B100F is a terminal floor with its upward transfer portal and first final boss", () => {
  buildBoundaryWallMap(100, () => 0.5, {});
  const flat = cells.flat();
  assert.equal(flat.filter(cell => cell.type === "stairsUp").length, 1);
  assert.equal(flat.filter(cell => cell.type === "stairsDown").length, 0);
  const start = getStartPosition();
  assert.equal(cells[start.y][start.x].portal, "transfer_b100f");
  assert.equal(cells.flat().filter(cell => cell.bossId === "erzdaemonin_b100f").length, 1);
  assert.equal(validateDungeonLayout({ depth: 100 }).valid, true);
});

test("B100F changes to Amayenak after Erzdaemonin is defeated", () => {
  const progress = { bossDefeatedById: { erzdaemonin_b100f: true } };
  buildBoundaryWallMap(100, () => 0.5, progress);
  assert.equal(cells.flat().filter(cell => cell.bossId === "amayenak_b100f").length, 1);
  assert.equal(cells.flat().filter(cell => cell.type === "stairsDown").length, 0);
  assert.equal(validateDungeonLayout({ depth: 100, progress }).valid, true);
});

test("B100F boss definitions form the final two-stage battle", () => {
  const first = getFloorBossByDepth(100);
  const final = getBossById(first.nextBossId);
  assert.equal(first.id, "erzdaemonin_b100f");
  assert.equal(first.image, "images/bosses/boss_18.avif");
  assert.equal(final.id, "amayenak_b100f");
  assert.equal(final.image, "images/bosses/boss_19.avif");
  assert.equal(final.bossKind, "finalPhase");
});

test("floors before B100F retain one downward staircase", () => {
  buildBoundaryWallMap(99, () => 0.5, {});
  assert.equal(cells.flat().filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(validateDungeonLayout({ depth: 99 }).valid, true);
});
