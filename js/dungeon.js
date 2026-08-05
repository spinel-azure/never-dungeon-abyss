import {
  MAP_W,
  MAP_H,
  START_X,
  START_Y,
  DIRS,
  DIR_BY_KEY,
  EXTRA_OPENINGS,
  NORMAL_DOOR_COUNT,
  BOSS_DOOR_COUNT,
  LOCKED_DOOR_COUNT
} from "./config.js";
import { getNpcById } from "../data/npcs.js";
import { rollTreasureTrap } from "../data/traps.js";
import { floorHasHealingFountain } from "../data/fountains.js";

export const cells = makeCells(MAP_W, MAP_H);
export const explored = makeExplored(MAP_W, MAP_H);
let startPosition = { x: START_X, y: START_Y };

export function getStartPosition() {
  return { ...startPosition };
}

export function setStartPosition(x, y) {
  if (!inBounds(x, y)) return false;
  startPosition = { x, y };
  return true;
}

export function randomizeStartPosition() {
  startPosition = {
    x: Math.floor(Math.random() * MAP_W),
    y: Math.floor(Math.random() * MAP_H)
  };
  return getStartPosition();
}

export function makeCells(w, h) {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => ({
      x,
      y,
      type: "floor",
      npc: null,
      fountain: null,
      treasure: null,
      treasureTrapId: null,
      treasureDiscovered: false,
      eventTreasureId: null,
      bossId: null,
      reserved: null,
      portal: null,
      walls: { N: true, E: true, S: true, W: true },
      doors: { N: null, E: null, S: null, W: null },
      doorKinds: { N: null, E: null, S: null, W: null }
    }))
  );
}

export function makeExplored(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => false));
}

export function markExplored(x, y) {
  if (inBounds(x, y)) explored[y][x] = true;
}

export function resetExplored() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) explored[y][x] = false;
  }
}

export function buildBoundaryWallMap(depth = 1, rng = Math.random, progress = {}) {
  const { x: startX, y: startY } = startPosition;
  resetAllWalls();
  carvePerfectMaze();
  addLoopOpenings(EXTRA_OPENINGS);
  if (countReachableCells(startX, startY) !== MAP_W * MAP_H) {
    resetAllWalls();
    carvePerfectMaze();
    addLoopOpenings(EXTRA_OPENINGS);
  }
  placeStairs(depth);
  if (Math.floor(Number(depth) || 1) === 9) placeB9BossRoom(rng, progress);
  placeNpc(depth);
  placeTreasures(depth, rng);
  placeFountain(depth, rng);
  if (Math.floor(Number(depth) || 1) === 9) placeB9KeyTreasure(rng, progress);
  placeNormalDoors(NORMAL_DOOR_COUNT, false);
}

export function resetAllWalls() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      cells[y][x].type = "floor";
      cells[y][x].npc = null;
      cells[y][x].fountain = null;
      cells[y][x].treasure = null;
      cells[y][x].treasureTrapId = null;
      cells[y][x].treasureDiscovered = false;
      cells[y][x].eventTreasureId = null;
      cells[y][x].bossId = null;
      cells[y][x].reserved = null;
      cells[y][x].portal = null;
      cells[y][x].walls = { N: true, E: true, S: true, W: true };
      cells[y][x].doors = { N: null, E: null, S: null, W: null };
      cells[y][x].doorKinds = { N: null, E: null, S: null, W: null };
    }
  }
}

export function placeStairs(depth = 1) {
  const { x: startX, y: startY } = startPosition;
  resetCellTypes();
  cells[startY][startX].type = "stairsUp";
  cells[startY][startX].portal = Math.floor(Number(depth) || 1) === 10 ? "transfer_b10f" : null;
  const stairsDown = findFarthestReachableCell(7);
  if (stairsDown) cells[stairsDown.y][stairsDown.x].type = "stairsDown";
}

