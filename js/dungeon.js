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
import {
  DESERT_OASIS,
  DESERT_OASIS_MIRAGE,
  floorHasHealingFountain,
  HEALING_FOUNTAIN,
  isDesertOasisFloor
} from "../data/fountains.js";
import { getSpecialRoomDefinition, getSpecialRoomUnlockRate, rollMaikaeferNestContent } from "../data/special-rooms.js";
import { getFloorBossByDepth } from "../data/bosses.js";
import { getQuestEventForDepth } from "../data/quest-events.js";
import { DESERT_QUICKSAND, floorHasQuicksand, QUICKSAND_COUNT } from "../data/quicksand.js";
import { floorHasRapidCurrents, getRapidCurrentTargetCount, RAPID_CURRENT, RAPID_CURRENT_DIRECTIONS } from "../data/rapid-currents.js";
import { hasPurpleChestLootTable } from "../data/loot.js";
import {
  DUNGEON_FEATURE_PRIORITIES,
  getTraversalBlockingReservations,
  isDungeonFeatureOccupied,
  reserveDungeonFeature,
  runDungeonPlacementTransaction
} from "./dungeon-feature-placement.js";

export const cells = makeCells(MAP_W, MAP_H);
export const explored = makeExplored(MAP_W, MAP_H);
let startPosition = { x: START_X, y: START_Y };
let lastDungeonBuildReport = null;
const MAX_DUNGEON_BUILD_ATTEMPTS = 8;

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
      quicksand: null,
      rapidCurrent: null,
      rapidCurrentDiscovered: false,
      treasure: null,
      treasureTrapId: null,
      treasureDiscovered: false,
      eventTreasureId: null,
      bossId: null,
      bossRemainsId: null,
      reserved: null,
      featureReservation: null,
      featureApproach: null,
      portal: null,
      specialRoom: null,
      questEvent: null,
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
  let lastReport = null;
  for (let attempt = 1; attempt <= MAX_DUNGEON_BUILD_ATTEMPTS; attempt += 1) {
    buildBoundaryWallMapAttempt(depth, rng, progress);
    lastReport = validateDungeonLayout({ depth, progress });
    lastReport.attempt = attempt;
    if (lastReport.valid) {
      lastDungeonBuildReport = structuredClone(lastReport);
      return lastReport;
    }
  }
  lastDungeonBuildReport = structuredClone(lastReport);
  throw new Error(`Dungeon generation failed validation: ${lastReport?.errors?.join(" / ") || "unknown error"}`);
}

function buildBoundaryWallMapAttempt(depth = 1, rng = Math.random, progress = {}) {
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
  const floorBoss = getFloorBossByDepth(depth);
  if (floorBoss) placeFloorBossRoom(floorBoss, rng, progress);
  placeSpecialRoom(depth, rng, progress);
  placeQuestEvent(depth, rng, progress);
  placeNpc(depth, progress);
  placeTreasures(depth, rng, progress);
  placePurpleSpecialRoomTreasure(depth, rng);
  placeFountain(depth, rng);
  placeQuicksands(depth, rng);
  if (floorBoss?.room?.requiresKey) placeFloorBossKeyTreasure(floorBoss, rng, progress);
  placeForestVines(depth, rng, progress);
  placeNormalDoors(NORMAL_DOOR_COUNT, false);
  placeRapidCurrents(depth, rng);
  placeFloorLootPickups(depth, rng);
}

export function placeFloorLootPickups(depth = 1, rng = Math.random) {
  if (Math.floor(Number(depth) || 0) !== 1) return [];
  const count = 1 + Math.floor(Math.max(0, Math.min(0.999999999999, Number(rng()) || 0)) * 3);
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const candidates = shuffled(cells.flat().filter(cell =>
    cell.type === "floor" && !isDungeonFeatureOccupied(cell) && !cell.npc && !cell.fountain
      && !cell.treasure && !cell.questEvent && distances[cell.y][cell.x] >= 2
  ), rng);
  const placed = [];
  for (const cell of candidates) {
    if (placed.length >= count) break;
    const index = placed.length + 1;
    const event = Object.freeze({
      id: `stone_pickup_b1f_${index}`,
      type: "lootPickup",
      itemId: "stone",
      amount: 1
    });
    const reservation = reserveDungeonFeature(cells, {
      featureId: event.id, type: "lootPickup", footprint: [cell],
      priority: DUNGEON_FEATURE_PRIORITIES.questEvent, blocksTraversal: false
    });
    if (!reservation.accepted) continue;
    cell.reserved = null;
    cell.questEvent = event;
    placed.push({ x: cell.x, y: cell.y, event: structuredClone(event) });
  }
  return placed;
}

