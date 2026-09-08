export const BATTLE_SPEED_FAST = "fast";
export const BATTLE_SPEED_NORMAL = "normal";
export const BATTLE_SPEED_SLOW = "slow";
export const DEFAULT_BATTLE_SPEED_MODE = BATTLE_SPEED_FAST;
export const BATTLE_SPEED_SETTINGS_VERSION = 2;
export const BATTLE_NORMAL_MULTIPLIER = 1.8;
export const BATTLE_SLOW_MULTIPLIER = 2.6;
export const BATTLE_NORMAL_DEDICATED_DWELL_MS = 450;
export const BATTLE_SLOW_DEDICATED_DWELL_MS = 900;

export function normalizeBattleSpeedMode(mode) {
  return [BATTLE_SPEED_FAST, BATTLE_SPEED_NORMAL, BATTLE_SPEED_SLOW].includes(mode)
    ? mode
    : BATTLE_SPEED_FAST;
}

export function normalizeStoredBattleSpeedMode(mode, settingsVersion = 0) {
  if (Number(settingsVersion) < BATTLE_SPEED_SETTINGS_VERSION && mode === BATTLE_SPEED_SLOW) {
    return BATTLE_SPEED_NORMAL;
  }
  return normalizeBattleSpeedMode(mode);
}

export function toggleBattleSpeedMode(mode) {
  const normalized = normalizeBattleSpeedMode(mode);
  if (normalized === BATTLE_SPEED_FAST) return BATTLE_SPEED_NORMAL;
  if (normalized === BATTLE_SPEED_NORMAL) return BATTLE_SPEED_SLOW;
  return BATTLE_SPEED_FAST;
}

export function getBattlePresentationDelay(milliseconds, mode) {
  const duration = Math.max(0, Number(milliseconds) || 0);
  const normalized = normalizeBattleSpeedMode(mode);
  const multiplier = normalized === BATTLE_SPEED_SLOW
    ? BATTLE_SLOW_MULTIPLIER
    : normalized === BATTLE_SPEED_NORMAL
      ? BATTLE_NORMAL_MULTIPLIER
      : 1;
  return Math.round(duration * multiplier);
}

export function getBattleDedicatedPresentationDwell(mode) {
  const normalized = normalizeBattleSpeedMode(mode);
  if (normalized === BATTLE_SPEED_SLOW) return BATTLE_SLOW_DEDICATED_DWELL_MS;
  if (normalized === BATTLE_SPEED_NORMAL) return BATTLE_NORMAL_DEDICATED_DWELL_MS;
  return 0;
}
