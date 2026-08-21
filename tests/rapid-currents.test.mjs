import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
  buildBoundaryWallMap,
  cells,
  getStartPosition,
  placeRapidCurrents,
  validateRapidCurrentReachability
} from "../js/dungeon.js";
import {
  floorHasRapidCurrents,
  getRapidCurrentForcedPath,
  getRapidCurrentTargetCount,
  RAPID_CURRENT,
  RAPID_CURRENT_DIRECTIONS
} from "../data/rapid-currents.js";

const sequence = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test("rapid currents are generated only on B70F through B78F", () => {
  for (const depth of [1, 69, 79, 80]) assert.equal(floorHasRapidCurrents(depth), false);
  for (let depth = 70; depth <= 78; depth += 1) assert.equal(floorHasRapidCurrents(depth), true);
  assert.deepEqual([getRapidCurrentTargetCount(70), getRapidCurrentTargetCount(72), getRapidCurrentTargetCount(77), getRapidCurrentTargetCount(79)], [2, 3, 4, 0]);
  for (const depth of [69, 79]) {
    buildBoundaryWallMap(depth, sequence(0.1, 0.7, 0.3), {});
    assert.equal(cells.flat().some(cell => cell.rapidCurrent), false);
  }
});

test("generated rapid currents are straight, separated, safe, and end on normal shores", () => {
  for (const depth of [70, 74, 78]) {
    buildBoundaryWallMap(depth, sequence(0.13, 0.71, 0.39, 0.92), {});
    const streams = Map.groupBy(cells.flat().filter(cell => cell.rapidCurrent), cell => cell.rapidCurrent.streamId);
    assert.ok(streams.size <= getRapidCurrentTargetCount(depth));
    assert.equal(validateRapidCurrentReachability(), true);
    const occupiedByStream = new Map();
    for (const [streamId, streamCells] of streams) {
      assert.ok(streamCells.length >= 2 && streamCells.length <= 4);
      const direction = RAPID_CURRENT_DIRECTIONS[streamCells[0].rapidCurrent.direction];
      const sorted = streamCells.toSorted((a, b) => a.rapidCurrent.segmentIndex - b.rapidCurrent.segmentIndex);
      sorted.forEach((cell, index) => {
        assert.equal(cell.rapidCurrent.segmentIndex, index);
        assert.equal(cell.rapidCurrent.segmentCount, sorted.length);
        if (index > 0) {
          assert.deepEqual({ x: cell.x, y: cell.y }, { x: sorted[index - 1].x + direction.dx, y: sorted[index - 1].y + direction.dy });
        }
      });
      const shore = cells[sorted[0].rapidCurrent.shoreY][sorted[0].rapidCurrent.shoreX];
      assert.equal(shore.type, "floor");
      assert.equal(shore.rapidCurrent, null);
      occupiedByStream.set(streamId, sorted);
    }
    const entries = [...occupiedByStream.entries()];
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        for (const a of entries[left][1]) for (const b of entries[right][1]) {
          assert.ok(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 1);
        }
      }
    }
  }
});

test("rapid-current placement is reproducible on the same completed map and RNG sequence", () => {
  buildBoundaryWallMap(75, sequence(0.2, 0.8, 0.4, 0.6), {});
  const rngValues = [0.11, 0.83, 0.27, 0.69, 0.45];
  placeRapidCurrents(75, sequence(...rngValues));
  const first = cells.flat().filter(cell => cell.rapidCurrent).map(cell => [cell.x, cell.y, cell.rapidCurrent.direction, cell.rapidCurrent.streamId]);
  placeRapidCurrents(75, sequence(...rngValues));
  const second = cells.flat().filter(cell => cell.rapidCurrent).map(cell => [cell.x, cell.y, cell.rapidCurrent.direction, cell.rapidCurrent.streamId]);
  assert.deepEqual(second, first);
});

test("forced-current paths move one cell at a time and finish at the saved shore", () => {
  const rapidCurrent = { direction: "E", segmentIndex: 0, segmentCount: 3, shoreX: 8, shoreY: 4 };
  assert.deepEqual(getRapidCurrentForcedPath({ x: 5, y: 4, rapidCurrent }), [
    { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 8, y: 4 }
  ]);
  assert.deepEqual(getRapidCurrentForcedPath({ x: 7, y: 4, rapidCurrent: { ...rapidCurrent, segmentIndex: 2 } }), [{ x: 8, y: 4 }]);
});

test("rapid-current presentation uses the supplied image and MP3 files", async () => {
  await access(new URL(`../${RAPID_CURRENT.image}`, import.meta.url));
  await access(new URL("../se/minamo.mp3", import.meta.url));
  await access(new URL("../se/suiryuu.mp3", import.meta.url));
  const [playerSource, mainSource, minimapSource, rendererSource] = await Promise.all([
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/minimap.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);
  assert.match(playerSource, /rapidCurrentTransitionActive/);
  assert.match(playerSource, /finally\s*\{[\s\S]{0,180}finishRapidCurrentTransition/);
  assert.match(mainSource, /if \(state\.rapidCurrentTransitionActive\) return false/);
  assert.match(minimapSource, /rapidCurrentDiscovered/);
  assert.match(rendererSource, /drawRapidCurrentMotion/);
});