export function placeForestVines(depth = 1, rng = Math.random, progress = {}) {
  const floor = Math.floor(Number(depth) || 1);
  if (floor < 50 || floor > 58 || progress.eventFlags?.boss_fleischfresser_b59f_defeated) return [];
  const candidates = cells.flat().filter(cell => (
    cell.type === "floor"
    && !(cell.x === startPosition.x && cell.y === startPosition.y)
    && !isDungeonFeatureOccupied(cell)
    && !cell.npc && !cell.fountain && !cell.treasure && !cell.questEvent
  ));
  const placed = shuffled(candidates, rng).slice(0, 5);
  for (const cell of placed) cell.bossId = "giant_vine_obstacle";
  return placed.map(cell => ({ x: cell.x, y: cell.y }));
}

export function getLastDungeonBuildReport() {
  return lastDungeonBuildReport ? structuredClone(lastDungeonBuildReport) : null;
}

export function validateDungeonLayout({ depth = 1, progress = {} } = {}) {
  const errors = [];
  const blocking = getTraversalBlockingReservations(cells);
  const blocked = new Set(blocking.map(cell => `${cell.x},${cell.y}`));
  for (const cell of cells.flat()) {
    if (cell.npc) blocked.add(`${cell.x},${cell.y}`);
  }
  const reachableBeforeUnlock = validationReachableCellKeys(startPosition.x, startPosition.y, blocked);
  const expectedBeforeUnlock = MAP_W * MAP_H - blocked.size;
  if (reachableBeforeUnlock.size !== expectedBeforeUnlock) {
    errors.push(`normal area reachable ${reachableBeforeUnlock.size}/${expectedBeforeUnlock}`);
  }
  const reachableAfterUnlock = validationReachableCellKeys(startPosition.x, startPosition.y, new Set());
  if (reachableAfterUnlock.size !== MAP_W * MAP_H) {
    errors.push(`post-unlock area reachable ${reachableAfterUnlock.size}/${MAP_W * MAP_H}`);
  }
  const reservationIds = new Map();
  for (const cell of cells.flat()) {
    if (cell.featureReservation && cell.featureApproach) {
      errors.push(`reservation overlap at ${cell.x},${cell.y}`);
    }
    if (cell.featureReservation) {
      const list = reservationIds.get(cell.featureReservation.id) || [];
      list.push(cell);
      reservationIds.set(cell.featureReservation.id, list);
    }
    if (cell.featureApproach && !reachableBeforeUnlock.has(`${cell.x},${cell.y}`)) {
      errors.push(`feature approach unreachable: ${cell.featureApproach.id}@${cell.x},${cell.y}`);
    }
    for (const dir of DIRS) {
      if (!cell.doors[dir.key]) continue;
      const nx = cell.x + dir.dx;
      const ny = cell.y + dir.dy;
      if (!inBounds(nx, ny)) errors.push(`door faces outer boundary: ${cell.x},${cell.y},${dir.key}`);
    }
  }
  const specialRooms = cells.flat().filter(cell => cell.specialRoom);
  if (specialRooms.length !== 1) errors.push(`special room count ${specialRooms.length}/1`);
  for (const room of specialRooms) {
    const doorCount = Object.values(room.doorKinds).filter(kind => String(kind).startsWith("special")).length;
    if (doorCount !== 1) errors.push(`special room door count ${doorCount}/1 at ${room.x},${room.y}`);
  }
  const normalizedDepth = Math.max(1, Math.floor(Number(depth) || 1));
  const expectedQuestEvent = getQuestEventForDepth(normalizedDepth, progress);
  if (expectedQuestEvent && !cells.flat().some(cell => cell.questEvent?.id === expectedQuestEvent.id)) {
    errors.push(`required quest event missing: ${expectedQuestEvent.id}`);
  }
  const floorBoss = getFloorBossByDepth(normalizedDepth);
  if (floorBoss && !reservationIds.has(`boss_room_b${normalizedDepth}f`)) {
    errors.push(`required B${normalizedDepth}F boss room missing`);
  }
  const stairsUp = cells.flat().filter(cell => cell.type === "stairsUp");
  const stairsDown = cells.flat().filter(cell => cell.type === "stairsDown");
  const expectedStairsDown = normalizedDepth === 100 ? 0 : 1;
  if (stairsUp.length !== 1) errors.push(`stairs up count ${stairsUp.length}/1`);
  if (stairsDown.length !== expectedStairsDown) errors.push(`stairs down count ${stairsDown.length}/${expectedStairsDown}`);
  for (const stairs of [...stairsUp, ...stairsDown]) {
    if (!reachableAfterUnlock.has(`${stairs.x},${stairs.y}`)) errors.push(`stairs unreachable after unlock: ${stairs.x},${stairs.y}`);
  }
  return {
    valid: errors.length === 0,
    errors,
    featureCount: reservationIds.size,
    reservedCellCount: blocking.length,
    reachableBeforeUnlock: reachableBeforeUnlock.size,
    reachableAfterUnlock: reachableAfterUnlock.size
  };
}

