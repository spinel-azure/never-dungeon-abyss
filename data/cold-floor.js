export const COLD_FLOOR_MIN_DEPTH = 40;
export const COLD_FLOOR_MAX_DEPTH = 49;
export const COLD_FLOOR_DAMAGE = 1;

export function isColdFloorDepth(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= COLD_FLOOR_MIN_DEPTH && floor <= COLD_FLOOR_MAX_DEPTH;
}

export function getColdFloorStepDamage(character, depth) {
  return character && isColdFloorDepth(depth) ? COLD_FLOOR_DAMAGE : 0;
}
