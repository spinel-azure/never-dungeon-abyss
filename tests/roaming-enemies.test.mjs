import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ROAMING_ENEMY_DEFINITIONS,
  getRoamingEnemyDefinitionForDepth,
  isRoamingEnemyEnabledOnDepth,
  normalizeRoamingEnemyDefinition
} from "../data/roaming-enemies.js";
import {
  advanceRoamingEnemyForPlayerStep,
  beginRoamingEnemyBattle,
  canRoamingEnemyOccupyCell,
  canRoamingEnemyTraverse,
  chooseFarthestRoamingEnemyCell,
  clearRoamingEnemy,
  collectReachableRoamingCells,
  completeRoamingEnemyAnimation,
  defeatRoamingEnemy,
  findRoamingEnemyPath,
  getActiveRoamingEnemy,
  getRoamingEnemyApproachTargets,
  getRoamingEnemyNeighbors,
  getRoamingEnemyRenderState,
  hasRoamingEnemyLineOfSight,
  isRoamingEnemyAt,
  placeRoamingEnemyForFloor,
  planRoamingEnemyMove,
  resetRoamingEnemyAfterEscape,
  restoreRoamingEnemyState,
  serializeRoamingEnemyState
} from "../js/roaming-enemies.js";
import { shouldDrawRoamingEnemyMarker } from "../js/minimap.js";
import {
  buildBoundaryWallMap,
  cells,
  resetAllWalls,
  setDoor,
  setWall,
  setStartPosition
} from "../js/dungeon.js";
import {
  configurePlayer,
  manualMove,
  manualTurn,
  openDoorAhead,
  resetPlayer,
  setPlayerInputEnabled,
  state as playerState,
  updateAnimation as updatePlayerAnimation
} from "../js/player.js";

const TEST_DEFINITION = Object.freeze({
  id: "test_verfolger",
  enemyId: "cave_slime",
  imageId: "test_verfolger",
  image: "images/enemies/enemy_01.avif",
  floors: [12],
  escapeRate: 0.65,
  renderScale: 1.2
});

test.afterEach(() => clearRoamingEnemy());

test("production roaming-enemy registry is empty until concrete floor values are approved", () => {
  assert.deepEqual(ROAMING_ENEMY_DEFINITIONS, []);
  assert.equal(getRoamingEnemyDefinitionForDepth(12), null);
});

test("roaming definitions support explicit floors and inclusive ranges", () => {
  const explicit = normalizeRoamingEnemyDefinition(TEST_DEFINITION);
  const ranged = normalizeRoamingEnemyDefinition({
    ...TEST_DEFINITION,
    id: "range",
    floors: [],
    minDepth: 20,
    maxDepth: 22
  });
  assert.equal(isRoamingEnemyEnabledOnDepth(explicit, 12), true);
  assert.equal(isRoamingEnemyEnabledOnDepth(explicit, 11), false);
  assert.equal(isRoamingEnemyEnabledOnDepth(ranged, 20), true);
  assert.equal(isRoamingEnemyEnabledOnDepth(ranged, 22), true);
  assert.equal(isRoamingEnemyEnabledOnDepth(ranged, 23), false);
});

test("farthest placement uses Manhattan distance and injected RNG for ties", () => {
  const grid = makeGrid(3, 3);
  const low = chooseFarthestRoamingEnemyCell(grid, { x: 1, y: 1 }, () => 0);
  const high = chooseFarthestRoamingEnemyCell(grid, { x: 1, y: 1 }, () => 0.999999);
  assert.equal(manhattan(low, { x: 1, y: 1 }), 2);
  assert.equal(manhattan(high, { x: 1, y: 1 }), 2);
  assert.notDeepEqual(low, high);
  assert.deepEqual(
    chooseFarthestRoamingEnemyCell(grid, { x: 1, y: 1 }, seeded(4471)),
    chooseFarthestRoamingEnemyCell(grid, { x: 1, y: 1 }, seeded(4471))
  );
});

