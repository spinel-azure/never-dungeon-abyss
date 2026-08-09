import test from "node:test";
import assert from "node:assert/strict";

import {
  attemptSpecialRoomUnlock,
  buildBoundaryWallMap,
  cells,
  getSpecialRoomLockInfo,
  setStartPosition
} from "../js/dungeon.js";
import {
  getQuestRequiredSpecialRoomAccess,
  getSpecialRoomAccessRestriction,
  getSpecialRoomDefinition,
  getSpecialRoomUnlockRate
} from "../data/special-rooms.js";
import { shouldDrawSpecialRoomMarker } from "../js/minimap.js";

test("B2 special room contains the repeatable lingering ghost event boss", () => {
  assert.deepEqual(getSpecialRoomDefinition(2).content, {
    type: "repeatableBoss",
    bossId: "lingering_ghost_b2f",
    minimapMarker: "E",
    revealBeforeExploration: true
  });
  assert.equal(getSpecialRoomDefinition(1).content, null);
});

test("The lingering ghost event marker is visible before exploration except at zero torch", () => {
  const room = getSpecialRoomDefinition(2);
  assert.equal(shouldDrawSpecialRoomMarker(room, false, 100), true);
  assert.equal(shouldDrawSpecialRoomMarker(room, false, 1), true);
  assert.equal(shouldDrawSpecialRoomMarker(room, false, 0), false);
  assert.equal(shouldDrawSpecialRoomMarker(getSpecialRoomDefinition(1), true, 100), false);
});

test("B6 special room is the quest-gated one-time mimic event", () => {
  assert.deepEqual(getSpecialRoomDefinition(6).content, {
    type: "eventBoss",
    bossId: "quest_mimic_b6f",
    minimapMarker: "E",
    revealBeforeExploration: true,
    requiredQuestId: "guild_006"
  });
});

test("B6 special room blocks unaccepted or completed quest states and admits an active quest", () => {
  const room = getSpecialRoomDefinition(6);
  assert.deepEqual(getQuestRequiredSpecialRoomAccess(room, { active: false, completed: false }), {
    blocked: true,
    reason: "questRequired",
    message: "今はこの扉は開かないようだ。"
  });
  assert.deepEqual(getQuestRequiredSpecialRoomAccess(room, { active: true, completed: false }), {
    blocked: false,
    reason: "",
    message: ""
  });
  assert.equal(getQuestRequiredSpecialRoomAccess(room, { active: false, completed: true }).blocked, true);
  assert.equal(getQuestRequiredSpecialRoomAccess(getSpecialRoomDefinition(2), {}).blocked, false);
  assert.equal(getQuestRequiredSpecialRoomAccess(getSpecialRoomDefinition(4), {}).blocked, false);
});

test("B6 quest room unlocks and retains the mimic event content", () => {
  setStartPosition(0, 0);
  buildBoundaryWallMap(6, seeded(76), {});
  const edge = findSpecialDoorEdge();
  const result = attemptSpecialRoomUnlock({ ...edge, dex: 30, rng: () => 0 });
  assert.equal(result.accepted, true);
  assert.equal(result.unlocked, true);
  assert.equal(cells[edge.y][edge.x].doorKinds[edge.dirKey], "specialUnlocked");
  assert.equal(cells.flat().find(cell => cell.specialRoom)?.specialRoom?.content?.bossId, "quest_mimic_b6f");
});

test("B4 special room warns before entering the one-time superboss event", () => {
  const room = getSpecialRoomDefinition(4);
  assert.equal(room.dangerWarning, true);
  assert.deepEqual(room.content, {
    type: "eventBoss",
    bossId: "otherworldly_wisdom_b4f",
    minimapMarker: "E",
    revealBeforeExploration: true
  });
  assert.equal(shouldDrawSpecialRoomMarker(room, false, 100), true);
});

test("forced encounters block special-room unlocking without exposing a rate", () => {
  assert.deepEqual(getSpecialRoomAccessRestriction({ forcedEnemyId: "cave_slime" }), {
    blocked: true,
    reason: "forcedEncounter",
    message: "今はこの扉を開けられないようだ。"
  });
  assert.deepEqual(getSpecialRoomAccessRestriction({ forcedEnemyId: null }), {
    blocked: false,
    reason: "",
    message: ""
  });
});

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
  assert.equal(first.rate, 0.65);
  const failedOnce = attemptSpecialRoomUnlock({ ...edge, dex: 10, rng: () => 0.999 });
  assert.equal(failedOnce.unlocked, false);
  assert.equal(failedOnce.remaining, 2);
  assert.equal(failedOnce.rate, 0.52);
  const failedTwice = attemptSpecialRoomUnlock({ ...edge, dex: 10, rng: () => 0.999 });
  assert.equal(failedTwice.remaining, 1);
  assert.equal(failedTwice.rate, 0.39);
  const failedThird = attemptSpecialRoomUnlock({ ...edge, dex: 10, rng: () => 0.999 });
  assert.equal(failedThird.remaining, 0);
  assert.equal(attemptSpecialRoomUnlock({ ...edge, dex: 30, rng: () => 0 }).accepted, false);
});

test("standard black doors remain accessible to low-DEX jobs", () => {
  const room = getSpecialRoomDefinition(2);
  assert.equal(getSpecialRoomUnlockRate(room.lock, 0, 0), 0.25);
  assert.equal(getSpecialRoomUnlockRate(room.lock, 5, 0), 0.45);
  assert.ok(Math.abs(getSpecialRoomUnlockRate(room.lock, 9, 0) - 0.61) < 1e-9);
  assert.equal(getSpecialRoomUnlockRate(room.lock, 10, 0), 0.65);
  assert.equal(getSpecialRoomUnlockRate(room.lock, 30, 0), 1);
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
