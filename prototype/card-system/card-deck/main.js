import { CARD_DISPLAY_MODES } from "../data/cards.js?v=20260717-3";
import { getAllCards, getCardById, getCardViewData } from "../data/card-registry.js?v=20260717-3";
import { drawCard } from "../renderers/card-renderer.js?v=20260717-4";
import { clearCardCache } from "../renderers/cache/render-cache.js";
import { bindVirtualControls } from "../../dungeon-command-menu/controls/virtual-controls.js";
import {
  calculateDeckCost,
  normalizeDeckSlots,
  removeCardFromDeck,
  setCardInDeck,
  validateCardPlacement,
} from "./deck-model.js";

const DECK_CONFIG = Object.freeze({
  maxCards: 6,
  maxCost: 48,
  cardWidth: 180,
  cardHeight: 260,
  flipDuration: 480,
  storageKey: "nde.card-system.deck.v1",
});

const INITIAL_DECK = Object.freeze([
  "zodiac_capricorn",
  "zodiac_aquarius",
  "zodiac_pisces",
  "zodiac_aries",
  null,
  null,
]);

const MODEL_OPTIONS = Object.freeze({
  maxCards: DECK_CONFIG.maxCards,
  maxCost: DECK_CONFIG.maxCost,
  getCardById,
});

const state = {
  cursorIndex: 3,
  confirmedIndex: null,
  revealedSlots: new Set(),
  flippingIndex: null,
  pickerSlotIndex: null,
  rarityFilter: "ALL",
  confirmationTimer: null,
  flipTimer: null,
};

const elements = {
  grid: document.querySelector("#deckGrid"),
  deckCost: document.querySelector("#deckCost"),
  totalCost: document.querySelector("#totalCost"),
  status: document.querySelector("#statusMessage"),
  actions: [...document.querySelectorAll("[data-action]")],
  picker: document.querySelector("#cardPicker"),
  pickerGrid: document.querySelector("#cardPickerGrid"),
  pickerMessage: document.querySelector("#cardPickerMessage"),
  pickerEmpty: document.querySelector("#cardPickerEmpty"),
  pickerClose: document.querySelector("#cardPickerClose"),
  pickerBackdrop: document.querySelector("[data-picker-close]"),
  rarityFilters: [...document.querySelectorAll("[data-rarity-filter]")],
};

const allCards = [...getAllCards()].sort((left, right) => (
  right.rarity.localeCompare(left.rarity) || left.name.localeCompare(right.name)
));

function getOwnedCards() {
  // 所持カードシステム実装後は、この返却元だけを差し替える。
  return allCards;
}

function loadDeck() {
  try {
    const stored = JSON.parse(localStorage.getItem(DECK_CONFIG.storageKey));
    if (stored?.version === 1) {
      return [...normalizeDeckSlots(stored.slots, MODEL_OPTIONS)];
    }
  } catch (error) {
    console.warn("Could not load the saved card deck.", error);
  }
  return [...normalizeDeckSlots(INITIAL_DECK, MODEL_OPTIONS)];
}

let deckSlots = loadDeck();

function saveDeck() {
  try {
    localStorage.setItem(DECK_CONFIG.storageKey, JSON.stringify({
      version: 1,
      slots: deckSlots,
    }));
  } catch (error) {
    console.warn("Could not save the card deck.", error);
  }
}

function setStatus(message) {
  elements.status.textContent = message;
}

function getSelectedCardId() {
  return deckSlots[state.cursorIndex] ?? null;
}

function updateSummary() {
  elements.deckCost.value = String(calculateDeckCost(deckSlots, getCardById));
  elements.totalCost.value = String(DECK_CONFIG.maxCost);
}

function getSlotLabel(card, index) {
  return card
    ? `スロット${index + 1}: ${card.name}、コスト${card.cost}`
    : `スロット${index + 1}: カードを追加`;
}

