import { DIRS } from "./config.js";
import {
  ROAMING_ENEMY_DEFINITIONS,
  getRoamingEnemyDefinitionById,
  getRoamingEnemyDefinitionForDepth,
  normalizeRoamingEnemyDefinition
} from "../data/roaming-enemies.js";

const ACTIVE = "active";
const TERMINAL_STATUSES = new Set(["defeated", "departed"]);
const PERMANENT_RESERVED_TYPES = new Set([
  "bossRoom",
  "specialRoom",
  "requiredEventRoom",
  "questEventRoom",
  "fixedEvent",
  "fixedFloor"
]);

let roamingEnemy = null;
let configuredDefinitions = [...ROAMING_ENEMY_DEFINITIONS];
let instanceSequence = 0;

export function setRoamingEnemyDefinitions(definitions = ROAMING_ENEMY_DEFINITIONS) {
  configuredDefinitions = (Array.isArray(definitions) ? definitions : [])
    .map(normalizeRoamingEnemyDefinition)
    .filter(definition => definition.id && definition.enemyId && definition.imageId && definition.image);
  return configuredDefinitions.map(definition => ({ ...definition, floors: [...definition.floors] }));
}

export function getConfiguredRoamingEnemyDefinitions() {
  return configuredDefinitions.map(definition => ({ ...definition, floors: [...definition.floors] }));
}

export function getActiveRoamingEnemy() {
  return roamingEnemy;
}

export function clearRoamingEnemy() {
  roamingEnemy = null;
}

export function isRoamingEnemyActive(enemy = roamingEnemy) {
  return Boolean(enemy && enemy.status === ACTIVE && !enemy.inBattle);
}

export function canRoamingEnemyOccupyCell(cell = {}) {
  if (!cell || cell.type !== "floor") return false;
  if (cell.npc || cell.fountain || cell.quicksand || cell.rapidCurrent) return false;
  if (cell.treasure || cell.bossId || cell.bossRemainsId || cell.explorationObstacleId) return false;
  if (cell.portal || cell.fixedWarp || cell.fixedReturnPortal || cell.fixedReturnPoint || cell.fixedEvent) return false;
  if (cell.specialRoom || cell.questEvent) return false;
  if (PERMANENT_RESERVED_TYPES.has(String(cell.reserved || ""))) return false;
  if (PERMANENT_RESERVED_TYPES.has(String(cell.featureReservation?.type || ""))) return false;
  return true;
}

export function canRoamingEnemyTraverse(grid, fromX, fromY, dir) {
  const from = grid?.[fromY]?.[fromX];
  const to = grid?.[fromY + dir.dy]?.[fromX + dir.dx];
  if (!from || !to || !canRoamingEnemyOccupyCell(to)) return false;
  const doorState = from.doors?.[dir.key] || null;
  const doorKind = from.doorKinds?.[dir.key] || null;
  if (doorState) return doorState === "open" && doorKind === "normal";
  return !from.walls?.[dir.key];
}

export function getRoamingEnemyNeighbors(grid, x, y) {
  return DIRS.filter(dir => canRoamingEnemyTraverse(grid, x, y, dir))
    .map(dir => ({ x: x + dir.dx, y: y + dir.dy, dirKey: dir.key }));
}

export function getRoamingEnemyApproachTargets(grid, player = {}) {
  const x = Math.floor(Number(player.x));
  const y = Math.floor(Number(player.y));
  const current = grid?.[y]?.[x];
  if (!current) return [];
  if (canRoamingEnemyOccupyCell(current)) return [{ x, y }];
  return DIRS.filter(dir => canRoamingEnemyTraverse(grid, x, y, dir))
    .map(dir => ({ x: x + dir.dx, y: y + dir.dy }));
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

export function collectReachableRoamingCells(grid, player = {}) {
  const queue = getRoamingEnemyApproachTargets(grid, player);
  const visited = new Set(queue.map(pointKey));
  const result = [];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    result.push(current);
    for (const next of getRoamingEnemyNeighbors(grid, current.x, current.y)) {
      const key = pointKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ x: next.x, y: next.y });
    }
  }
  return result;
}

function chooseByRng(values, rng = Math.random) {
  if (!values.length) return null;
  const roll = Math.max(0, Math.min(0.999999999999, Number(rng()) || 0));
  return values[Math.floor(roll * values.length)] || values[0];
}