function validationReachableCellKeys(startX, startY, blocked) {
  const startKey = `${startX},${startY}`;
  if (blocked.has(startKey)) return new Set();
  const queue = [{ x: startX, y: startY }];
  const seen = new Set([startKey]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const dir of DIRS) {
      const x = current.x + dir.dx;
      const y = current.y + dir.dy;
      const key = `${x},${y}`;
      if (!inBounds(x, y) || blocked.has(key) || seen.has(key)) continue;
      const hasDoor = Boolean(cells[current.y][current.x].doors[dir.key]);
      if (cells[current.y][current.x].walls[dir.key] && !hasDoor) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

export function resetAllWalls() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      cells[y][x].type = "floor";
      cells[y][x].npc = null;
      cells[y][x].fountain = null;
      cells[y][x].quicksand = null;
      cells[y][x].rapidCurrent = null;
      cells[y][x].rapidCurrentDiscovered = false;
      cells[y][x].treasure = null;
      cells[y][x].treasureTrapId = null;
      cells[y][x].treasureDiscovered = false;
      cells[y][x].eventTreasureId = null;
      cells[y][x].bossId = null;
      cells[y][x].bossRemainsId = null;
      cells[y][x].reserved = null;
      cells[y][x].featureReservation = null;
      cells[y][x].featureApproach = null;
      cells[y][x].portal = null;
      cells[y][x].specialRoom = null;
      cells[y][x].questEvent = null;
      cells[y][x].walls = { N: true, E: true, S: true, W: true };
      cells[y][x].doors = { N: null, E: null, S: null, W: null };
      cells[y][x].doorKinds = { N: null, E: null, S: null, W: null };
    }
  }
}

export function placeStairs(depth = 1) {
  const { x: startX, y: startY } = startPosition;
  const floor = Math.floor(Number(depth) || 1);
  resetCellTypes();
  cells[startY][startX].type = "stairsUp";
  cells[startY][startX].portal = floor % 10 === 0 && floor >= 10 && floor <= 100
    ? `transfer_b${floor}f`
    : null;
  if (floor !== 100) {
    const stairsDown = findFarthestReachableCell(7);
    if (stairsDown) cells[stairsDown.y][stairsDown.x].type = "stairsDown";
  }
}

export function placeNpc(depth = 1, progress = {}) {
  const { x: startX, y: startY } = startPosition;
  resetNpcs();
  const normalizedDepth = Math.floor(Number(depth) || 1);
  const queenShadowQuest = progress.queenShadowQuest || {};
  const queenShadowFloor = normalizedDepth >= 10 && normalizedDepth <= 13;
  const queenShadowExpectedDepth = 10 + Math.min(4, Math.max(0, Math.floor(Number(queenShadowQuest.progress) || 0)));
  const suppressMikanForQuest = queenShadowQuest.active
    && !queenShadowQuest.completed
    && normalizedDepth >= 10
    && normalizedDepth <= 14;
  const placeQueenShadow = suppressMikanForQuest
    && queenShadowFloor
    && normalizedDepth === queenShadowExpectedDepth;
  if (suppressMikanForQuest && !placeQueenShadow) return;
  const distances = makeDistanceMap(startX, startY);
  const reserved = getTraversalBlockingReservations(cells);
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === startX && y === startY) continue;
      if (cells[y][x].type !== "floor" || isDungeonFeatureOccupied(cells[y][x])) continue;
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
    cells[selected.y][selected.x].npc = placeQueenShadow ? "queen_shadow"
      : normalizedDepth === 2 ? "NPC_01_b2"
      : normalizedDepth === 4 ? (progress.bossDefeatedById?.otherworldly_wisdom_b4f ? "NPC_01" : "NPC_01_b4")
      : normalizedDepth === 5 ? "NPC_01_b5"
      : normalizedDepth === 6 ? (progress.bossDefeatedById?.quest_mimic_b6f ? "NPC_01_b6_after" : "NPC_01_b6")
      : normalizedDepth === 9 ? "NPC_01_b9"
      : normalizedDepth >= 60 && normalizedDepth <= 63 ? "NPC_01_b60_desert"
      : normalizedDepth === 64 ? (progress.bossDefeatedById?.todes_scorpio_b64f ? "NPC_01_b60_desert" : "NPC_01_b64_todes")
      : normalizedDepth === 65 ? "NPC_01_b65_oasis"
      : normalizedDepth >= 66 && normalizedDepth <= 68 ? "NPC_01_desert_hot"
      : normalizedDepth === 69 ? "NPC_01_b69_riddle"
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