function createSlot(cardId, index) {
  const card = getCardById(cardId);
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = `card-slot${card ? "" : " is-empty"}`;
  slot.dataset.slotIndex = String(index);
  slot.setAttribute("aria-label", getSlotLabel(card, index));

  if (card) {
    const canvas = document.createElement("canvas");
    canvas.width = DECK_CONFIG.cardWidth;
    canvas.height = DECK_CONFIG.cardHeight;
    canvas.dataset.cardId = card.id;
    canvas.dataset.slotIndex = String(index);
    slot.append(canvas);
  } else {
    const label = document.createElement("span");
    label.textContent = "ADD CARD";
    slot.append(label);
  }

  slot.addEventListener("click", () => handleSlotPress(index));
  return slot;
}

function updateCursor() {
  const slots = [...elements.grid.querySelectorAll(".card-slot")];
  slots.forEach((slot, index) => {
    slot.classList.toggle("is-cursor", index === state.cursorIndex);
    slot.classList.toggle("is-confirmed", index === state.confirmedIndex);
    slot.setAttribute("aria-current", index === state.cursorIndex ? "true" : "false");
    slot.setAttribute("aria-pressed", String(state.revealedSlots.has(index)));
  });

  const addButton = elements.actions.find((button) => button.dataset.action === "add");
  const removeButton = elements.actions.find((button) => button.dataset.action === "remove");
  if (addButton) addButton.disabled = !deckSlots.includes(null);
  if (removeButton) removeButton.disabled = !getSelectedCardId();
}

function drawCards() {
  const canvases = elements.grid.querySelectorAll("canvas[data-card-id]");
  canvases.forEach((canvas) => {
    const slotIndex = Number(canvas.dataset.slotIndex);
    const card = getCardViewData(canvas.dataset.cardId);
    if (!card) return;
    drawCard(
      canvas.getContext("2d"),
      card,
      { x: 0, y: 0, width: canvas.width, height: canvas.height, radius: 8 },
      {
        mode: CARD_DISPLAY_MODES.DECK,
        face: state.revealedSlots.has(slotIndex) ? "back" : "front",
        themeId: "default",
        variant: "deck",
        glow: true,
      },
    );
  });
}

function renderDeck() {
  elements.grid.replaceChildren(...deckSlots.map(createSlot));
  updateSummary();
  updateCursor();
  drawCards();
}

function closePicker() {
  elements.picker.hidden = true;
  state.pickerSlotIndex = null;
}

function createPickerCard(card) {
  const targetIndex = state.pickerSlotIndex;
  const validation = validateCardPlacement(deckSlots, targetIndex, card.id, MODEL_OPTIONS);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "picker-card";
  button.dataset.cardId = card.id;
  button.disabled = !validation.allowed;
  button.setAttribute(
    "aria-label",
    validation.allowed
      ? `${card.name}をデッキへ追加、コスト${card.cost}`
      : `${card.name}は追加不可、${validation.reason}`,
  );

  const canvas = document.createElement("canvas");
  canvas.width = DECK_CONFIG.cardWidth;
  canvas.height = DECK_CONFIG.cardHeight;
  canvas.dataset.pickerCardId = card.id;

  const label = document.createElement("span");
  label.textContent = `${card.rarity} / ${card.name} / COST ${card.cost}`;
  button.append(canvas, label);
  if (validation.allowed) button.addEventListener("click", () => setCardFromPicker(card.id));
  return button;
}

function drawPickerCards() {
  const canvases = elements.pickerGrid.querySelectorAll("canvas[data-picker-card-id]");
  canvases.forEach((canvas) => {
    const card = getCardViewData(canvas.dataset.pickerCardId);
    if (!card) return;
    drawCard(
      canvas.getContext("2d"),
      card,
      { x: 0, y: 0, width: canvas.width, height: canvas.height, radius: 8 },
      {
        mode: CARD_DISPLAY_MODES.DECK,
        face: "front",
        themeId: "default",
        variant: "picker",
        glow: true,
      },
    );
  });
}

function getFilteredOwnedCards() {
  const ownedCards = getOwnedCards();
  if (state.rarityFilter === "ALL") return ownedCards;
  return ownedCards.filter((card) => card.rarity === state.rarityFilter);
}

function updateRarityFilters() {
  elements.rarityFilters.forEach((button) => {
    const active = button.dataset.rarityFilter === state.rarityFilter;
    button.setAttribute("aria-pressed", String(active));
  });
}

