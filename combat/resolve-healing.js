import { COMBAT_CONFIG } from "./combat-config.js";

export function resolveHealing({
  caster = {},
  target = {},
  healing = {}
} = {}) {
  const calculatedHealing = Math.max(
    0,
    Math.floor(
      numeric(healing.baseHealing)
      + numeric(caster.int) * numericOr(healing.intelligenceMultiplier, COMBAT_CONFIG.intelligenceMultiplier)
    )
  );
  const missingHp = Math.max(0, numeric(target.maxHp) - numeric(target.hp));
  const actualHealing = Math.min(calculatedHealing, missingHp);
  return {
    actionType: "healing",
    healingId: healing.id,
    calculatedHealing,
    actualHealing
  };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function numericOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