export function placeNpc(depth = 1) {
  const { x: startX, y: startY } = startPosition;
  resetNpcs();
  const distances = makeDistanceMap(startX, startY);
  const reserved = cells.flat().filter(cell => cell.reserved).map(cell => ({ x: cell.x, y: cell.y }));
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === startX && y === startY) continue;
      if (cells[y][x].type !== "floor" || cells[y][x].reserved) continue;
      if (distances[y][x] < 4) continue;
      // NPCs currently behave as impassable cells. Reject placements that
      // would disconnect any other cell from the dungeon entrance.
      const blocked = [...reserved, { x, y }];
      if (countReachableCells(startX, startY, blocked) !== MAP_W * MAP_H - blocked.length) continue;
      candidates.push({ x, y, distance: distances[y][x] });
    }
  }

  const selected = shuffled(candidates)[0];
  if (selected) {
    const normalizedDepth = Math.floor(Number(depth) || 1);
    cells[selected.y][selected.x].npc = normalizedDepth === 5
      ? "NPC_01_b5"
      : normalizedDepth === 9
        ? "NPC_01_b9"
        : "NPC_01";
  }
}

export function getCellType(x, y) {
  if (!inBounds(x, y)) return "wall";
  return cells[y][x].type;
}

export function getNpcAt(x, y) {
  if (!inBounds(x, y)) return null;
  return getNpcById(cells[y][x].npc);
}

export function removeNpcAt(x, y) {
  if (!inBounds(x, y) || !cells[y][x].npc) return false;
  cells[y][x].npc = null;
  return true;
}

export function getFountainAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].fountain || null;
}

export function getBossAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].bossId || null;
}

export function removeBossAt(x, y) {
  if (!inBounds(x, y) || !cells[y][x].bossId) return false;
  cells[y][x].bossId = null;
  return true;
}

export function removeFountainAt(x, y) {
  if (!inBounds(x, y) || !cells[y][x].fountain) return false;
  cells[y][x].fountain = null;
  return true;
}

export function getTreasureAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].treasure;
}

export function getTreasureTrapAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].treasureTrapId || null;
}

export function getTreasureEventAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].eventTreasureId || null;
}

export function removeTreasureAt(x, y) {
  if (!inBounds(x, y) || !cells[y][x].treasure) return false;
  cells[y][x].treasure = null;
  cells[y][x].treasureTrapId = null;
  cells[y][x].eventTreasureId = null;
  return true;
}

export function discoverTreasureAt(x, y) {
  if (!inBounds(x, y) || !cells[y][x].treasure) return false;
  cells[y][x].treasureDiscovered = true;
  return true;
}

export function placeTreasures(depth = 1, rng = Math.random) {
  resetTreasures();
  if (Math.floor(Number(depth) || 1) > 4) return;
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const blocked = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (cells[y][x].npc) blocked.push({ x, y });
    }
  }

  const count = 1 + Math.floor(Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * 3);
  for (let placed = 0; placed < count; placed += 1) {
    const type = "red";
    const candidates = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (x === startX && y === startY) continue;
        if (cells[y][x].type !== "floor" || cells[y][x].reserved || cells[y][x].npc || cells[y][x].treasure) continue;
        if (distances[y][x] < 3) continue;
        const nextBlocked = [...blocked, { x, y }];
        if (countReachableCells(startX, startY, nextBlocked) !== MAP_W * MAP_H - nextBlocked.length) continue;
        candidates.push({ x, y });
      }
    }
    const selected = shuffled(candidates, rng)[0];
    if (!selected) continue;
    cells[selected.y][selected.x].treasure = type;
    cells[selected.y][selected.x].treasureTrapId = rollTreasureTrap(type);
    blocked.push(selected);
  }
}

export function findFarthestReachableCell(minDistance = 7) {
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  let farthest = null;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const distance = distances[y][x];
      if (distance < minDistance) continue;
      if (x === startX && y === startY) continue;
      if (!farthest || distance > farthest.distance) {
        farthest = { x, y, distance };
      }
    }
  }
  return farthest;
}

export function resetCellTypes() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) cells[y][x].type = "floor";
  }
}

export function resetNpcs() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) cells[y][x].npc = null;
  }
}