function getEmptyFilterMessage() {
  return state.rarityFilter === "ALL"
    ? "NO CARDS OWNED"
    : `NO [ ${state.rarityFilter} ] CARDS OWNED`;
}

function renderPickerCards() {
  const cards = getFilteredOwnedCards();
  const validations = cards.map((card) => (
    validateCardPlacement(deckSlots, state.pickerSlotIndex, card.id, MODEL_OPTIONS)
  ));
  const availableCards = validations.filter((validation) => validation.allowed).length;
  updateRarityFilters();
  elements.pickerEmpty.hidden = cards.length > 0;
  elements.pickerEmpty.textContent = cards.length > 0 ? "" : getEmptyFilterMessage();
  if (cards.length === 0) {
    elements.pickerMessage.textContent = "SELECT ANOTHER RARITY";
  } else if (availableCards === 0) {
    const label = state.rarityFilter === "ALL" ? "" : `[ ${state.rarityFilter} ] `;
    elements.pickerMessage.textContent = `NO ${label}CARDS AVAILABLE`;
  } else {
    elements.pickerMessage.textContent = `SLOT ${state.pickerSlotIndex + 1} / SELECT A CARD`;
  }
  elements.pickerGrid.replaceChildren(...cards.map(createPickerCard));
  drawPickerCards();
}

function setRarityFilter(rarityId) {
  if (state.rarityFilter === rarityId) return;
  state.rarityFilter = rarityId;
  renderPickerCards();

  const enabledCard = elements.pickerGrid.querySelector(".picker-card:not(:disabled)");
  enabledCard?.focus();
}

function openPicker(preferredIndex = state.cursorIndex) {
  const targetIndex = deckSlots[preferredIndex] ? deckSlots.indexOf(null) : preferredIndex;
  if (targetIndex < 0) {
    setStatus("DECK IS FULL");
    return;
  }

  state.pickerSlotIndex = targetIndex;
  state.cursorIndex = targetIndex;
  state.revealedSlots.clear();
  elements.pickerMessage.textContent = `SLOT ${targetIndex + 1} / SELECT A CARD`;
  elements.picker.hidden = false;
  updateCursor();
  renderPickerCards();

  const enabledCard = elements.pickerGrid.querySelector(".picker-card:not(:disabled)");
  enabledCard?.focus();
}

function setCardFromPicker(cardId) {
  const targetIndex = state.pickerSlotIndex;
  const result = setCardInDeck(deckSlots, targetIndex, cardId, MODEL_OPTIONS);
  if (!result.allowed) {
    setStatus(result.reason);
    return;
  }

  deckSlots = [...result.slots];
  state.cursorIndex = targetIndex;
  state.confirmedIndex = targetIndex;
  state.revealedSlots.clear();
  saveDeck();
  closePicker();
  renderDeck();

  const card = getCardById(cardId);
  setStatus(`${card.name} SET / COST ${result.nextCost}`);
  window.clearTimeout(state.confirmationTimer);
  state.confirmationTimer = window.setTimeout(() => {
    state.confirmedIndex = null;
    updateCursor();
  }, 650);
}

function removeSelectedCard() {
  const cardId = getSelectedCardId();
  const result = removeCardFromDeck(deckSlots, state.cursorIndex, MODEL_OPTIONS);
  if (!result.removed) {
    setStatus(result.reason);
    return;
  }

  deckSlots = [...result.slots];
  state.confirmedIndex = null;
  state.revealedSlots.delete(state.cursorIndex);
  saveDeck();
  renderDeck();
  setStatus(`${getCardById(cardId)?.name ?? "CARD"} REMOVED`);
}

