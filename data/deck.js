import { getCardById } from "./cards.js";

export const DECK_SLOT_COUNT = 6;

export function createInitialCardState() {
  return {
    ownedCardIds: [],
    deckSlots: Array(DECK_SLOT_COUNT).fill(null)
  };
}

export function calculateDeckCost(slots = []) {
  return slots.reduce((total, cardId) => total + (getCardById(cardId)?.cost || 0), 0);
}

export function normalizeCardState(candidate, maxCost = 3) {
  const ownedCardIds = [...new Set(
    Array.isArray(candidate?.ownedCardIds)
      ? candidate.ownedCardIds.filter(cardId => Boolean(getCardById(cardId)))
      : []
  )];
  const owned = new Set(ownedCardIds);
  const deckSlots = Array(DECK_SLOT_COUNT).fill(null);
  const copyCounts = new Map();
  let cost = 0;

  if (Array.isArray(candidate?.deckSlots)) {
    candidate.deckSlots.slice(0, DECK_SLOT_COUNT).forEach((cardId, index) => {
      const card = getCardById(cardId);
      if (!card || !owned.has(card.id)) return;
      const copies = copyCounts.get(card.id) || 0;
      if (copies >= card.maxCopies || cost + card.cost > maxCost) return;
      deckSlots[index] = card.id;
      copyCounts.set(card.id, copies + 1);
      cost += card.cost;
    });
  }
  return { ownedCardIds, deckSlots };
}

export function setDeckSlot(cardState, slotIndex, cardId, maxCost = 3) {
  const source = normalizeCardState(cardState, maxCost);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= DECK_SLOT_COUNT) return source;
  const deckSlots = [...source.deckSlots];
  if (!cardId) {
    deckSlots[slotIndex] = null;
    return { ownedCardIds: source.ownedCardIds, deckSlots };
  }
  const card = getCardById(cardId);
  if (!card || !source.ownedCardIds.includes(card.id)) return source;
  const otherCopies = deckSlots.filter((id, index) => index !== slotIndex && id === card.id).length;
  if (otherCopies >= card.maxCopies) return source;
  const currentCost = getCardById(deckSlots[slotIndex])?.cost || 0;
  if (calculateDeckCost(deckSlots) - currentCost + card.cost > maxCost) return source;
  deckSlots[slotIndex] = card.id;
  return { ownedCardIds: source.ownedCardIds, deckSlots };
}
