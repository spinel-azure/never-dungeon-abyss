import { hasCardEffect } from "./cards.js";

export const TAURUS_DEF_PER_TEN_FLOORS = 3;
export const TAURUS_DEF_BONUS_MAXIMUM = 60;

export function getTaurusDepthDefBonus(deckSlots, { location = "town", depth = 0 } = {}) {
  if (location !== "dungeon" || !hasCardEffect(deckSlots, "zodiac_taurus")) return 0;
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  return Math.min(TAURUS_DEF_BONUS_MAXIMUM, Math.floor(floor / 10) * TAURUS_DEF_PER_TEN_FLOORS);
}

export function applyTaurusDepthBonus(character, context = {}) {
  if (!character) return character;
  const bonus = getTaurusDepthDefBonus(character.cards?.deckSlots, context);
  return {
    ...character,
    cardStatBonuses: {
      ...(character.cardStatBonuses || {}),
      def: (Number(character.cardStatBonuses?.def) || 0) + bonus
    },
    taurusDepthDefBonus: bonus
  };
}