function toggleCardFace(index) {
  if (state.flippingIndex !== null) return;
  const card = getCardViewData(deckSlots[index]);
  const slot = elements.grid.querySelectorAll(".card-slot")[index];
  const wasShowingDetails = state.revealedSlots.has(index);
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const duration = reduceMotion ? 0 : DECK_CONFIG.flipDuration;

  state.flippingIndex = index;
  state.confirmedIndex = index;
  slot.classList.add("is-flipping");
  setStatus(wasShowingDetails ? `${card.name} FRONT` : `${card.nameJa ?? card.name} / ${card.concept ?? card.effect?.nameJa}`);
  updateCursor();

  window.setTimeout(() => {
    if (wasShowingDetails) {
      state.revealedSlots.delete(index);
      state.confirmedIndex = null;
    } else {
      state.revealedSlots.add(index);
    }
    drawCards();
    updateCursor();
  }, duration / 2);

  window.clearTimeout(state.flipTimer);
  state.flipTimer = window.setTimeout(() => {
    slot.classList.remove("is-flipping");
    state.flippingIndex = null;
  }, duration);
}

function handleSlotPress(index) {
  if (state.cursorIndex === index) {
    if (deckSlots[index]) toggleCardFace(index);
    else openPicker(index);
    return;
  }

  state.cursorIndex = index;
  state.confirmedIndex = null;
  state.revealedSlots.clear();
  setStatus(deckSlots[index] ? getCardById(deckSlots[index]).name : "EMPTY SLOT");
  drawCards();
  updateCursor();
}

function handleAction(action) {
  if (action === "back" && !elements.picker.hidden) {
    closePicker();
    setStatus("CARD SELECTION CLOSED");
  } else if (action === "back") {
    const returnTarget = new URLSearchParams(location.search).get("return");
    if (returnTarget) location.href = returnTarget;
    else setStatus("BACK / NOT CONNECTED");
  } else if (action === "add") {
    openPicker();
  } else if (action === "remove") {
    removeSelectedCard();
  }
}

function moveDeckCursor(direction) {
  if (!elements.picker.hidden) {
    const cards = [...elements.pickerGrid.querySelectorAll(".picker-card:not(:disabled)")];
    if (!cards.length) return;
    const current = Math.max(0, cards.indexOf(document.activeElement));
    const columnCount = 3;
    const amount = direction === "left" ? -1 : direction === "right" ? 1 : direction === "up" ? -columnCount : columnCount;
    cards[(current + amount + cards.length) % cards.length].focus();
    return;
  }
  const row = Math.floor(state.cursorIndex / 3);
  const column = state.cursorIndex % 3;
  if (direction === "left") state.cursorIndex = row * 3 + (column + 2) % 3;
  if (direction === "right") state.cursorIndex = row * 3 + (column + 1) % 3;
  if (direction === "up" || direction === "down") state.cursorIndex = ((row + 1) % 2) * 3 + column;
  state.confirmedIndex = null;
  state.revealedSlots.clear();
  setStatus(deckSlots[state.cursorIndex] ? getCardById(deckSlots[state.cursorIndex]).name : "EMPTY SLOT");
  drawCards();
  updateCursor();
}

function confirmDeckSelection() {
  if (!elements.picker.hidden) {
    const focusedCard = document.activeElement?.closest?.(".picker-card:not(:disabled)");
    if (focusedCard) focusedCard.click();
    return;
  }
  handleSlotPress(state.cursorIndex);
}

function initialize() {
  renderDeck();
  elements.actions.forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
  elements.pickerClose.addEventListener("click", closePicker);
  elements.pickerBackdrop.addEventListener("click", closePicker);
  elements.rarityFilters.forEach((button) => {
    button.addEventListener("click", () => setRarityFilter(button.dataset.rarityFilter));
  });
  bindVirtualControls({ stick: document.querySelector("#virtualStick"), buttonA: document.querySelector("#buttonA"), buttonB: document.querySelector("#buttonB"), onDirection: moveDeckCursor, onConfirm: confirmDeckSelection, onCancel: () => handleAction("back") });
  window.addEventListener("keydown", (event) => {
    const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (directions[event.key]) { event.preventDefault(); moveDeckCursor(directions[event.key]); }
    if (["Enter", "x", "X"].includes(event.key)) { event.preventDefault(); confirmDeckSelection(); }
    if (["Escape", "z", "Z"].includes(event.key)) { event.preventDefault(); handleAction("back"); }
  });
  document.fonts?.ready.then(() => {
    clearCardCache();
    drawCards();
    if (!elements.picker.hidden) drawPickerCards();
  });
}

initialize();
