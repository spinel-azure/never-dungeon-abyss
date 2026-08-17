export const COLD_FLOOR_MIN_DEPTH = 40;
export const COLD_FLOOR_MAX_DEPTH = 49;
export const COLD_FLOOR_DAMAGE = 1;
export const COLDPROOF_BOOTS_ID = "coldproof_boots";

export function isColdFloorDepth(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= COLD_FLOOR_MIN_DEPTH && floor <= COLD_FLOOR_MAX_DEPTH;
}

export function hasColdFloorImmunity(character) {
  if (!character) return false;
  if (character.equipment?.footId === COLDPROOF_BOOTS_ID) return true;
  const equippedInstanceId = character.equippedInstanceIds?.footId;
  return Boolean((character.equipmentInventory?.instances || []).some(instance => (
    instance.instanceId === equippedInstanceId && instance.equipmentId === COLDPROOF_BOOTS_ID
  )));
}

export function getColdFloorStepDamage(character, depth) {
  return isColdFloorDepth(depth) && !hasColdFloorImmunity(character) ? COLD_FLOOR_DAMAGE : 0;
}
