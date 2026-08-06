import test from "node:test";
import assert from "node:assert/strict";

import {
  attemptSpecialRoomUnlock,
  buildBoundaryWallMap,
  cells,
  getSpecialRoomLockInfo,
  setStartPosition
} from "../js/dungeon.js";
import { getSpecialRoomUnlockRate } from "../data/special-rooms.js";

test("each floor creates at most one sealed one-cell special room with an internal black door", () => {
  setStartPosition(0, 0);
  for (const depth of [1, 5, 9, 10, 100]) {
    buildBoundaryWallMap(depth, seeded(depth), {});
    const rooms = cells.flat().filter(cell => cell.specialRoom);
    assert.equal(rooms.length, 1, `B${depth}F special room`);
    const room = rooms[0];
    const blackDoors = Object.entries(room.doorKinds).filter(([, kind]) => kind === "specialLocked");
    assert.equal(blackDoors.length, 1);
    const [doorDirection] = blackDoors[0];
    assert.equal(room.doors[doorDirection], "closed");
    assert.equal(Object.values(room.walls).filter(Boolean).length, 4);
    assert.equal(isDoorFacingOuterBoundary(room, doorDirection), false);
    const reserved = cells.flat().filter(cell => cell.reserved).map(cell => ({ x: cell.x, y: cell.y }));
    assert.equal(countReachableIgnoringDoors(0, 0, reserved), 100 - reserved.length);
  }
});

test("special-room lock gets three attempts with a lower rate after each failure", () => {
  setStartPosition(0, 0);
  buildBoundaryWallMap(1, seeded(31), {});
  const edge = findSpecialDoorEdge();
  const first = getSpecialRoomLockInfo({ ...edge, dex: 10 });
  assert.equal(first.remaining, 3);
  assert.equal(first.rate, 0.3);
  const failedOnce = attemptSpecialRoomUnlock({ ...edge, dex: 10, rng: () => 0.999 });
  assert.equal(failedOnce.unlocked, false);
  assert.equal(failedOnce.remaining, 2);
  assert.equal(failedOnce.rate, 0.195);
  const failedTwice = attemptSpecialRoomUnlock({ ...edge, dex: 10, rng: () => 0.999 });
  assert.equal(failedTwice.remaining, 1);
  assert.equal(failedTwice.rate, 0.105);
  const failedThird = attemptSpecialRoomUnlock({ ...edge, dex: 10, rng: () => 0.999 });
  assert.equal(failedThird.remaining, 0);
  assert.equal(attemptSpecialRoomUnlock({ ...edge, dex: 30, rng: () => 0 }).accepted, false);
});

test("special-room lock supports elite, fixed and guaranteed difficulty modes", () => {
  const retryMultipliers = [1, 0.65, 0.35];
  assert.equal(getSpecialRoomUnlockRate({ mode: "dexCurve", curveId: "elite", retryMultipliers }, 10, 0), 0.05);
  assert.equal(getSpecialRoomUnlockRate({ mode: "dexCurve", curveId: "elite", retryMultipliers }, 20, 0), 0.3);
  assert.equal(getSpecialRoomUnlockRate({ mode: "dexCurve", curveId: "elite", retryMultipliers }, 30, 0), 0.6);
  assert.equal(getSpecialRoomUnlockRate({ mode: "fixedRate", fixedRate: 0.03, retryMultipliers }, 30, 0), 0.03);
  assert.equal(getSpecialRoomUnlockRate({ mode: "alwaysSuccess" }, 0, 2), 1);
  assert.equal(getSpecialRoomUnlockRate({ mode: "alwaysFail" }, 99, 0), 0);
});

test("successful unlocking lasts for the exploration and regeneration locks the room again", () => {
  setStartPosition(0, 0);
  buildBoundaryWallMap(2, seeded(72), {});
  const edge = findSpecialDoorEdge();
  const result = attemptSpecialRoomUnlock({ ...edge, dex: 30, rng: () => 0 });
  assert.equal(result.unlocked, true);
  assert.equal(cells[edge.y][edge.x].doorKinds[edge.dirKey], "specialUnlocked");
  buildBoundaryWallMap(2, seeded(73), {});
  const regenerated = findSpecialDoorEdge();
  assert.equal(cells[regenerated.y][regenerated.x].doorKinds[regenerated.dirKey], "specialLocked");
  assert.equal(getSpecialRoomLockInfo({ ...regenerated, dex: 30 }).remaining, 3);
});

function findSpecialDoorEdge() {
  for (const cell of cells.flat()) {
    for (const [dirKey, kind] of Object.entries(cell.doorKinds)) {
      if (kind === "specialLocked") return { x: cell.x, y: cell.y, dirKey };
    }
  }
  throw new Error("special door not found");
}

function isDoorFacingOuterBoundary(cell, dirKey) {
  return (dirKey === "N" && cell.y === 0)
    || (dirKey === "E" && cell.x === 9)
    || (dirKey === "S" && cell.y === 9)
    || (dirKey === "W" && cell.x === 0);
}

function countReachableIgnoringDoors(startX, startY, blockedCells) {
  const directions = [
    ["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["W", -1, 0]
  ];
  const blocked = new Set(blockedCells.map(cell => `${cell.x},${cell.y}`));
  const queue = [{ x: startX, y: startY }];
  const seen = new Set([`${startX},${startY}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const [dirKey, dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= 10 || y >= 10 || blocked.has(key) || seen.has(key)) continue;
      if (cells[current.y][current.x].walls[dirKey] && !cells[current.y][current.x].doors[dirKey]) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen.size;
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
