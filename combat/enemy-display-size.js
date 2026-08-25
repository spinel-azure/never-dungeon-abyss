export const ENEMY_DISPLAY_SIZES = Object.freeze(["small", "medium", "large", "huge-wide"]);

export function normalizeEnemyDisplaySize(value) {
  return ENEMY_DISPLAY_SIZES.includes(value) ? value : "small";
}

export function getEnemyDisplaySize(enemy) {
  return normalizeEnemyDisplaySize(enemy?.battleSize);
}