export function resetTreasures() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      cells[y][x].treasure = null;
      cells[y][x].treasureTrapId = null;
      cells[y][x].treasureDiscovered = false;
      cells[y][x].eventTreasureId = null;
    }
  }
}

export function placeFountain(depth = 1, rng = Math.random) {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) cells[y][x].fountain = null;
  }
  if (!floorHasHealingFountain(depth)) return null;
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const blocked = cells.flat().filter(cell => cell.npc || cell.reserved).map(cell => ({ x: cell.x, y: cell.y }));
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const cell = cells[y][x];
      if (cell.type !== "floor" || cell.reserved || cell.npc || cell.treasure || cell.fountain) continue;
      if (distances[y][x] < 3) continue;
      const nextBlocked = [...blocked, { x, y }];
      if (countReachableCells(startX, startY, nextBlocked) !== MAP_W * MAP_H - nextBlocked.length) continue;
      candidates.push({ x, y });
    }
  }
  const selected = shuffled(candidates, rng)[0];
  if (!selected) return null;
  cells[selected.y][selected.x].fountain = "healing_fountain";
  return selected;
}

export function placeNormalDoors(count = NORMAL_DOOR_COUNT, reset = true) {
  const { x: startX, y: startY } = startPosition;
  if (reset) resetDoors();
  const distances = makeDistanceMap(startX, startY);
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      for (const dir of [DIR_BY_KEY.E, DIR_BY_KEY.S]) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (!inBounds(nx, ny)) continue;
        if (cells[y][x].walls[dir.key]) continue;
        if (isStairCell(x, y) || isStairCell(nx, ny)) continue;
        if (cells[y][x].reserved || cells[ny][nx].reserved) continue;
        if (cells[y][x].npc || cells[ny][nx].npc) continue;
        if (distances[y][x] < 3 || distances[ny][nx] < 3) continue;
        candidates.push({ x, y, dir: dir.key });
      }
    }
  }

  const selected = shuffled(candidates).slice(0, count);
  selected.forEach(door => {
    const kind = "normal";
    setWall(door.x, door.y, door.dir, true);
    setDoor(door.x, door.y, door.dir, "closed", kind);
  });
}

export function placeB9BossRoom(rng = Math.random, progress = {}) {
  const { x: startX, y: startY } = startPosition;
  const candidates = [];
  for (let y = 1; y < MAP_H - 1; y += 1) {
    for (let x = 1; x < MAP_W - 1; x += 1) {
      for (const dir of DIRS) {
        const approach = { x: x - dir.dx, y: y - dir.dy };
        const room = [0, 1, 2].map(offset => ({ x: x + dir.dx * offset, y: y + dir.dy * offset }));
        if (![approach, ...room].every(cell => inBounds(cell.x, cell.y))) continue;
        if (room.some(cell => cell.x === startX && cell.y === startY)) continue;
        candidates.push({ approach, room, dir });
      }
    }
  }
  for (const candidate of shuffled(candidates, rng)) {
    const snapshot = structuredClone(cells);
    const blocked = candidate.room.map(({ x, y }) => ({ x, y }));
    for (const cell of candidate.room) for (const dir of DIRS) setWall(cell.x, cell.y, dir.key, true);
    setWall(candidate.room[0].x, candidate.room[0].y, candidate.dir.key, false);
    setWall(candidate.room[1].x, candidate.room[1].y, candidate.dir.key, false);
    connectCellsAroundBlockedArea(startX, startY, blocked, rng);
    if (countReachableCells(startX, startY, blocked) !== MAP_W * MAP_H - blocked.length) {
      restoreCells(snapshot);
      continue;
    }
    const doorUnlocked = Boolean(progress.redDoorUnlocked || progress.bossDefeated);
    for (const cell of cells.flat()) {
      if (cell.type === "stairsDown") cell.type = "floor";
    }
    setWall(candidate.approach.x, candidate.approach.y, candidate.dir.key, true);
    setDoor(candidate.approach.x, candidate.approach.y, candidate.dir.key, "closed", doorUnlocked ? "bossUnlocked" : "boss");
    const [blank, boss, stairs] = candidate.room.map(cell => cells[cell.y][cell.x]);
    blank.reserved = "bossRoom";
    boss.reserved = "bossRoom";
    stairs.reserved = "bossRoom";
    boss.bossId = progress.bossDefeated ? null : "strange_knight_statue_b9f";
    stairs.type = "stairsDown";
    for (const target of [blank, boss, stairs]) {
      target.npc = null; target.fountain = null; target.treasure = null; target.eventTreasureId = null;
    }
    return { approach: candidate.approach, blank, boss, stairs, doorDirection: candidate.dir.key };
  }
  return null;
}

