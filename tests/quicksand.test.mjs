import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import {
  DESERT_QUICKSAND,
  floorHasQuicksand,
  QUICKSAND_COUNT
} from "../data/quicksand.js";

test("desert quicksand is limited to B60F through B68F", () => {
  assert.equal(floorHasQuicksand(59), false);
  assert.equal(floorHasQuicksand(60), true);
  assert.equal(floorHasQuicksand(65), true);
  assert.equal(floorHasQuicksand(68), true);
  assert.equal(floorHasQuicksand(69), false);
});

test("desert floors contain three cyclic quicksand points without feature overlap", () => {
  for (const depth of [60, 65, 68]) {
    buildBoundaryWallMap(depth, Math.random, {});
    const points = cells.flat().filter(cell => cell.quicksand);
    assert.equal(points.length, QUICKSAND_COUNT, `B${depth}F`);
    const keys = new Set(points.map(cell => `${cell.x},${cell.y}`));
    for (const point of points) {
      assert.equal(point.type, "floor");
      assert.equal(point.npc, null);
      assert.equal(point.fountain, null);
      assert.equal(point.treasure, null);
      assert.equal(point.questEvent, null);
      assert.equal(point.quicksand.id, DESERT_QUICKSAND.id);
      assert.ok(keys.has(`${point.quicksand.targetX},${point.quicksand.targetY}`));
      assert.notEqual(`${point.x},${point.y}`, `${point.quicksand.targetX},${point.quicksand.targetY}`);
    }
    const first = points[0];
    const second = cells[first.quicksand.targetY][first.quicksand.targetX];
    const third = cells[second.quicksand.targetY][second.quicksand.targetX];
    assert.deepEqual(
      { x: third.quicksand.targetX, y: third.quicksand.targetY },
      { x: first.x, y: first.y },
      `B${depth}F cycle`
    );
  }
  buildBoundaryWallMap(69, Math.random, {});
  assert.equal(cells.flat().filter(cell => cell.quicksand).length, 0);
});

test("quicksand contact shows its image then uses a short fade transition", async () => {
  const [playerSource, mainSource, rendererSource, minimapSource] = await Promise.all([
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../js/minimap.js", import.meta.url), "utf8")
  ]);
  assert.match(playerSource, /足元の砂が崩れ、流砂へ呑み込まれた！/);
  assert.match(playerSource, /state\.gridX = quicksand\.targetX/);
  assert.match(mainSource, /darkenMs: 650/);
  assert.match(mainSource, /cells\[y\]\[x\]\.quicksand = savedCell\.quicksand \|\| null/);
  assert.match(rendererSource, /NPC_event_15\.avif|DESERT_QUICKSAND\.image/);
  assert.match(minimapSource, /c\.quicksand && isExplored/);
});
