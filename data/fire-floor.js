export const FIRE_FLOOR_MIN_DEPTH = 30;
export const FIRE_FLOOR_MAX_DEPTH = 39;
export const FIRE_FLOOR_DAMAGE = 1;
export const FIREPROOF_BOOTS_ID = "fireproof_boots";

export function isFireFloorDepth(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= FIRE_FLOOR_MIN_DEPTH && floor <= FIRE_FLOOR_MAX_DEPTH;
}

export function hasFireFloorImmunity(character) {
  if (!character) return false;
  if (character.equipment?.footId === FIREPROOF_BOOTS_ID) return true;
  const equippedInstanceId = character.equippedInstanceIds?.footId;
  return Boolean((character.equipmentInventory?.instances || []).some(instance => (
    instance.instanceId === equippedInstanceId && instance.equipmentId === FIREPROOF_BOOTS_ID
  )));
}

export function getFireFloorStepDamage(character, depth) {
  return isFireFloorDepth(depth) && !hasFireFloorImmunity(character) ? FIRE_FLOOR_DAMAGE : 0;
}