export function placeB9KeyTreasure(rng = Math.random, progress = {}) {
  if (progress.redDoorUnlocked || progress.bossDefeated || progress.hasRedKey) return null;
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const candidates = cells.flat().filter(cell =>
    cell.type === "floor" && !cell.reserved && !cell.npc && !cell.fountain && !cell.treasure
      && distances[cell.y][cell.x] >= 3
  );
  const selected = shuffled(candidates, rng)[0];
  if (!selected) return null;
  selected.treasure = "gold";
  let trapRoll = 0;
  selected.treasureTrapId = rollTreasureTrap("gold", () => trapRoll++ === 0 ? 0 : rng());
  selected.eventTreasureId = "red_rust_key_b9f_chest";
  return { x: selected.x, y: selected.y };
}

function restoreCells(snapshot) {
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) Object.assign(cells[y][x], snapshot[y][x]);
  }
}

function connectCellsAroundBlockedArea(startX, startY, blockedCells, rng = Math.random) {
  const blocked = new Set(blockedCells.map(cell => `${cell.x},${cell.y}`));
  const targetCount = MAP_W * MAP_H - blocked.size;
  for (let attempt = 0; attempt < MAP_W * MAP_H && countReachableCells(startX, startY, blockedCells) < targetCount; attempt += 1) {
    const reachable = reachableCellKeys(startX, startY, blocked);
    const bridges = [];
    for (const key of reachable) {
      const [x, y] = key.split(",").map(Number);
      for (const dir of DIRS) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        const nextKey = `${nx},${ny}`;
        if (!inBounds(nx, ny) || blocked.has(nextKey) || reachable.has(nextKey)) continue;
        bridges.push({ x, y, dir: dir.key });
      }
    }
    const bridge = shuffled(bridges, rng)[0];
    if (!bridge) break;
    setWall(bridge.x, bridge.y, bridge.dir, false);
  }
}

function reachableCellKeys(startX, startY, blocked) {
  const startKey = `${startX},${startY}`;
  if (blocked.has(startKey)) return new Set();
  const queue = [{ x: startX, y: startY }];
  const seen = new Set([startKey]);
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    for (const dir of DIRS) {
      const x = current.x + dir.dx;
      const y = current.y + dir.dy;
      const key = `${x},${y}`;
      if (!inBounds(x, y) || blocked.has(key) || seen.has(key) || wallOnCell(current.x, current.y, dir.key)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

export function resetDoors() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      cells[y][x].doors = { N: null, E: null, S: null, W: null };
      cells[y][x].doorKinds = { N: null, E: null, S: null, W: null };
    }
  }
}

export function isStairCell(x, y) {
  return inBounds(x, y) && (cells[y][x].type === "stairsUp" || cells[y][x].type === "stairsDown");
}

export function makeDistanceMap(startX, startY) {
  const distances = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => -1));
  const queue = [{ x: startX, y: startY }];
  distances[startY][startX] = 0;

  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const currentDistance = distances[cur.y][cur.x];
    for (const dir of DIRS) {
      const nx = cur.x + dir.dx;
      const ny = cur.y + dir.dy;
      if (!inBounds(nx, ny)) continue;
      if (wallOnCell(cur.x, cur.y, dir.key)) continue;
      if (distances[ny][nx] >= 0) continue;
      distances[ny][nx] = currentDistance + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return distances;
}

