export const RAPID_CURRENT = Object.freeze({
  id: "rapid_current",
  imageId: "rapid_current_event",
  image: "images/npc/NPC_event_16.avif",
  startSeId: "rapidCurrentSplash",
  movementSeId: "rapidCurrentFlow"
});

export const RAPID_CURRENT_DIRECTIONS = Object.freeze({
  N: Object.freeze({ key: "N", dx: 0, dy: -1, minimap: "↑" }),
  E: Object.freeze({ key: "E", dx: 1, dy: 0, minimap: "→" }),
  S: Object.freeze({ key: "S", dx: 0, dy: 1, minimap: "↓" }),
  W: Object.freeze({ key: "W", dx: -1, dy: 0, minimap: "←" })
});

export function floorHasRapidCurrents(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= 70 && floor <= 78;
}

export function getRapidCurrentTargetCount(depth) {
  const floor = Math.floor(Number(depth) || 0);
  if (!floorHasRapidCurrents(floor)) return 0;
  if (floor <= 71) return 2;
  if (floor <= 73) return 3;
  if (floor <= 76) return 3;
  return 4;
}

export function getRapidCurrentForcedPath({ x, y, rapidCurrent } = {}) {
  const direction = RAPID_CURRENT_DIRECTIONS[rapidCurrent?.direction];
  if (!direction) return [];
  const remainingCurrentCells = Math.max(0, Number(rapidCurrent.segmentCount) - Number(rapidCurrent.segmentIndex) - 1);
  const path = Array.from({ length: remainingCurrentCells }, (_, index) => ({
    x: Number(x) + direction.dx * (index + 1),
    y: Number(y) + direction.dy * (index + 1)
  }));
  path.push({ x: Number(rapidCurrent.shoreX), y: Number(rapidCurrent.shoreY) });
  return path;
}
