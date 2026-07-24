import { COMBAT_CONFIG, clamp } from "./combat-config.js";

export function resolveStatusEffect({
  attacker = {},
  defender = {},
  effect = {},
  rng = Math.random
} = {}) {
  const resistance = getResistance(defender, effect.statusId);
  if (resistance.immune) {
    return statusResult(effect, false, 0, true);
  }
  if (effect.guaranteed) {
    return statusResult(effect, true, 1, false);
  }
  const attackStat = effect.statusKind === "magical"
    ? numeric(attacker.int)
    : numeric(attacker.dex);
  const defenseLuck = numeric(defender.luc);
  const rate = clamp(
    numeric(effect.baseRate)
      + (attackStat - defenseLuck) * 0.01
      + numeric(effect.rateBonus)
      + numeric(attacker.statusPowerBonus)
      - numeric(resistance.resistancePoints)
      - numeric(defender.statusResistanceBonus),
    COMBAT_CONFIG.statusRateMinimum,
    COMBAT_CONFIG.statusRateMaximum
  );
  return statusResult(effect, roll(rng) < rate, rate, false);
}

export function resolveInstantDeath({
  defender = {},
  baseRate = 0,
  rateBonus = 0,
  rng = Math.random
} = {}) {
  const resistance = getResistance(defender, "instantDeath");
  if (resistance.immune || defender.isBoss) {
    return { success: false, rate: 0, immune: true };
  }
  const rate = clamp(
    numeric(baseRate)
      + numeric(rateBonus)
      - numeric(defender.luc) * COMBAT_CONFIG.instantDeathLuckMultiplier
      - numeric(resistance.resistancePoints)
      - numeric(defender.instantDeathResistance),
    COMBAT_CONFIG.instantDeathMinimum,
    COMBAT_CONFIG.instantDeathMaximum
  );
  return { success: roll(rng) < rate, rate, immune: false };
}

function getResistance(defender, statusId) {
  const resistance = defender.statusResistances?.[statusId];
  if (typeof resistance === "number") {
    return { resistancePoints: resistance / 100, immune: false };
  }
  return {
    resistancePoints: numeric(resistance?.resistancePoints ?? resistance?.resistance) / 100,
    immune: Boolean(resistance?.immune)
  };
}

function statusResult(effect, success, rate, immune) {
  return {
    statusId: effect.statusId,
    trigger: effect.trigger || "perAction",
    success,
    rate,
    immune
  };
}

function roll(rng) {
  const value = Number(rng?.());
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999999, value)) : 0;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