export function chooseFarthestRoamingEnemyCell(grid, player = {}, rng = Math.random) {
  const px = Math.floor(Number(player.x));
  const py = Math.floor(Number(player.y));
  const candidates = collectReachableRoamingCells(grid, { x: px, y: py })
    .filter(point => point.x !== px || point.y !== py);
  if (!candidates.length) return null;
  const maxDistance = Math.max(...candidates.map(point => Math.abs(point.x - px) + Math.abs(point.y - py)));
  return chooseByRng(candidates.filter(point => (
    Math.abs(point.x - px) + Math.abs(point.y - py) === maxDistance
  )), rng);
}

export function placeRoamingEnemyForFloor({
  depth = 1,
  grid,
  player,
  rng = Math.random,
  definitions = ROAMING_ENEMY_DEFINITIONS,
  moveDuration = 170
} = {}) {
  setRoamingEnemyDefinitions(definitions);
  roamingEnemy = null;
  const definition = getRoamingEnemyDefinitionForDepth(depth, configuredDefinitions);
  if (!definition) return null;
  const target = chooseFarthestRoamingEnemyCell(grid, player, rng);
  if (!target) return null;
  instanceSequence += 1;
  roamingEnemy = {
    instanceId: `roaming:${definition.id}:b${Math.max(1, Math.floor(Number(depth) || 1))}f:${instanceSequence}`,
    definitionId: definition.id,
    x: target.x,
    y: target.y,
    mode: "patrol",
    lastSeen: null,
    previous: null,
    status: ACTIVE,
    inBattle: false,
    rewardGranted: false,
    moveDuration: Math.max(0, Number(moveDuration) || 0),
    transition: null
  };
  return roamingEnemy;
}

export function serializeRoamingEnemyState(enemy = roamingEnemy) {
  if (!enemy) return null;
  return {
    instanceId: String(enemy.instanceId || ""),
    definitionId: String(enemy.definitionId || ""),
    x: Math.floor(Number(enemy.x)),
    y: Math.floor(Number(enemy.y)),
    mode: ["patrol", "chase", "investigate"].includes(enemy.mode) ? enemy.mode : "patrol",
    lastSeen: normalizePoint(enemy.lastSeen),
    previous: normalizePoint(enemy.previous),
    status: TERMINAL_STATUSES.has(enemy.status) ? enemy.status : ACTIVE,
    rewardGranted: Boolean(enemy.rewardGranted)
  };
}

function normalizePoint(point) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) return null;
  return { x: point.x, y: point.y };
}

export function restoreRoamingEnemyState(saved, {
  grid,
  definitions = ROAMING_ENEMY_DEFINITIONS,
  moveDuration = 170
} = {}) {
  setRoamingEnemyDefinitions(definitions);
  roamingEnemy = null;
  if (!saved || typeof saved !== "object") return null;
  const definition = getRoamingEnemyDefinitionById(saved.definitionId, configuredDefinitions);
  if (!definition) return null;
  const status = TERMINAL_STATUSES.has(saved.status) ? saved.status : ACTIVE;
  if (!Number.isInteger(saved.x) || !Number.isInteger(saved.y)) return null;
  const x = saved.x;
  const y = saved.y;
  if (!grid?.[y]?.[x]) return null;
  if (status === ACTIVE && !canRoamingEnemyOccupyCell(grid[y][x])) {
    roamingEnemy = {
      instanceId: String(saved.instanceId || `roaming:${definition.id}:restored`),
      definitionId: definition.id,
      x,
      y,
      mode: "patrol",
      lastSeen: null,
      previous: null,
      status: "departed",
      inBattle: false,
      rewardGranted: false,
      moveDuration: Math.max(0, Number(moveDuration) || 0),
      transition: null
    };
    return roamingEnemy;
  }
  roamingEnemy = {
    instanceId: String(saved.instanceId || `roaming:${definition.id}:restored`),
    definitionId: definition.id,
    x,
    y,
    mode: ["patrol", "chase", "investigate"].includes(saved.mode) ? saved.mode : "patrol",
    lastSeen: normalizePoint(saved.lastSeen),
    previous: normalizePoint(saved.previous),
    status,
    inBattle: false,
    rewardGranted: Boolean(saved.rewardGranted),
    moveDuration: Math.max(0, Number(moveDuration) || 0),
    transition: null
  };
  return roamingEnemy;
}

