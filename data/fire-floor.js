import {hasEquippedFloorProtection} from './floor-protection.js';
export const FIRE_FLOOR_MIN_DEPTH = 30;
export const FIRE_FLOOR_MAX_DEPTH = 39;
export const FIRE_FLOOR_DAMAGE = 1;
export const FIREPROOF_BOOTS_ID = "fireproof_boots";

export function isFireFloorDepth(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= FIRE_FLOOR_MIN_DEPTH && floor <= FIRE_FLOOR_MAX_DEPTH;
}

export function hasFireFloorImmunity(character) {
  return hasEquippedFloorProtection(character,'fireFloorDamageImmunity');
}

export function getFireFloorStepDamage(character, depth) {
  return isFireFloorDepth(depth) && !hasFireFloorImmunity(character) ? FIRE_FLOOR_DAMAGE : 0;
}