export function getQuicksandAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].quicksand || null;
}

export function getRapidCurrentAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].rapidCurrent || null;
}

export function discoverRapidCurrent(streamId) {
  let changed = false;
  for (const cell of cells.flat()) {
    if (cell.rapidCurrent?.streamId !== streamId || cell.rapidCurrentDiscovered) continue;
    cell.rapidCurrentDiscovered = true;
    changed = true;
  }
  return changed;
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

export function getBossRemainsAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].bossRemainsId || null;
}

export function markBossDefeatedAt(x, y, bossId) {
  if (!inBounds(x, y)) return false;
  cells[y][x].bossId = null;
  cells[y][x].bossRemainsId = String(bossId || "") || null;
  return Boolean(cells[y][x].bossRemainsId);
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

export function placeTreasures(depth = 1, rng = Math.random, progress = {}) {
  resetTreasures();
  const floor = Math.floor(Number(depth) || 1);
  const blackChestEnabled = Boolean(progress.blackChestsUnlocked) && floor >= 6 && floor % 10 !== 9;
  const redChestsEnabled = (floor >= 11 && floor <= 40) || (floor >= 50 && floor <= 69)
    || (floor >= 80 && floor <= 89);
  if (floor > 4 && !blackChestEnabled && !redChestsEnabled) return;
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const blocked = getTraversalBlockingReservations(cells);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (cells[y][x].npc) blocked.push({ x, y });
    }
  }

  const redChestCount = floor <= 4 || redChestsEnabled
    ? 1 + Math.floor(Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * 3)
    : 0;
  const goldChestEnabled = blackChestEnabled
    && Boolean(progress.goldWeaponEligible)
    && floor >= 50 && floor <= 59
    && Math.max(0, Math.min(0.999999, Number(rng()) || 0)) < 0.01;
  const treasureTypes = [
    ...(blackChestEnabled ? [goldChestEnabled ? "gold" : "black"] : []),
    ...Array.from({ length: redChestCount }, () => "red")
  ];
  for (const type of treasureTypes) {
    const candidates = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (x === startX && y === startY) continue;
        if (cells[y][x].type !== "floor" || isDungeonFeatureOccupied(cells[y][x]) || cells[y][x].npc || cells[y][x].treasure) continue;
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

export function placeSpecialRoom(depth = 1, rng = Math.random, progress = {}) {
  const definition = getSpecialRoomDefinition(depth);
  if (!definition) return null;
  const rareContent = rollMaikaeferNestContent({
    room: definition,
    forcedEnemyId: progress.forcedEnemyId,
    roll: progress.maikaeferNestRoll
  });
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const existingReserved = getTraversalBlockingReservations(cells);
  const candidates = [];
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const room = cells[y][x];
      if (isDungeonFeatureOccupied(room) || room.type !== "floor" || room.npc || room.fountain || room.treasure) continue;
      if (distances[y][x] >= 0 && distances[y][x] < 3) continue;
      for (const dir of DIRS) {
        const approach = { x: x - dir.dx, y: y - dir.dy };
        if (!inBounds(approach.x, approach.y)) continue;
        const approachCell = cells[approach.y][approach.x];
        if (isDungeonFeatureOccupied(approachCell) || isStairCell(approach.x, approach.y)) continue;
        candidates.push({ room: { x, y }, approach, dir });
      }
    }
  }
  for (const candidate of shuffled(candidates, rng)) {
    const placed = runDungeonPlacementTransaction(cells, () => {
      const blocked = [...existingReserved, candidate.room];
      for (const dir of DIRS) setWall(candidate.room.x, candidate.room.y, dir.key, true);
      connectCellsAroundBlockedArea(startX, startY, blocked, rng);
      if (countReachableCells(startX, startY, blocked) !== MAP_W * MAP_H - blocked.length) return null;
      setWall(candidate.approach.x, candidate.approach.y, candidate.dir.key, true);
      setDoor(candidate.approach.x, candidate.approach.y, candidate.dir.key, "closed", "specialLocked");
      const reservation = reserveDungeonFeature(cells, {
        featureId: definition.id,
        type: "specialRoom",
        footprint: [candidate.room],
        approaches: [candidate.approach],
        priority: DUNGEON_FEATURE_PRIORITIES.specialRoom,
        blocksTraversal: true
      });
      if (!reservation.accepted) return null;
      const room = cells[candidate.room.y][candidate.room.x];
      room.specialRoom = {
        ...structuredClone(definition),
        content: structuredClone(definition.content || rareContent),
        attemptsRemaining: Math.max(1, Math.floor(Number(definition.lock?.attempts) || 3)),
        unlocked: false
      };
      return { ...candidate, definition: structuredClone(room.specialRoom) };
    });
    if (placed) return placed;
  }
  return null;
}