export function getRoamingEnemyDefinition(enemy = roamingEnemy) {
  return enemy ? getRoamingEnemyDefinitionById(enemy.definitionId, configuredDefinitions) : null;
}

export function isRoamingEnemyAt(x, y, enemy = roamingEnemy) {
  return Boolean(isRoamingEnemyActive(enemy) && enemy.x === x && enemy.y === y);
}

export function hasRoamingEnemyLineOfSight(grid, enemy, player = {}) {
  if (!isRoamingEnemyActive(enemy)) return false;
  const px = Math.floor(Number(player.x));
  const py = Math.floor(Number(player.y));
  if ((enemy.x !== px && enemy.y !== py) || !canRoamingEnemyOccupyCell(grid?.[py]?.[px])) return false;
  const dx = Math.sign(px - enemy.x);
  const dy = Math.sign(py - enemy.y);
  const dir = DIRS.find(candidate => candidate.dx === dx && candidate.dy === dy);
  if (!dir) return enemy.x === px && enemy.y === py;
  let x = enemy.x;
  let y = enemy.y;
  while (x !== px || y !== py) {
    if (!canRoamingEnemyTraverse(grid, x, y, dir)) return false;
    x += dir.dx;
    y += dir.dy;
  }
  return true;
}

export function findRoamingEnemyPath(grid, start, targets = []) {
  const targetKeys = new Set(targets.map(pointKey));
  if (!targetKeys.size) return [];
  const startKey = pointKey(start);
  if (targetKeys.has(startKey)) return [];
  const queue = [{ x: start.x, y: start.y }];
  const visited = new Set([startKey]);
  const previous = new Map();
  let destination = null;
  for (let index = 0; index < queue.length && !destination; index += 1) {
    const current = queue[index];
    for (const next of getRoamingEnemyNeighbors(grid, current.x, current.y)) {
      const key = pointKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      previous.set(key, current);
      const point = { x: next.x, y: next.y };
      if (targetKeys.has(key)) {
        destination = point;
        break;
      }
      queue.push(point);
    }
  }
  if (!destination) return null;
  const path = [];
  let cursor = destination;
  while (pointKey(cursor) !== startKey) {
    path.unshift(cursor);
    cursor = previous.get(pointKey(cursor));
    if (!cursor) return null;
  }
  return path;
}

function getTargetsForPoint(grid, point) {
  return getRoamingEnemyApproachTargets(grid, point);
}

export function planRoamingEnemyMove(grid, enemy, player = {}, rng = Math.random) {
  if (!isRoamingEnemyActive(enemy)) return null;
  const playerPoint = { x: Math.floor(Number(player.x)), y: Math.floor(Number(player.y)) };
  const playerVisible = hasRoamingEnemyLineOfSight(grid, enemy, playerPoint);
  if (playerVisible) {
    enemy.mode = "chase";
    enemy.lastSeen = playerPoint;
  } else if (enemy.mode === "chase") {
    enemy.mode = "investigate";
  }
  if (enemy.mode === "chase" || enemy.mode === "investigate") {
    const goal = enemy.mode === "chase" ? playerPoint : enemy.lastSeen;
    const path = goal ? findRoamingEnemyPath(grid, enemy, getTargetsForPoint(grid, goal)) : null;
    if (path?.length) return path[0];
    if (path && path.length === 0) {
      if (!playerVisible) {
        enemy.mode = "patrol";
        enemy.lastSeen = null;
      }
      return null;
    }
    if (enemy.mode === "chase" && enemy.lastSeen) {
      enemy.mode = "investigate";
      const lastSeenPath = findRoamingEnemyPath(grid, enemy, getTargetsForPoint(grid, enemy.lastSeen));
      if (lastSeenPath?.length) return lastSeenPath[0];
    }
    enemy.mode = "patrol";
    enemy.lastSeen = null;
  }
  const neighbors = getRoamingEnemyNeighbors(grid, enemy.x, enemy.y);
  if (!neighbors.length) return null;
  const withoutImmediateReturn = enemy.previous && neighbors.length > 1
    ? neighbors.filter(point => point.x !== enemy.previous.x || point.y !== enemy.previous.y)
    : neighbors;
  return chooseByRng(withoutImmediateReturn.length ? withoutImmediateReturn : neighbors, rng);
}