test("a player standing on stairs uses reachable neighboring floor cells as path roots", () => {
  const grid = makeGrid(3, 3);
  grid[1][1].type = "stairsUp";
  assert.deepEqual(
    getRoamingEnemyApproachTargets(grid, { x: 1, y: 1 }).map(pointKey).sort(),
    ["0,1", "1,0", "1,2", "2,1"]
  );
  assert.equal(collectReachableRoamingCells(grid, { x: 1, y: 1 }).length, 8);
  assert.equal(manhattan(
    chooseFarthestRoamingEnemyCell(grid, { x: 1, y: 1 }, () => 0),
    { x: 1, y: 1 }
  ), 2);
});

test("placement terminates cleanly when no reachable normal floor exists", () => {
  const grid = makeGrid(1, 1);
  grid[0][0].type = "stairsUp";
  assert.equal(chooseFarthestRoamingEnemyCell(grid, { x: 0, y: 0 }, () => 0), null);
  assert.equal(placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  }), null);
});

test("the shared occupancy predicate blocks every live static feature", () => {
  const blockedVariants = [
    { type: "stairsDown" },
    { npc: "npc" },
    { fountain: "fountain" },
    { quicksand: {} },
    { rapidCurrent: {} },
    { treasure: "red" },
    { bossId: "boss" },
    { bossRemainsId: "boss" },
    { explorationObstacleId: "fire_pillar" },
    { portal: "transfer" },
    { fixedWarp: {} },
    { fixedReturnPortal: {} },
    { fixedReturnPoint: {} },
    { fixedEvent: {} },
    { specialRoom: {} },
    { questEvent: {} },
    { reserved: "bossRoom" },
    { featureReservation: { type: "specialRoom" } }
  ];
  for (const variant of blockedVariants) {
    assert.equal(canRoamingEnemyOccupyCell({ ...makeCell(0, 0), ...variant }), false, JSON.stringify(variant));
  }
  assert.equal(canRoamingEnemyOccupyCell(makeCell(0, 0)), true);
});

test("open normal doors are passable while closed, locked, and event doors are not", () => {
  const grid = makeGrid(2, 1);
  setEdge(grid, 0, 0, "E", { wall: true, door: "closed", kind: "normal" });
  assert.equal(canRoamingEnemyTraverse(grid, 0, 0, direction("E")), false);
  setEdge(grid, 0, 0, "E", { wall: true, door: "open", kind: "normal" });
  assert.equal(canRoamingEnemyTraverse(grid, 0, 0, direction("E")), true);
  setEdge(grid, 0, 0, "E", { wall: true, door: "open", kind: "specialUnlocked" });
  assert.equal(canRoamingEnemyTraverse(grid, 0, 0, direction("E")), false);
  setEdge(grid, 0, 0, "E", { wall: true, door: "locked", kind: "locked" });
  assert.equal(canRoamingEnemyTraverse(grid, 0, 0, direction("E")), false);
});

test("opened treasures and removed obstacles become traversable despite stale temporary reservations", () => {
  const cell = makeCell(0, 0);
  cell.featureReservation = { type: "treasure", id: "old_chest" };
  cell.reserved = "treasure";
  cell.treasure = "red";
  assert.equal(canRoamingEnemyOccupyCell(cell), false);
  cell.treasure = null;
  assert.equal(canRoamingEnemyOccupyCell(cell), true);
  cell.explorationObstacleId = "fire_pillar";
  assert.equal(canRoamingEnemyOccupyCell(cell), false);
  cell.explorationObstacleId = null;
  assert.equal(canRoamingEnemyOccupyCell(cell), true);
});


test("patrol avoids an immediate reversal when another route exists and reverses at a dead end", () => {
  const grid = makeGrid(3, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, { x: 1, y: 0, previous: { x: 0, y: 0 }, mode: "patrol" });
  assert.deepEqual(planRoamingEnemyMove(grid, enemy, { x: 99, y: 99 }, () => 0), {
    x: 2,
    y: 0,
    dirKey: "E"
  });
  enemy.x = 2;
  enemy.previous = { x: 1, y: 0 };
  assert.deepEqual(planRoamingEnemyMove(grid, enemy, { x: 99, y: 99 }, () => 0), {
    x: 1,
    y: 0,
    dirKey: "W"
  });
});

