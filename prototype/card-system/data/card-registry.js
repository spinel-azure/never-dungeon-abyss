import { CARDS } from "./cards.js?v=20260717-3";
import { getCardEffectById } from "./card-effects.js?v=20260717-3";

export function getCardById(cardId) {
  return Object.values(CARDS).find((card) => card.id === cardId) ?? null;
}

export function getAllCards() {
  return Object.freeze(Object.values(CARDS));
}

export function getCardsByRarity(rarityId) {
  return Object.freeze(Object.values(CARDS).filter((card) => card.rarity === rarityId));
}

export function getCardViewData(cardId) {
  const card = getCardById(cardId);
  if (!card) return null;
  return Object.freeze({
    ...card,
    effect: getCardEffectById(card.effectId),
  });
}
