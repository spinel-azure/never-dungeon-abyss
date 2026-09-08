export const BATTLE_SPEED_FAST = "fast";
export const BATTLE_SPEED_SLOW = "slow";
export const DEFAULT_BATTLE_SPEED_MODE = BATTLE_SPEED_FAST;
export const BATTLE_SLOW_MULTIPLIER = 1.8;
export const BATTLE_SLOW_DEDICATED_DWELL_MS = 450;

export function normalizeBattleSpeedMode(mode) {
  return mode === BATTLE_SPEED_SLOW ? BATTLE_SPEED_SLOW : BATTLE_SPEED_FAST;
}

export function toggleBattleSpeedMode(mode) {
  return normalizeBattleSpeedMode(mode) === BATTLE_SPEED_FAST
    ? BATTLE_SPEED_SLOW
    : BATTLE_SPEED_FAST;
}

export function getBattlePresentationDelay(milliseconds, mode) {
  const duration = Math.max(0, Number(milliseconds) || 0);
  return Math.round(duration * (
    normalizeBattleSpeedMode(mode) === BATTLE_SPEED_SLOW
      ? BATTLE_SLOW_MULTIPLIER
      : 1
  ));
}

export function getBattleDedicatedPresentationDwell(mode) {
  return normalizeBattleSpeedMode(mode) === BATTLE_SPEED_SLOW
    ? BATTLE_SLOW_DEDICATED_DWELL_MS
    : 0;
}
