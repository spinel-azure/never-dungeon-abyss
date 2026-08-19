export const COMBAT_CONFIG = Object.freeze({
  statMaximum: 30,
  defenseMaximum: 60,
  strengthMultiplier: 0.5,
  intelligenceMultiplier: 0.5,
  defenseMultiplier: 0.5,
  physicalVarianceMin: 0.9,
  physicalVarianceMax: 1.1,
  spellVarianceMin: 0.9,
  spellVarianceMax: 1.1,
  physicalHitBase: 0.95,
  physicalHitStatStep: 0.01,
  physicalHitMinimum: 0.7,
  illusionHitMinimum: 0.5,
  physicalHitMaximum: 0.99,
  criticalRateBase: 0.03,
  criticalDexMultiplier: 0.005,
  criticalRateMaximum: 0.4,
  criticalMultiplier: 1.5,
  criticalDamageMinimum: 2,
  defensePenetrationMaximum: 0.75,
  statusRateMinimum: 0.05,
  statusRateMaximum: 0.95,
  environmentSaveLuckMultiplier: 0.015,
  environmentSaveMinimum: 0.05,
  environmentSaveMaximum: 0.9,
  instantDeathLuckMultiplier: 0.01,
  instantDeathMinimum: 0.05,
  instantDeathMaximum: 0.5,
  surpriseLuckMultiplier: 0.005,
  speedAgilityMultiplier: 2,
  speedRandomMaximum: 10
});

export const ELEMENT_MULTIPLIERS = Object.freeze({
  weak: 1.5,
  normal: 1,
  resistant: 0.5,
  immune: 0
});

export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function randomBetween(rng, minimum, maximum) {
  return minimum + clamp(Number(rng?.()) || 0, 0, 0.999999999999) * (maximum - minimum);
}
