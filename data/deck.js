import { getCardById } from "./cards.js";

export const DECK_SLOT_COUNT = 6;

export function createInitialCardState() {
  return {
    ownedCardIds: [],
    ownedCardCounts: {},
    deckSlots: Array(DECK_SLOT_COUNT).fill(null)
  };
}

export function calculateDeckCost(slots = []) {
  return slots.reduce((total, cardId) => total + (getCardById(cardId)?.cost || 0), 0);
}

export function getOwnedCardCount(cardState, cardId) {
  return Math.max(0, Math.floor(Number(cardState?.ownedCardCounts?.[cardId]) || 0));
}

export function normalizeCardState(candidate, maxCost = 3) {
  const ownedCardCounts = {};
  if (candidate?.ownedCardCounts && typeof candidate.ownedCardCounts === "object") {
    Object.entries(candidate.ownedCardCounts).forEach(([cardId, count]) => {
      const card = getCardById(cardId);
      const normalized = Math.max(0, Math.min(card?.maxOwned || 0, Math.floor(Number(count) || 0)));
      if (card && normalized > 0) ownedCardCounts[card.id] = normalized;
    });
  }
  if (Array.isArray(candidate?.ownedCardIds)) {
    candidate.ownedCardIds.forEach(cardId => {
      const card = getCardById(cardId);
      if (card && !ownedCardCounts[card.id]) ownedCardCounts[card.id] = 1;
    });
  }

  const ownedCardIds = Object.keys(ownedCardCounts);
  const deckSlots = Array(DECK_SLOT_COUNT).fill(null);
  const copyCounts = new Map();
  let cost = 0;
  if (Array.isArray(candidate?.deckSlots)) {
    candidate.deckSlots.slice(0, DECK_SLOT_COUNT).forEach((cardId, index) => {
      const card = getCardById(cardId);
      if (!card) return;
      const copies = copyCounts.get(card.id) || 0;
      const allowedCopies = Math.min(card.maxCopies, ownedCardCounts[card.id] || 0);
      if (copies >= allowedCopies || cost + card.cost > maxCost) return;
      deckSlots[index] = card.id;
      copyCounts.set(card.id, copies + 1);
      cost += card.cost;
    });
  }
  return { ownedCardIds, ownedCardCounts, deckSlots };
}

export function grantCard(cardState, cardId, amount = 1, maxCost = 3) {
  const source = normalizeCardState(cardState, maxCost);
  const card = getCardById(cardId);
  if (!card) return { cards: source, gained: 0 };
  const current = getOwnedCardCount(source, card.id);
  const nextCount = Math.min(card.maxOwned, current + Math.max(0, Math.floor(Number(amount) || 0)));
  const gained = nextCount - current;
  const ownedCardCounts = { ...source.ownedCardCounts };
  if (nextCount > 0) ownedCardCounts[card.id] = nextCount;
  return {
    cards: normalizeCardState({ ...source, ownedCardCounts }, maxCost),
    gained
  };
}

export function setDeckSlot(cardState, slotIndex, cardId, maxCost = 3) {
  const source = normalizeCardState(cardState, maxCost);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= DECK_SLOT_COUNT) return source;
  const deckSlots = [...source.deckSlots];
  if (!cardId) {
    deckSlots[slotIndex] = null;
    return { ...source, deckSlots };
  }
  const card = getCardById(cardId);
  if (!card) return source;
  const otherCopies = deckSlots.filter((id, index) => index !== slotIndex && id === card.id).length;
  if (otherCopies >= Math.min(card.maxCopies, getOwnedCardCount(source, card.id))) return source;
  const currentCost = getCardById(deckSlots[slotIndex])?.cost || 0;
  if (calculateDeckCost(deckSlots) - currentCost + card.cost > maxCost) return source;
  deckSlots[slotIndex] = card.id;
  return { ...source, deckSlots };
}