export function placePurpleSpecialRoomTreasure(depth = 1, rng = Math.random) {
  if (!hasPurpleChestLootTable(depth)) return null;
  const room = cells.flat().find(cell => cell.specialRoom && !cell.specialRoom.content);
  if (!room) return null;
  room.treasure = "purple";
  room.treasureTrapId = rollTreasureTrap("purple", rng);
  return { x: room.x, y: room.y, treasure: room.treasure };
}

export function placeQuestEvent(depth = 1, rng = Math.random, progress = {}) {
  for (const cell of cells.flat()) cell.questEvent = null;
  const event = getQuestEventForDepth(depth, progress);
  if (!event) return null;
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const candidates = cells.flat().filter(cell =>
    cell.type === "floor" && !isDungeonFeatureOccupied(cell) && !cell.npc && !cell.fountain && !cell.treasure
      && distances[cell.y][cell.x] >= 3
  );
  const selected = shuffled(candidates, rng)[0];
  if (!selected) return null;
  const reservation = reserveDungeonFeature(cells, {
    featureId: event.id, type: "questEvent", footprint: [selected],
    priority: DUNGEON_FEATURE_PRIORITIES.questEvent, blocksTraversal: false
  });
  if (!reservation.accepted) return null;
  selected.questEvent = event;
  return { x: selected.x, y: selected.y, event };
}

export function getQuestEventAt(x, y) {
  return inBounds(x, y) ? cells[y][x].questEvent || null : null;
}

export function removeQuestEventAt(x, y) {
  if (!inBounds(x, y) || !cells[y][x].questEvent) return false;
  cells[y][x].questEvent = null;
  cells[y][x].reserved = null;
  cells[y][x].featureReservation = null;
  return true;
}

export function getSpecialRoomAtDoor(x, y, dirKey) {
  if (!inBounds(x, y)) return null;
  const dir = DIR_BY_KEY[dirKey];
  if (!dir) return null;
  const current = cells[y][x];
  const nextX = x + dir.dx;
  const nextY = y + dir.dy;
  const next = inBounds(nextX, nextY) ? cells[nextY][nextX] : null;
  return current.specialRoom || next?.specialRoom || null;
}

export function getSpecialRoomEntryAt(x, y, dirKey) {
  if (!inBounds(x, y)) return null;
  const dir = DIR_BY_KEY[dirKey];
  if (!dir) return null;
  const nextX = x + dir.dx;
  const nextY = y + dir.dy;
  if (!inBounds(nextX, nextY)) return null;
  return cells[nextY][nextX].specialRoom || null;
}

export function getSpecialRoomAt(x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x].specialRoom || null;
}

export function getSpecialRoomLockInfo({ x, y, dirKey, dex = 0 } = {}) {
  const room = getSpecialRoomAtDoor(x, y, dirKey);
  if (!room) return null;
  const maximum = Math.max(1, Math.floor(Number(room.lock?.attempts) || 3));
  const remaining = Math.max(0, Math.min(maximum, Math.floor(Number(room.attemptsRemaining) || 0)));
  const attemptIndex = maximum - remaining;
  return {
    roomId: room.id,
    remaining,
    maximum,
    rate: remaining > 0 ? getSpecialRoomUnlockRate(room.lock, dex, attemptIndex) : 0,
    unlocked: Boolean(room.unlocked)
  };
}

