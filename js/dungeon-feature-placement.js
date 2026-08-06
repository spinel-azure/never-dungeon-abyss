export const DUNGEON_FEATURE_PRIORITIES = Object.freeze({
  stairs: 1000,
  bossRoom: 900,
  requiredEventRoom: 800,
  specialRoom: 700,
  npc: 400,
  treasure: 300,
  fountain: 200,
  normalDoor: 100
});

export const DUNGEON_PLACEMENT_ORDER = Object.freeze([
  "stairs",
  "bossRoom",
  "requiredEventRoom",
  "specialRoom",
  "npc",
  "treasure",
  "fountain",
  "normalDoor"
]);

export function reserveDungeonFeature(grid, {
  featureId,
  type,
  footprint = [],
  approaches = [],
  priority = 0,
  blocksTraversal = true
} = {}) {
  const id = String(featureId || "");
  if (!id || !type || !Array.isArray(footprint) || !footprint.length) {
    return { accepted: false, reason: "invalidReservation" };
  }
  const footprintKeys = new Set(footprint.map(cellKey));
  const allTargets = [...footprint, ...approaches];
  if (allTargets.some(({ x, y }) => !grid[y]?.[x])) return { accepted: false, reason: "outOfBounds" };
  for (const target of footprint) {
    const cell = grid[target.y][target.x];
    if (cell.featureReservation || cell.featureApproach) return { accepted: false, reason: "conflict", target };
  }
  for (const target of approaches) {
    if (footprintKeys.has(cellKey(target))) continue;
    const cell = grid[target.y][target.x];
    if (cell.featureReservation || cell.featureApproach) return { accepted: false, reason: "conflict", target };
  }
  const reservation = Object.freeze({ id, type: String(type), priority: Number(priority) || 0, blocksTraversal: Boolean(blocksTraversal) });
  for (const target of footprint) {
    const cell = grid[target.y][target.x];
    cell.reserved = type;
    cell.featureReservation = reservation;
  }
  for (const target of approaches) {
    if (footprintKeys.has(cellKey(target))) continue;
    grid[target.y][target.x].featureApproach = Object.freeze({ id, type: String(type), priority: Number(priority) || 0 });
  }
  return { accepted: true, reservation };
}

export function isDungeonFeatureOccupied(cell, { includeApproach = true } = {}) {
  return Boolean(cell?.featureReservation || cell?.reserved || (includeApproach && cell?.featureApproach));
}

export function getTraversalBlockingReservations(grid) {
  return grid.flat().filter(cell =>
    cell.featureReservation?.blocksTraversal || (cell.reserved && !cell.featureReservation)
  ).map(cell => ({ x: cell.x, y: cell.y }));
}

export function runDungeonPlacementTransaction(grid, placeAndValidate) {
  const snapshot = structuredClone(grid);
  try {
    const result = placeAndValidate();
    if (result) return result;
  } catch (error) {
    restoreDungeonPlacementSnapshot(grid, snapshot);
    throw error;
  }
  restoreDungeonPlacementSnapshot(grid, snapshot);
  return null;
}

export function restoreDungeonPlacementSnapshot(grid, snapshot) {
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) Object.assign(grid[y][x], snapshot[y][x]);
  }
}

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}
