import { normalizeReincarnationCount } from "./reincarnation.js";

export const PLAYER_STAT_CAPS = Object.freeze([30, 50, 70, 90]);
export const PLAYER_DEFENSE_CAPS = Object.freeze([60, 70, 80, 90]);

export function getPlayerStatMaximum(reincarnationCount = 0) {
  return PLAYER_STAT_CAPS[normalizeReincarnationCount(reincarnationCount)];
}

export function getPlayerDefenseMaximum(reincarnationCount = 0) {
  return PLAYER_DEFENSE_CAPS[normalizeReincarnationCount(reincarnationCount)];
}

export const ENEMY_STAT_CAPS = Object.freeze([30, 50, 70, 90]);

export function getEnemyStatMaximum(playerReincarnationCount = 0) {
  return ENEMY_STAT_CAPS[normalizeReincarnationCount(playerReincarnationCount)];
}