export function carvePerfectMaze() {
  const { x: startX, y: startY } = startPosition;
  const visited = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => false));
  const stack = [{ x: startX, y: startY }];
  visited[startY][startX] = true;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const choices = shuffled(DIRS).filter(dir => {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      return inBounds(nx, ny) && !visited[ny][nx];
    });

    if (!choices.length) {
      stack.pop();
      continue;
    }

    const dir = choices[0];
    const nx = current.x + dir.dx;
    const ny = current.y + dir.dy;
    setWall(current.x, current.y, dir.key, false);
    visited[ny][nx] = true;
    stack.push({ x: nx, y: ny });
  }
}

export function addLoopOpenings(count) {
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      for (const dir of [DIR_BY_KEY.E, DIR_BY_KEY.S]) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (inBounds(nx, ny) && wallOnCell(x, y, dir.key)) {
          candidates.push({ x, y, dir: dir.key });
        }
      }
    }
  }

  shuffled(candidates).slice(0, count).forEach(opening => {
    setWall(opening.x, opening.y, opening.dir, false);
  });
}

export function countReachableCells(startX, startY, blockedCells = null) {
  const blockedList = Array.isArray(blockedCells) ? blockedCells : blockedCells ? [blockedCells] : [];
  const blocked = new Set(blockedList.map(cell => `${cell.x},${cell.y}`));
  if (blocked.has(`${startX},${startY}`)) return 0;
  const queue = [{ x: startX, y: startY }];
  const seen = new Set([`${startX},${startY}`]);
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const dir of DIRS) {
      const nx = cur.x + dir.dx;
      const ny = cur.y + dir.dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny)) continue;
      if (blocked.has(key)) continue;
      if (wallOnCell(cur.x, cur.y, dir.key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen.size;
}

export function shuffled(items, rng = Math.random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function chooseStartDirection() {
  const { x: startX, y: startY } = startPosition;
  for (const key of ["S", "E", "N", "W"]) {
    const dirIndex = DIRS.findIndex(dir => dir.key === key);
    if (dirIndex >= 0 && !wallOnCell(startX, startY, key)) return dirIndex;
  }
  return 2;
}

export function setWall(x, y, dirKey, value) {
  if (!inBounds(x, y)) return;
  const dir = DIR_BY_KEY[dirKey];
  cells[y][x].walls[dirKey] = value;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (inBounds(nx, ny)) cells[ny][nx].walls[dir.opposite] = value;
}

export function setDoor(x, y, dirKey, value, kind = null) {
  if (!inBounds(x, y)) return;
  const dir = DIR_BY_KEY[dirKey];
  cells[y][x].doors[dirKey] = value;
  if (kind) cells[y][x].doorKinds[dirKey] = kind;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (inBounds(nx, ny)) {
    cells[ny][nx].doors[dir.opposite] = value;
    if (kind) cells[ny][nx].doorKinds[dir.opposite] = kind;
  }
}

export function getDoorState(x, y, dirKey) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].doors[dirKey];
}

export function getDoorKind(x, y, dirKey) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].doorKinds[dirKey];
}

export function closedDoorOnCell(x, y, dirKey) {
  return getDoorState(x, y, dirKey) === "closed";
}

export function lockedDoorOnCell(x, y, dirKey) {
  return getDoorKind(x, y, dirKey) === "locked" && closedDoorOnCell(x, y, dirKey);
}

export function openDoorOnCell(x, y, dirKey) {
  return getDoorState(x, y, dirKey) === "open";
}

export function openDoor(x, y, dirKey) {
  if (closedDoorOnCell(x, y, dirKey)) setDoor(x, y, dirKey, "open");
}

export function closeDoor(x, y, dirKey) {
  if (openDoorOnCell(x, y, dirKey)) setDoor(x, y, dirKey, "closed");
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}

export function wallOnCell(x, y, dirKey) {
  if (!inBounds(x, y)) return true;
  const doorState = getDoorState(x, y, dirKey);
  if (doorState === "open") return false;
  if (doorState === "closed" || doorState === "locked") return true;
  return cells[y][x].walls[dirKey];
}
