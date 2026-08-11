export const FOUNTAIN_FLOORS = Object.freeze([
  5, 9, 15, 19, 25, 29, 35, 39, 45, 49,
  55, 59, 65, 69, 75, 79, 85, 89, 95, 99
]);

export const HEALING_FOUNTAIN = Object.freeze({
  id: "healing_fountain",
  image: "images/npc/fountain_01.avif",
  minimapMark: "⛲"
});

export function floorHasHealingFountain(depth) {
  return FOUNTAIN_FLOORS.includes(Math.max(1, Math.floor(Number(depth) || 1)));
}

export function restAtHealingFountain(character) {
  if (!character) return null;
  return { ...character, hp: character.maxHp, sp: character.maxSp };
}