export function advanceRoamingEnemyForPlayerStep({
  grid,
  player,
  rng = Math.random,
  now = 0
} = {}) {
  const enemy = roamingEnemy;
  if (!isRoamingEnemyActive(enemy)) return { moved: false, contact: false, pendingContact: false };
  const px = Math.floor(Number(player?.x));
  const py = Math.floor(Number(player?.y));
  if (isRoamingEnemyAt(px, py, enemy)) {
    return { moved: false, contact: true, pendingContact: false, instanceId: enemy.instanceId };
  }
  const next = planRoamingEnemyMove(grid, enemy, { x: px, y: py }, rng);
  if (!next) return { moved: false, contact: false, pendingContact: false };
  const from = { x: enemy.x, y: enemy.y };
  enemy.previous = from;
  enemy.x = next.x;
  enemy.y = next.y;
  const pendingContact = next.x === px && next.y === py;
  enemy.transition = {
    fromX: from.x,
    fromY: from.y,
    toX: next.x,
    toY: next.y,
    startedAt: Math.max(0, Number(now) || 0),
    duration: enemy.moveDuration,
    pendingContact,
    contactDelivered: false
  };
  return { moved: true, contact: false, pendingContact, instanceId: enemy.instanceId };
}

export function getRoamingEnemyRenderState(now = 0, enemy = roamingEnemy) {
  if (!enemy || enemy.status !== ACTIVE) return null;
  const definition = getRoamingEnemyDefinition(enemy);
  if (!definition) return null;
  const transition = enemy.transition;
  let x = enemy.x;
  let y = enemy.y;
  if (transition) {
    const progress = transition.duration <= 0
      ? 1
      : Math.max(0, Math.min(1, (Number(now) - transition.startedAt) / transition.duration));
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    x = transition.fromX + (transition.toX - transition.fromX) * eased;
    y = transition.fromY + (transition.toY - transition.fromY) * eased;
  }
  return { ...enemy, renderX: x + 0.5, renderY: y + 0.5, definition };
}

export function completeRoamingEnemyAnimation(now = 0) {
  const enemy = roamingEnemy;
  const transition = enemy?.transition;
  if (!transition) return null;
  if (Number(now) < transition.startedAt + transition.duration) return null;
  enemy.transition = null;
  if (!transition.pendingContact || transition.contactDelivered) return { completed: true, contact: false };
  transition.contactDelivered = true;
  return { completed: true, contact: true, instanceId: enemy.instanceId };
}

export function beginRoamingEnemyBattle(instanceId) {
  if (!roamingEnemy || roamingEnemy.instanceId !== instanceId || roamingEnemy.status !== ACTIVE) return false;
  roamingEnemy.inBattle = true;
  roamingEnemy.transition = null;
  return true;
}

export function cancelRoamingEnemyBattle(instanceId) {
  if (!roamingEnemy || roamingEnemy.instanceId !== instanceId) return false;
  roamingEnemy.inBattle = false;
  return true;
}

export function resetRoamingEnemyAfterEscape({ grid, player, rng = Math.random } = {}) {
  const enemy = roamingEnemy;
  if (!enemy || enemy.status !== ACTIVE) return null;
  const target = chooseFarthestRoamingEnemyCell(grid, player, rng);
  enemy.inBattle = false;
  enemy.mode = "patrol";
  enemy.lastSeen = null;
  enemy.previous = null;
  enemy.transition = null;
  if (!target) {
    enemy.status = "departed";
    return enemy;
  }
  enemy.x = target.x;
  enemy.y = target.y;
  return enemy;
}

export function defeatRoamingEnemy(instanceId) {
  if (!roamingEnemy || roamingEnemy.instanceId !== instanceId || roamingEnemy.status !== ACTIVE) return false;
  roamingEnemy.status = "defeated";
  roamingEnemy.inBattle = false;
  roamingEnemy.rewardGranted = true;
  roamingEnemy.transition = null;
  return true;
}

export function departRoamingEnemy(instanceId) {
  if (!roamingEnemy || roamingEnemy.instanceId !== instanceId || roamingEnemy.status !== ACTIVE) return false;
  roamingEnemy.status = "departed";
  roamingEnemy.inBattle = false;
  roamingEnemy.transition = null;
  return true;
}
