import { applyCardVitalMultipliers } from "./cards.js";

// Equipment base-rate additions are not amplified by card multipliers.
export function calculateMaxVital(growth, key, equipment = {}, cards = {}, deckSlots = []) {
  const base = key === "maxHp" ? growth.hp : growth.sp;
  const rateKey = key === "maxHp" ? "baseMaxHpRate" : "baseMaxSpRate";
  const flat = source => Math.max(0, Math.floor(Number(source[key]) || 0));
  return applyCardVitalMultipliers(deckSlots, key, base + flat(equipment) + flat(cards))
    + Math.floor(base * Math.max(0, Number(equipment[rateKey]) || 0));
}
