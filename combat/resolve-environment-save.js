import { COMBAT_CONFIG, clamp } from "./combat-config.js";

export const NORMAL_ENEMY_SURPRISE_MAXIMUM = 0.3;
export const SURPRISE_RESISTANCE_MAXIMUM = 0.15;

export function resolveEnvironmentSave({
  target = {},
  effect = {},
  rng = Math.random
} = {}) {
  const rate = clamp(
    numeric(effect.baseSaveRate)
      + numeric(target.luc) * COMBAT_CONFIG.environmentSaveLuckMultiplier
      + numeric(target.environmentSaveBonus)
      + numeric(effect.saveRateBonus),
    COMBAT_CONFIG.environmentSaveMinimum,
    COMBAT_CONFIG.environmentSaveMaximum
  );
  return {
    actionType: "environmentSave",
    success: roll(rng) < rate,
    rate,
    successEffect: effect.saveSuccessEffect || "avoid"
  };
}

export function calculateSurpriseRate({
  player = {},
  enemyBaseRate = 0,
  enemyMaximum = NORMAL_ENEMY_SURPRISE_MAXIMUM,
  ignoreNormalCap = false
} = {}) {
  const maximum = ignoreNormalCap
    ? Math.max(0, numeric(enemyMaximum))
    : Math.min(NORMAL_ENEMY_SURPRISE_MAXIMUM, Math.max(0, numeric(enemyMaximum)));
  const baseRate = ignoreNormalCap
    ? numeric(enemyBaseRate)
    : Math.min(NORMAL_ENEMY_SURPRISE_MAXIMUM, numeric(enemyBaseRate));
  const resistance = clamp(
    numeric(player.surpriseResistance),
    0,
    SURPRISE_RESISTANCE_MAXIMUM
  );
  return clamp(
    baseRate
      - numeric(player.luc) * COMBAT_CONFIG.surpriseLuckMultiplier
      - resistance,
    0,
    maximum
  );
}

export function resolveSurprise({
  player = {},
  enemyBaseRate = 0,
  enemyMaximum = NORMAL_ENEMY_SURPRISE_MAXIMUM,
  ignoreNormalCap = false,
  rng = Math.random
} = {}) {
  const rate = calculateSurpriseRate({
    player,
    enemyBaseRate,
    enemyMaximum,
    ignoreNormalCap
  });
  return {
    actionType: "surpriseSave",
    ambush: roll(rng) < rate,
    rate
  };
}

function roll(rng) {
  return Math.max(0, Math.min(0.999999999999, numeric(rng?.())));
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
