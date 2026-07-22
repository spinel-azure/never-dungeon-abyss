function assertDeckOptions(options) {
  if (!Number.isInteger(options.maxCards) || options.maxCards <= 0) {
    throw new TypeError("maxCards must be a positive integer.");
  }
  if (!Number.isFinite(options.maxCost) || options.maxCost < 0) {
    throw new TypeError("maxCost must be a non-negative number.");
  }
  if (typeof options.getCardById !== "function") {
    throw new TypeError("getCardById must be a function.");
  }
}

export function calculateDeckCost(slots, getCardById) {
  return slots.reduce((total, cardId) => total + (getCardById(cardId)?.cost ?? 0), 0);
}

export function validateCardPlacement(slots, slotIndex, cardId, options) {
  assertDeckOptions(options);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= options.maxCards) {
    return Object.freeze({ allowed: false, reason: "INVALID SLOT" });
  }

  const card = options.getCardById(cardId);
  if (!card) return Object.freeze({ allowed: false, reason: "UNKNOWN CARD" });

  const maximumCopies = Number.isFinite(card.maxCopies) ? card.maxCopies : Number.POSITIVE_INFINITY;
  const copiesOutsideTarget = slots.reduce((count, currentId, index) => (
    index !== slotIndex && currentId === cardId ? count + 1 : count
  ), 0);
  if (copiesOutsideTarget >= maximumCopies) {
    return Object.freeze({ allowed: false, reason: "DUPLICATE CARD" });
  }

  const replacedCost = options.getCardById(slots[slotIndex])?.cost ?? 0;
  const nextCost = calculateDeckCost(slots, options.getCardById) - replacedCost + card.cost;
  if (nextCost > options.maxCost) {
    return Object.freeze({ allowed: false, reason: "COST LIMIT" });
  }

  return Object.freeze({ allowed: true, reason: "", nextCost });
}

export function setCardInDeck(slots, slotIndex, cardId, options) {
  const validation = validateCardPlacement(slots, slotIndex, cardId, options);
  if (!validation.allowed) return Object.freeze({ ...validation, slots });
  const nextSlots = slots.slice(0, options.maxCards);
  while (nextSlots.length < options.maxCards) nextSlots.push(null);
  nextSlots[slotIndex] = cardId;
  return Object.freeze({ ...validation, slots: Object.freeze(nextSlots) });
}

export function removeCardFromDeck(slots, slotIndex, options) {
  assertDeckOptions(options);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= options.maxCards) {
    return Object.freeze({ removed: false, reason: "INVALID SLOT", slots });
  }
  if (!slots[slotIndex]) {
    return Object.freeze({ removed: false, reason: "EMPTY SLOT", slots });
  }
  const nextSlots = slots.slice(0, options.maxCards);
  while (nextSlots.length < options.maxCards) nextSlots.push(null);
  nextSlots[slotIndex] = null;
  return Object.freeze({ removed: true, reason: "", slots: Object.freeze(nextSlots) });
}

export function normalizeDeckSlots(candidateSlots, options) {
  assertDeckOptions(options);
  let slots = Array(options.maxCards).fill(null);
  if (!Array.isArray(candidateSlots)) return Object.freeze(slots);

  candidateSlots.slice(0, options.maxCards).forEach((cardId, slotIndex) => {
    if (typeof cardId !== "string") return;
    const result = setCardInDeck(slots, slotIndex, cardId, options);
    if (result.allowed) slots = [...result.slots];
  });
  return Object.freeze(slots);
}