export function attemptSpecialRoomUnlock({ x, y, dirKey, dex = 0, rng = Math.random } = {}) {
  const room = getSpecialRoomAtDoor(x, y, dirKey);
  const info = getSpecialRoomLockInfo({ x, y, dirKey, dex });
  if (!room || !info || info.unlocked || info.remaining <= 0) return { accepted: false, ...info };
  room.attemptsRemaining = info.remaining - 1;
  const unlocked = Math.max(0, Math.min(0.999999999, Number(rng()) || 0)) < info.rate;
  if (unlocked) {
    room.unlocked = true;
    setDoor(x, y, dirKey, "closed", "specialUnlocked");
  }
  return {
    accepted: true,
    unlocked,
    attemptedRate: info.rate,
    ...getSpecialRoomLockInfo({ x, y, dirKey, dex })
  };
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
  const blocked = [...getTraversalBlockingReservations(cells), ...cells.flat().filter(cell => cell.npc).map(cell => ({ x: cell.x, y: cell.y }))];
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const cell = cells[y][x];
      if (cell.type !== "floor" || isDungeonFeatureOccupied(cell) || cell.npc || cell.treasure || cell.fountain) continue;
      if (distances[y][x] < 3) continue;
      const nextBlocked = [...blocked, { x, y }];
      if (countReachableCells(startX, startY, nextBlocked) !== MAP_W * MAP_H - nextBlocked.length) continue;
      candidates.push({ x, y });
    }
  }
  const placementCount = isDesertOasisFloor(depth) ? 3 : 1;
  const selected = shuffled(candidates, rng).slice(0, placementCount);
  if (selected.length < placementCount) return null;
  if (!isDesertOasisFloor(depth)) {
    cells[selected[0].y][selected[0].x].fountain = HEALING_FOUNTAIN.id;
    return selected[0];
  }
  const realIndex = Math.min(selected.length - 1, Math.floor(Math.max(0, Number(rng()) || 0) * selected.length));
  selected.forEach((position, index) => {
    cells[position.y][position.x].fountain = index === realIndex
      ? DESERT_OASIS.id
      : DESERT_OASIS_MIRAGE.id;
  });
  return selected;
}

export function placeQuicksands(depth = 1, rng = Math.random) {
  for (const cell of cells.flat()) cell.quicksand = null;
  if (!floorHasQuicksand(depth)) return [];
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const blocked = [
    ...getTraversalBlockingReservations(cells),
    ...cells.flat().filter(cell => cell.npc).map(cell => ({ x: cell.x, y: cell.y }))
  ];
  const candidates = cells.flat().filter(cell => {
    if (cell.type !== "floor" || cell.x === startX && cell.y === startY) return false;
    if (isDungeonFeatureOccupied(cell) || cell.npc || cell.fountain || cell.treasure || cell.questEvent || cell.quicksand) return false;
    if (distances[cell.y][cell.x] < 3) return false;
    const nextBlocked = [...blocked, { x: cell.x, y: cell.y }];
    return countReachableCells(startX, startY, nextBlocked) === MAP_W * MAP_H - nextBlocked.length;
  });
  const selected = shuffled(candidates, rng).slice(0, QUICKSAND_COUNT);
  if (selected.length < QUICKSAND_COUNT) return [];
  selected.forEach((cell, index) => {
    const target = selected[(index + 1) % selected.length];
    cells[cell.y][cell.x].quicksand = {
      id: DESERT_QUICKSAND.id,
      targetX: target.x,
      targetY: target.y
    };
  });
  return selected.map(cell => ({ x: cell.x, y: cell.y }));
}

export function placeRapidCurrents(depth = 1, rng = Math.random) {
  for (const cell of cells.flat()) {
    cell.rapidCurrent = null;
    cell.rapidCurrentDiscovered = false;
  }
  if (!floorHasRapidCurrents(depth)) return [];
  const targetCount = getRapidCurrentTargetCount(depth);
  const occupied = new Set();
  const placed = [];
  for (let streamIndex = 0; streamIndex < targetCount; streamIndex += 1) {
    let accepted = null;
    for (const length of [4, 3, 2]) {
      const candidates = shuffled(makeRapidCurrentCandidates(length, occupied), rng);
      for (const candidate of candidates) {
        applyRapidCurrentCandidate(candidate, `rapid_current_${streamIndex + 1}`);
        const blocked = new Set(cells.flat().filter(cell => cell.rapidCurrent).map(cell => `${cell.x},${cell.y}`));
        if (validateRapidCurrentReachability(blocked)) {
          accepted = candidate;
          break;
        }
        clearRapidCurrentCandidate(candidate);
      }
      if (accepted) break;
    }
    if (!accepted) break;
    placed.push(accepted);
    for (const point of [accepted.entry, ...accepted.currentCells, accepted.shore]) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) occupied.add(`${point.x + dx},${point.y + dy}`);
      }
    }
  }
  return placed.map(candidate => ({
    direction: candidate.direction.key,
    length: candidate.currentCells.length,
    entry: { ...candidate.entry },
    shore: { ...candidate.shore },
    cells: candidate.currentCells.map(cell => ({ ...cell }))
  }));
}

