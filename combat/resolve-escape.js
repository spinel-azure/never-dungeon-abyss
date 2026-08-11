import { clamp } from "./combat-config.js";

export function getEquipmentAdjustedEscapeRate({
  escapeRate = 0,
  weaponId = "",
  isBoss = false
} = {}) {
  const baseRate = clamp(Number(escapeRate), 0, 1);
  return weaponId === "vorpal_sword" && !isBoss
    ? Math.max(baseRate, 0.85)
    : baseRate;
}

export function resolveEscapeAttempt({
  escapeRate = 0,
  rateBonus = 0,
  rng = Math.random
} = {}) {
  const rate = clamp(Number(escapeRate) + Number(rateBonus), 0, 1);
  const roll = Math.max(0, Math.min(0.999999999999, Number(rng()) || 0));
  return {
    actionType: "escape",
    success: roll < rate,
    rate
  };
}
