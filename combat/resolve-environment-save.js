import { COMBAT_CONFIG, clamp } from "./combat-config.js";

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
  enemyMaximum = 1
} = {}) {
  return clamp(
    numeric(enemyBaseRate)
      - numeric(player.luc) * COMBAT_CONFIG.surpriseLuckMultiplier
      - numeric(player.surpriseResistance),
    0,
    Math.max(0, numeric(enemyMaximum))
  );
}

function roll(rng) {
  return Math.max(0, Math.min(0.999999999999, numeric(rng?.())));
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
