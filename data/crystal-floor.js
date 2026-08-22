export const CRYSTAL_FLOOR_MIN_DEPTH = 80;
export const CRYSTAL_FLOOR_MAX_DEPTH = 89;
export const CRYSTAL_FLOOR_SP_DRAIN_INTERVAL = 3;

export function isCrystalFloorDepth(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= CRYSTAL_FLOOR_MIN_DEPTH && floor <= CRYSTAL_FLOOR_MAX_DEPTH;
}

export function applyCrystalFloorSpStep(character, depth) {
  if (!character || !isCrystalFloorDepth(depth)) {
    return { character: character ? { ...character, crystalFloorStepCount: 0 } : character, drained: 0 };
  }
  const stepCount = (Math.max(0, Math.floor(Number(character.crystalFloorStepCount) || 0)) + 1) % CRYSTAL_FLOOR_SP_DRAIN_INTERVAL;
  const drained = stepCount === 0 && Number(character.sp) > 0 ? 1 : 0;
  return {
    character: { ...character, crystalFloorStepCount: stepCount, sp: Math.max(0, Math.floor(Number(character.sp) || 0) - drained) },
    drained
  };
}
