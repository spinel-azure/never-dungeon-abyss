export const QUICKSAND_FLOOR_MIN = 60;
export const QUICKSAND_FLOOR_MAX = 68;
export const QUICKSAND_COUNT = 3;

export const DESERT_QUICKSAND = Object.freeze({
  id: "desert_quicksand",
  image: "images/npc/NPC_event_15.avif",
  minimapMark: "≋"
});

export function floorHasQuicksand(depth) {
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  return floor >= QUICKSAND_FLOOR_MIN && floor <= QUICKSAND_FLOOR_MAX;
}