function makeRapidCurrentCandidates(length, occupied) {
  const protectedCells = getRapidCurrentProtectedKeys();
  const candidates = [];
  for (const entry of cells.flat()) {
    for (const direction of Object.values(RAPID_CURRENT_DIRECTIONS)) {
      const currentCells = Array.from({ length }, (_, index) => ({
        x: entry.x + direction.dx * (index + 1),
        y: entry.y + direction.dy * (index + 1)
      }));
      const shore = { x: entry.x + direction.dx * (length + 1), y: entry.y + direction.dy * (length + 1) };
      const points = [{ x: entry.x, y: entry.y }, ...currentCells, shore];
      if (!points.every(point => inBounds(point.x, point.y))) continue;
      if (points.some(point => occupied.has(`${point.x},${point.y}`) || protectedCells.has(`${point.x},${point.y}`))) continue;
      if (!points.every(point => isPlainRapidCurrentFloor(cells[point.y][point.x]))) continue;
      let open = true;
      for (let index = 0; index < points.length - 1; index += 1) {
        const from = points[index];
        if (cells[from.y][from.x].walls[direction.key] || cells[from.y][from.x].doors[direction.key]) {
          open = false;
          break;
        }
      }
      if (open) candidates.push({ entry: points[0], currentCells, shore, direction });
    }
  }
  return candidates;
}

function isPlainRapidCurrentFloor(cell) {
  return cell.type === "floor" && !isDungeonFeatureOccupied(cell)
    && !cell.npc && !cell.fountain && !cell.treasure && !cell.questEvent
    && !cell.quicksand && !cell.bossId && !cell.bossRemainsId && !cell.specialRoom;
}

function getRapidCurrentProtectedKeys() {
  const keys = new Set();
  const protectedOrigins = cells.flat().filter(cell =>
    cell.type === "stairsUp" || cell.type === "stairsDown" || cell.portal
    || cell.featureReservation || cell.featureApproach || cell.npc || cell.fountain
    || cell.treasure || cell.questEvent || cell.quicksand || cell.bossId || cell.bossRemainsId
  );
  for (const origin of protectedOrigins) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) <= 2) keys.add(`${origin.x + dx},${origin.y + dy}`);
      }
    }
  }
  keys.add(`${startPosition.x},${startPosition.y}`);
  return keys;
}

function applyRapidCurrentCandidate(candidate, streamId) {
  candidate.currentCells.forEach((point, segmentIndex) => {
    cells[point.y][point.x].rapidCurrent = {
      id: RAPID_CURRENT.id,
      streamId,
      direction: candidate.direction.key,
      segmentIndex,
      segmentCount: candidate.currentCells.length,
      shoreX: candidate.shore.x,
      shoreY: candidate.shore.y
    };
  });
}

function clearRapidCurrentCandidate(candidate) {
  for (const point of candidate.currentCells) {
    cells[point.y][point.x].rapidCurrent = null;
    cells[point.y][point.x].rapidCurrentDiscovered = false;
  }
}