test("patrol waits when every neighboring cell is forbidden", () => {
  const grid = makeGrid(3, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, { x: 1, y: 0 });
  grid[0][0].treasure = "red";
  grid[0][2].npc = "npc";
  assert.equal(planRoamingEnemyMove(grid, enemy, { x: 99, y: 99 }, () => 0), null);
});

test("line-of-sight discovery enters chase and follows a shortest valid path", () => {
  const grid = makeGrid(5, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 4, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, { x: 0, y: 0, mode: "patrol", previous: null });
  assert.equal(hasRoamingEnemyLineOfSight(grid, enemy, { x: 4, y: 0 }), true);
  assert.deepEqual(planRoamingEnemyMove(grid, enemy, { x: 4, y: 0 }, () => 0), {
    x: 1,
    y: 0
  });
  assert.equal(enemy.mode, "chase");
  assert.deepEqual(enemy.lastSeen, { x: 4, y: 0 });
  assert.deepEqual(findRoamingEnemyPath(grid, { x: 0, y: 0 }, [{ x: 4, y: 0 }]).map(pointKey), [
    "1,0", "2,0", "3,0", "4,0"
  ]);
});

test("losing sight returns to patrol when the path to the last seen cell vanishes", () => {
  const grid = makeGrid(5, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 4, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, {
    x: 1,
    y: 0,
    mode: "chase",
    lastSeen: { x: 4, y: 0 },
    previous: { x: 0, y: 0 }
  });
  setEdge(grid, 1, 0, "E", { wall: true });
  assert.equal(hasRoamingEnemyLineOfSight(grid, enemy, { x: 4, y: 0 }), false);
  const next = planRoamingEnemyMove(grid, enemy, { x: 4, y: 0 }, () => 0);
  assert.equal(enemy.mode, "patrol");
  assert.equal(enemy.lastSeen, null);
  assert.deepEqual(next, { x: 0, y: 0, dirKey: "W" });
});

test("after losing sight the enemy investigates the last seen position before resuming patrol", () => {
  const grid = makeGrid(4, 3);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 3, y: 1 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, {
    x: 1,
    y: 1,
    mode: "chase",
    lastSeen: { x: 3, y: 1 },
    previous: { x: 0, y: 1 }
  });
  const next = planRoamingEnemyMove(grid, enemy, { x: 3, y: 2 }, () => 0);
  assert.equal(enemy.mode, "investigate");
  assert.deepEqual(enemy.lastSeen, { x: 3, y: 1 });
  assert.deepEqual(next, { x: 2, y: 1 });
});

