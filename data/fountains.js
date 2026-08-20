export const FOUNTAIN_FLOORS = Object.freeze([
  5, 9, 15, 19, 25, 29, 35, 39, 45, 49,
  55, 59, 65, 69, 75, 79, 85, 89, 95, 99
]);

export const HEALING_FOUNTAIN = Object.freeze({
  id: "healing_fountain",
  image: "images/npc/fountain_01.avif",
  minimapMark: "⛲"
});

export const DESERT_OASIS_FLOORS = Object.freeze([65, 69]);
export const DESERT_OASIS = Object.freeze({
  id: "desert_oasis",
  image: "images/npc/fountain_02.avif",
  minimapMark: "⛲",
  kind: "real"
});
export const DESERT_OASIS_MIRAGE = Object.freeze({
  id: "desert_oasis_mirage",
  image: "images/npc/fountain_02.avif",
  minimapMark: "⛲",
  kind: "mirage"
});

const FOUNTAINS_BY_ID = Object.freeze({
  [HEALING_FOUNTAIN.id]: HEALING_FOUNTAIN,
  [DESERT_OASIS.id]: DESERT_OASIS,
  [DESERT_OASIS_MIRAGE.id]: DESERT_OASIS_MIRAGE
});

export function floorHasHealingFountain(depth) {
  return FOUNTAIN_FLOORS.includes(Math.max(1, Math.floor(Number(depth) || 1)));
}

export function isDesertOasisFloor(depth) {
  return DESERT_OASIS_FLOORS.includes(Math.max(1, Math.floor(Number(depth) || 1)));
}

export function getFountainById(id) {
  return FOUNTAINS_BY_ID[id] || HEALING_FOUNTAIN;
}

export function restAtHealingFountain(character) {
  if (!character) return null;
  return { ...character, hp: character.maxHp, sp: character.maxSp };
}
