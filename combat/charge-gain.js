import { hasCardEffect, getCardById } from "../data/cards.js";

// Preserve fractional gains until the gauge reaches its cap. Direct assignments
// (fill, reset, and cooldown handling) deliberately do not pass through here.
export function getChargeGain(character, gain) {
  const equipped = hasCardEffect(character?.cards?.deckSlots, "charge_gain_up");
  const bonus = equipped ? getCardById("legendary_fighting_spirit").effectValue : 0;
  return Math.max(0, Number(gain) || 0) * (1 + bonus);
}