test("player contact is resolved before enemy movement", () => {
  const grid = makeGrid(3, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  const before = { x: enemy.x, y: enemy.y };
  const result = advanceRoamingEnemyForPlayerStep({
    grid,
    player: before,
    rng: () => 0,
    now: 100
  });
  assert.deepEqual(result, {
    moved: false,
    contact: true,
    pendingContact: false,
    instanceId: enemy.instanceId
  });
  assert.deepEqual({ x: enemy.x, y: enemy.y }, before);
});

test("enemy contact waits for movement interpolation to finish", () => {
  const grid = makeGrid(2, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 1, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0,
    moveDuration: 100
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, { x: 0, y: 0, mode: "patrol", previous: null });
  const result = advanceRoamingEnemyForPlayerStep({
    grid,
    player: { x: 1, y: 0 },
    rng: () => 0,
    now: 1000
  });
  assert.equal(result.moved, true);
  assert.equal(result.pendingContact, true);
  assert.equal(completeRoamingEnemyAnimation(1099), null);
  assert.deepEqual(completeRoamingEnemyAnimation(1100), {
    completed: true,
    contact: true,
    instanceId: enemy.instanceId
  });
  assert.deepEqual(completeRoamingEnemyAnimation(1101), null);
});

test("an instance marked in battle cannot patrol until combat ends", () => {
  const grid = makeGrid(3, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  const before = { x: enemy.x, y: enemy.y };
  assert.equal(beginRoamingEnemyBattle(enemy.instanceId), true);
  assert.deepEqual(advanceRoamingEnemyForPlayerStep({
    grid,
    player: { x: 0, y: 0 },
    rng: () => 0,
    now: 0
  }), { moved: false, contact: false, pendingContact: false });
  assert.deepEqual({ x: enemy.x, y: enemy.y }, before);
});

test("render coordinates interpolate while logical collision coordinates stay integral", () => {
  const grid = makeGrid(3, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 2, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0,
    moveDuration: 100
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, { x: 0, y: 0, mode: "patrol", previous: null });
  advanceRoamingEnemyForPlayerStep({
    grid,
    player: { x: 2, y: 0 },
    rng: () => 0,
    now: 200
  });
  const render = getRoamingEnemyRenderState(250);
  assert.equal(enemy.x, 1);
  assert.equal(enemy.y, 0);
  assert.equal(render.renderX, 1);
  assert.equal(render.renderY, 0.5);
});

test("escape success resets combat state and moves the enemy to the farthest reachable cell", () => {
  const grid = makeGrid(4, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, {
    x: 1,
    y: 0,
    mode: "chase",
    lastSeen: { x: 0, y: 0 },
    previous: { x: 2, y: 0 }
  });
  assert.equal(beginRoamingEnemyBattle(enemy.instanceId), true);
  const reset = resetRoamingEnemyAfterEscape({
    grid,
    player: { x: 0, y: 0 },
    rng: () => 0
  });
  assert.deepEqual({ x: reset.x, y: reset.y }, { x: 3, y: 0 });
  assert.equal(reset.inBattle, false);
  assert.equal(reset.mode, "patrol");
  assert.equal(reset.lastSeen, null);
  assert.equal(reset.previous, null);
});

test("escape without a legal destination removes the instance without rewards", () => {
  const grid = makeGrid(1, 1);
  grid[0][0].type = "stairsUp";
  const wider = makeGrid(2, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid: wider,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  const reset = resetRoamingEnemyAfterEscape({
    grid,
    player: { x: 0, y: 0 },
    rng: () => 0
  });
  assert.equal(reset.status, "departed");
  assert.equal(reset.rewardGranted, false);
  assert.equal(isRoamingEnemyAt(0, 0), false);
});

test("defeat removes the instance and grants its per-map reward only once", () => {
  const grid = makeGrid(2, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  assert.equal(beginRoamingEnemyBattle(enemy.instanceId), true);
  assert.equal(defeatRoamingEnemy(enemy.instanceId), true);
  assert.equal(enemy.status, "defeated");
  assert.equal(enemy.rewardGranted, true);
  assert.equal(defeatRoamingEnemy(enemy.instanceId), false);
});

test("save data preserves identity, movement memory, and terminal state without animation internals", () => {
  const grid = makeGrid(3, 1);
  placeRoamingEnemyForFloor({
    depth: 12,
    grid,
    player: { x: 0, y: 0 },
    definitions: [TEST_DEFINITION],
    rng: () => 0
  });
  const enemy = getActiveRoamingEnemy();
  Object.assign(enemy, {
    mode: "investigate",
    lastSeen: { x: 0, y: 0 },
    previous: { x: 1, y: 0 },
    transition: { fromX: 1, fromY: 0, toX: 2, toY: 0 }
  });
  const saved = serializeRoamingEnemyState();
  assert.equal("transition" in saved, false);
  clearRoamingEnemy();
  const restored = restoreRoamingEnemyState(saved, {
    grid,
    definitions: [TEST_DEFINITION]
  });
  assert.equal(restored.instanceId, saved.instanceId);
  assert.equal(restored.definitionId, TEST_DEFINITION.id);
  assert.equal(restored.mode, "investigate");
  assert.deepEqual(restored.lastSeen, { x: 0, y: 0 });
  assert.deepEqual(restored.previous, { x: 1, y: 0 });
});

test("old saves and malformed roaming references do not create a new instance", () => {
  const grid = makeGrid(2, 1);
  assert.equal(restoreRoamingEnemyState(undefined, { grid, definitions: [TEST_DEFINITION] }), null);
  assert.equal(restoreRoamingEnemyState({
    instanceId: "bad",
    definitionId: "missing",
    x: 1,
    y: 0,
    status: "active"
  }, { grid, definitions: [TEST_DEFINITION] }), null);
  assert.equal(restoreRoamingEnemyState({
    instanceId: "null-coordinate",
    definitionId: TEST_DEFINITION.id,
    x: null,
    y: 0,
    status: "active"
  }, { grid, definitions: [TEST_DEFINITION] }), null);
  assert.equal(restoreRoamingEnemyState({
    instanceId: "bad-coordinate",
    definitionId: TEST_DEFINITION.id,
    x: 99,
    y: 99,
    status: "active"
  }, { grid, definitions: [TEST_DEFINITION] }), null);
});

test("an invalid occupied coordinate is restored as departed instead of retry-looping", () => {
  const grid = makeGrid(2, 1);
  grid[0][1].treasure = "red";
  const restored = restoreRoamingEnemyState({
    instanceId: "occupied",
    definitionId: TEST_DEFINITION.id,
    x: 1,
    y: 0,
    mode: "chase",
    status: "active"
  }, { grid, definitions: [TEST_DEFINITION] });
  assert.equal(restored.status, "departed");
  assert.equal(restored.inBattle, false);
});

test("the minimap marker is visible only on the enemy's currently explored cell", () => {
  const explored = [[true, false]];
  assert.equal(shouldDrawRoamingEnemyMarker({ status: "active", x: 0, y: 0 }, explored), true);
  assert.equal(shouldDrawRoamingEnemyMarker({ status: "active", x: 1, y: 0 }, explored), false);
  assert.equal(shouldDrawRoamingEnemyMarker({ status: "defeated", x: 0, y: 0 }, explored), false);
});

test("full dungeon generation places a configured test enemy after static features", () => {
  setStartPosition(5, 5);
  const firstRolls = seeded(9182);
  buildBoundaryWallMap(12, firstRolls, { roamingEnemyDefinitions: [TEST_DEFINITION] });
  const enemy = getActiveRoamingEnemy();
  assert.ok(enemy);
  assert.equal(canRoamingEnemyOccupyCell(cells[enemy.y][enemy.x]), true);
  assert.notDeepEqual({ x: enemy.x, y: enemy.y }, { x: 5, y: 5 });
});

test("ordinary production dungeon generation does not add an unspecified roaming enemy", () => {
  setStartPosition(5, 5);
  buildBoundaryWallMap(12, seeded(9182));
  assert.equal(getActiveRoamingEnemy(), null);
});

test("the movement hook runs once after a successful step and not for turns or wall collisions", () => {
  setStartPosition(1, 1);
  resetAllWalls();
  setWall(1, 1, "E", false);
  resetPlayer(1);
  setPlayerInputEnabled(true);
  let roamingSteps = 0;
  configurePlayer({
    say: () => {},
    playSe: () => {},
    cancelAutoReturn: () => {},
    onDungeonStep: () => {},
    onRoamingEnemyPlayerStep: () => {
      roamingSteps += 1;
      return { handled: false };
    },
    updateRoamingEnemyAnimation: () => ({ contact: false }),
    onStateChanged: () => {}
  });

  manualTurn(1);
  updatePlayerAnimation(playerState.anim.start + playerState.anim.duration + 1);
  assert.equal(roamingSteps, 0);

  resetPlayer(1);
  setWall(1, 1, "E", true);
  setDoor(1, 1, "E", "closed", "normal");
  assert.equal(openDoorAhead(), true);
  updatePlayerAnimation(playerState.anim.start + playerState.anim.duration + 1);
  assert.equal(roamingSteps, 0);

  resetPlayer(0);
  manualMove(1);
  assert.equal(playerState.anim, null);
  assert.equal(roamingSteps, 0);

  resetPlayer(1);
  setWall(1, 1, "E", false);
  setDoor(1, 1, "E", null, "normal");
  manualMove(1);
  const completionTime = playerState.anim.start + playerState.anim.duration + 1;
  updatePlayerAnimation(completionTime);
  assert.equal(roamingSteps, 1);
  updatePlayerAnimation(completionTime + 1);
  assert.equal(roamingSteps, 1);
});

test("runtime integration orders roaming contact before random encounters and persists the map instance", async () => {
  const [playerSource, mainSource, dungeonSource, rendererSource] = await Promise.all([
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/dungeon.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);
  assert.ok(playerSource.indexOf("if (a.crossedDoor) closeDoor") < playerSource.indexOf("hooks.onRoamingEnemyPlayerStep"));
  assert.ok(playerSource.indexOf("hooks.onRoamingEnemyPlayerStep") < playerSource.indexOf("onExplorationStep({"));
  assert.match(playerSource, /onRoamingEnemyForcedMovementComplete/);
  assert.match(mainSource, /roamingEnemy: serializeRoamingEnemyState\(\)/);
  assert.match(mainSource, /restoreRoamingEnemyState\(dungeon\.roamingEnemy/);
  assert.match(mainSource, /activeRoamingEnemyInstanceId/);
  assert.match(mainSource, /roamingEnemyInstanceId: instanceId/);
  assert.match(mainSource, /transition\?\.pendingContact/);
  assert.ok(dungeonSource.indexOf("placeFloorLootPickups(depth, rng)") < dungeonSource.lastIndexOf("placeRoamingEnemyForFloor({"));
  assert.match(rendererSource, /eventKind: "roamingEnemy"/);
  assert.match(rendererSource, /roaming\.transition\.fromX/);
  assert.match(rendererSource, /projectCellFootprint\(cell\.x, cell\.y, projected\.forward, true\)/);
});

function makeGrid(width, height) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => makeCell(x, y))
  );
}

function makeCell(x, y) {
  return {
    x,
    y,
    type: "floor",
    npc: null,
    fountain: null,
    quicksand: null,
    rapidCurrent: null,
    treasure: null,
    bossId: null,
    bossRemainsId: null,
    explorationObstacleId: null,
    portal: null,
    fixedWarp: null,
    fixedReturnPortal: null,
    fixedReturnPoint: null,
    fixedEvent: null,
    specialRoom: null,
    questEvent: null,
    reserved: null,
    featureReservation: null,
    walls: { N: false, E: false, S: false, W: false },
    doors: { N: null, E: null, S: null, W: null },
    doorKinds: { N: null, E: null, S: null, W: null }
  };
}

function direction(key) {
  return {
    N: { key: "N", dx: 0, dy: -1, opposite: "S" },
    E: { key: "E", dx: 1, dy: 0, opposite: "W" },
    S: { key: "S", dx: 0, dy: 1, opposite: "N" },
    W: { key: "W", dx: -1, dy: 0, opposite: "E" }
  }[key];
}

function setEdge(grid, x, y, key, { wall = false, door = null, kind = null } = {}) {
  const dir = direction(key);
  const from = grid[y][x];
  const to = grid[y + dir.dy]?.[x + dir.dx];
  from.walls[key] = wall;
  from.doors[key] = door;
  from.doorKinds[key] = kind;
  if (to) {
    to.walls[dir.opposite] = wall;
    to.doors[dir.opposite] = door;
    to.doorKinds[dir.opposite] = kind;
  }
}

function pointKey(point) {
  return String(point.x) + "," + String(point.y);
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