export function validateRapidCurrentReachability(blocked = new Set(cells.flat().filter(cell => cell.rapidCurrent).map(cell => `${cell.x},${cell.y}`))) {
  const reserved = getTraversalBlockingReservations(cells);
  for (const cell of reserved) blocked.add(`${cell.x},${cell.y}`);
  for (const cell of cells.flat()) if (cell.npc) blocked.add(`${cell.x},${cell.y}`);
  const reachable = validationReachableCellKeys(startPosition.x, startPosition.y, blocked);
  for (const cell of cells.flat()) {
    if (blocked.has(`${cell.x},${cell.y}`)) continue;
    if (!reachable.has(`${cell.x},${cell.y}`)) return false;
  }
  return true;
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
        if (isDungeonFeatureOccupied(cells[y][x]) || isDungeonFeatureOccupied(cells[ny][nx])) continue;
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

export function placeFloorBossRoom(bossDefinition, rng = Math.random, progress = {}) {
  const floorBoss = typeof bossDefinition === "number"
    ? getFloorBossByDepth(bossDefinition)
    : bossDefinition;
  if (!floorBoss) return null;
  const { x: startX, y: startY } = startPosition;
  const candidates = [];
  for (let y = 1; y < MAP_H - 1; y += 1) {
    for (let x = 1; x < MAP_W - 1; x += 1) {
      for (const dir of DIRS) {
        const approach = { x: x - dir.dx, y: y - dir.dy };
        const room = [0, 1, 2].map(offset => ({ x: x + dir.dx * offset, y: y + dir.dy * offset }));
        if (![approach, ...room].every(cell => inBounds(cell.x, cell.y))) continue;
        if (room.some(cell => cell.x === startX && cell.y === startY)) continue;
        if ([approach, ...room].some(cell => isDungeonFeatureOccupied(cells[cell.y][cell.x]))) continue;
        if (isStairCell(approach.x, approach.y)) continue;
        candidates.push({ approach, room, dir });
      }
    }
  }
  for (const candidate of shuffled(candidates, rng)) {
    const placed = runDungeonPlacementTransaction(cells, () => {
      const blocked = candidate.room.map(({ x, y }) => ({ x, y }));
      for (const cell of candidate.room) for (const dir of DIRS) setWall(cell.x, cell.y, dir.key, true);
      setWall(candidate.room[0].x, candidate.room[0].y, candidate.dir.key, false);
      setWall(candidate.room[1].x, candidate.room[1].y, candidate.dir.key, false);
      connectCellsAroundBlockedArea(startX, startY, blocked, rng);
      if (countReachableCells(startX, startY, blocked) !== MAP_W * MAP_H - blocked.length) return null;
      const reservation = reserveDungeonFeature(cells, {
        featureId: `boss_room_b${floorBoss.floor}f`,
        type: "bossRoom",
        footprint: candidate.room,
        approaches: [candidate.approach],
        priority: DUNGEON_FEATURE_PRIORITIES.bossRoom,
        blocksTraversal: true
      });
      if (!reservation.accepted) return null;
      const bossDefeated = Boolean(
        progress.bossDefeatedById?.[floorBoss.id]
        || (floorBoss.floor === 9 && progress.bossDefeated)
      );
      const doorUnlocked = Boolean(
        floorBoss.room?.doorStartsUnlocked
        || bossDefeated
        || (floorBoss.room?.requiresKey && progress.redDoorUnlocked)
      );
      for (const cell of cells.flat()) {
        if (cell.type === "stairsDown") cell.type = "floor";
      }
      setWall(candidate.approach.x, candidate.approach.y, candidate.dir.key, true);
      setDoor(candidate.approach.x, candidate.approach.y, candidate.dir.key, "closed", doorUnlocked ? "bossUnlocked" : "boss");
      const [blank, boss, stairs] = candidate.room.map(cell => cells[cell.y][cell.x]);
      boss.bossId = bossDefeated ? null : floorBoss.id;
      const resolvedDisplayId = progress.bossRemainsById?.[floorBoss.id];
      boss.bossRemainsId = bossDefeated && resolvedDisplayId
        ? resolvedDisplayId
        : bossDefeated && (floorBoss.defeatedEncounterImage || floorBoss.event?.remains)
          ? floorBoss.id
          : null;
      stairs.type = "stairsDown";
      for (const target of [blank, boss, stairs]) {
        target.npc = null; target.fountain = null; target.treasure = null; target.eventTreasureId = null;
      }
      return { approach: candidate.approach, blank, boss, stairs, doorDirection: candidate.dir.key };
    });
    if (placed) return placed;
  }
  return null;
}

export function placeB9BossRoom(rng = Math.random, progress = {}) {
  return placeFloorBossRoom(9, rng, progress);
}

export function placeB9KeyTreasure(rng = Math.random, progress = {}) {
  return placeFloorBossKeyTreasure(getFloorBossByDepth(9), rng, progress);
}

export function placeFloorBossKeyTreasure(bossDefinition, rng = Math.random, progress = {}) {
  const floorBoss = typeof bossDefinition === "number"
    ? getFloorBossByDepth(bossDefinition)
    : bossDefinition;
  const keyItemId = floorBoss?.room?.keyItemId;
  if (!floorBoss?.room?.requiresKey || !keyItemId) return null;
  const bossDefeated = Boolean(
    progress.bossDefeatedById?.[floorBoss.id]
    || (floorBoss.floor === 9 && progress.bossDefeated)
  );
  if (progress.redDoorUnlocked || bossDefeated || progress.hasRedKey) return null;
  const { x: startX, y: startY } = startPosition;
  const distances = makeDistanceMap(startX, startY);
  const candidates = cells.flat().filter(cell =>
    cell.type === "floor" && !isDungeonFeatureOccupied(cell) && !cell.npc && !cell.fountain && !cell.treasure
      && distances[cell.y][cell.x] >= 3
  );
  const selected = shuffled(candidates, rng)[0];
  if (!selected) return null;
  selected.treasure = "gold";
  let trapRoll = 0;
  selected.treasureTrapId = rollTreasureTrap("gold", () => trapRoll++ === 0 ? 0 : rng());
  selected.eventTreasureId = `${keyItemId}_chest`;
  return { x: selected.x, y: selected.y };
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

export function isCellCompletelySealed(x, y) {
  if (!inBounds(x, y)) return true;
  return DIRS.every(dir => {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (!inBounds(nx, ny)) return true;
    if (getDoorState(x, y, dir.key)) return false;
    return wallOnCell(x, y, dir.key);
  });
}
