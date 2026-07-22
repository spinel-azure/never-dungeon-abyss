import { CARD_DISPLAY_MODES, CARD_RARITIES, CARDS } from "../data/cards.js?v=20260717-3";
import { getAllCards, getCardViewData } from "../data/card-registry.js?v=20260717-3";
import { drawCard } from "../renderers/card-renderer.js?v=20260717-4";
import {
  clearAllRenderCaches,
  clearCardCache,
  getRenderCacheStats,
} from "../renderers/cache/render-cache.js";
import { createRenderDebugMonitor } from "../renderers/debug/render-debug.js";
import { GALLERY_MAX_FPS } from "../renderers/render-config.js";

const canvas = document.querySelector("#cardCanvas");
const context = canvas.getContext("2d");
const cardStage = document.querySelector("#cardStage");
const galleryModeButton = document.querySelector("#galleryModeButton");
const deckModeButton = document.querySelector("#deckModeButton");
const previousCardButton = document.querySelector("#previousCardButton");
const nextCardButton = document.querySelector("#nextCardButton");
const modeMessage = document.querySelector("#modeMessage");
const debugPanel = document.querySelector("#debugPanel");
const cardHeading = document.querySelector("#cardHeading");
const emptyGalleryMessage = document.querySelector("#emptyGalleryMessage");
const rarityFilterButtons = [...document.querySelectorAll("[data-rarity-filter]")];

const CARD_RECT = Object.freeze({
  x: 16,
  y: 14,
  width: 328,
  height: 512,
  radius: 22,
});

const FRAME_INTERVAL = 1000 / GALLERY_MAX_FPS;
const FLIP_DURATION = 480;
const SWIPE_MINIMUM_DISTANCE = 44;
const urlParameters = new URLSearchParams(globalThis.location?.search ?? "");
const debugEnabled = urlParameters.get("debug") === "1";
const debugMonitor = createRenderDebugMonitor(debugPanel, debugEnabled);
const allCards = Object.freeze(getAllCards().map((card) => getCardViewData(card.id)));

function getOwnedCards() {
  // 所持カードシステム実装後は、この返却元だけを差し替える。
  return allCards;
}

function resolveInitialSelection() {
  const requestedRarity = urlParameters.get("rarity")?.toUpperCase();
  const requestedCardValue = urlParameters.get("card");
  const requestedCardId = CARDS[requestedCardValue]?.id ?? requestedCardValue;
  const requestedCard = allCards.find((card) => card.id === requestedCardId) ?? null;
  let rarityFilter = requestedRarity && CARD_RARITIES[requestedRarity]
    ? requestedRarity
    : "ALL";

  if (requestedCard && rarityFilter !== "ALL" && requestedCard.rarity !== rarityFilter) {
    rarityFilter = requestedCard.rarity;
  }

  const cards = rarityFilter === "ALL"
    ? [...getOwnedCards()]
    : getOwnedCards().filter((card) => card.rarity === rarityFilter);
  const selectedIndex = requestedCard
    ? cards.findIndex((card) => card.id === requestedCard.id)
    : -1;

  return {
    rarityFilter,
    cards,
    cardIndex: selectedIndex >= 0 ? selectedIndex : 0,
  };
}

const initialSelection = resolveInitialSelection();
const state = {
  mode: CARD_DISPLAY_MODES.GALLERY,
  rarityFilter: initialSelection.rarityFilter,
  cards: initialSelection.cards,
  cardIndex: initialSelection.cardIndex,
  face: "front",
  isFlipping: false,
  flipMiddleTimer: null,
  flipEndTimer: null,
  animationFrameId: null,
  redrawFrameId: null,
  lastGalleryDrawTime: Number.NEGATIVE_INFINITY,
  flashStartedAt: Number.NEGATIVE_INFINITY,
  pointer: { x: 0.5, y: 0.45 },
  gesture: {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  },
};

function getCurrentCard() {
  return state.cards[state.cardIndex] ?? null;
}

function getCurrentTime() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function render(time = 0) {
  const drawStartedAt = getCurrentTime();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#040711";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const card = getCurrentCard();
  if (card) {
    drawCard(context, card, CARD_RECT, {
      mode: state.mode,
      face: state.face,
      time,
      themeId: "default",
      glow: true,
      pointer: state.pointer,
      flashStartedAt: state.flashStartedAt,
    });
  }

  const drawTime = getCurrentTime() - drawStartedAt;
  debugMonitor.recordFrame(time || drawStartedAt, drawTime, state.mode, getRenderCacheStats());
}

function updateUrl() {
  const card = getCurrentCard();
  const parameters = new URLSearchParams(globalThis.location.search);
  if (state.rarityFilter === "ALL") parameters.delete("rarity");
  else parameters.set("rarity", state.rarityFilter);
  if (card) parameters.set("card", card.id);
  else parameters.delete("card");
  const query = parameters.toString();
  history.replaceState(
    null,
    "",
    `${globalThis.location.pathname}${query ? `?${query}` : ""}${globalThis.location.hash}`,
  );
}

function updateCardInformation(updateAddress = false) {
  const card = getCurrentCard();
  const hasCard = Boolean(card);
  cardStage.classList.toggle("has-card", hasCard);
  emptyGalleryMessage.hidden = hasCard;
  previousCardButton.disabled = state.cards.length < 2;
  nextCardButton.disabled = state.cards.length < 2;

  rarityFilterButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.rarityFilter === state.rarityFilter),
    );
  });

  if (card) {
    const rarityName = CARD_RARITIES[card.rarity]?.name ?? card.rarity;
    cardHeading.textContent = `${rarityName} / ${card.name}`;
    canvas.setAttribute(
      "aria-label",
      `レアリティ${card.rarity}、${card.name}カード、${state.face === "back" ? "詳細面" : "表面"}`,
    );
    document.title = `NDE Card Gallery - ${card.name}`;
  } else {
    const filterLabel = state.rarityFilter === "ALL" ? "" : `[ ${state.rarityFilter} ] `;
    const message = `NO ${filterLabel}CARDS OWNED`;
    cardHeading.textContent = message;
    emptyGalleryMessage.textContent = message;
    canvas.setAttribute("aria-label", message);
    document.title = "NDE Card Gallery";
  }

  if (updateAddress) updateUrl();
}

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();
  state.pointer.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  state.pointer.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
}

function animate(time) {
  state.animationFrameId = null;
  const elapsed = time - state.lastGalleryDrawTime;
  if (!Number.isFinite(state.lastGalleryDrawTime) || elapsed >= FRAME_INTERVAL) {
    render(time);
    state.lastGalleryDrawTime = Number.isFinite(elapsed)
      ? time - (elapsed % FRAME_INTERVAL)
      : time;
  }
  if (state.mode === CARD_DISPLAY_MODES.GALLERY && !document.hidden) {
    state.animationFrameId = requestAnimationFrame(animate);
  }
}

function startGalleryAnimation() {
  if (state.animationFrameId === null && !document.hidden) {
    state.lastGalleryDrawTime = Number.NEGATIVE_INFINITY;
    state.animationFrameId = requestAnimationFrame(animate);
  }
}

function stopGalleryAnimation() {
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

function cancelStaticRedraw() {
  if (state.redrawFrameId !== null) {
    cancelAnimationFrame(state.redrawFrameId);
    state.redrawFrameId = null;
  }
}

function requestStaticRedraw() {
  if (state.redrawFrameId !== null) return;
  state.redrawFrameId = requestAnimationFrame((time) => {
    state.redrawFrameId = null;
    if (state.mode === CARD_DISPLAY_MODES.DECK) render(time);
  });
}

function requestCurrentRedraw() {
  if (state.mode === CARD_DISPLAY_MODES.DECK) requestStaticRedraw();
  else render(getCurrentTime());
}

function updateControls() {
  const galleryActive = state.mode === CARD_DISPLAY_MODES.GALLERY;
  galleryModeButton.setAttribute("aria-pressed", String(galleryActive));
  deckModeButton.setAttribute("aria-pressed", String(!galleryActive));
  const faceLabel = state.face === "back" ? " / CARD DETAILS" : "";
  modeMessage.textContent = galleryActive
    ? `GALLERY VIEW / EFFECT ON / MAX ${GALLERY_MAX_FPS} FPS${faceLabel}`
    : `DECK VIEW / STATIC CACHED RENDER${faceLabel}`;
}

function setMode(mode) {
  if (state.mode === mode) return;
  stopGalleryAnimation();
  cancelStaticRedraw();
  state.mode = mode;
  updateControls();

  if (mode === CARD_DISPLAY_MODES.GALLERY) {
    render(0);
    startGalleryAnimation();
  } else {
    requestStaticRedraw();
  }
}

function cancelCardFlip() {
  window.clearTimeout(state.flipMiddleTimer);
  window.clearTimeout(state.flipEndTimer);
  state.flipMiddleTimer = null;
  state.flipEndTimer = null;
  state.isFlipping = false;
  cardStage.classList.remove("is-flipping");
}

function flipCard() {
  if (!getCurrentCard() || state.isFlipping) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const duration = reduceMotion ? 0 : FLIP_DURATION;

  if (duration === 0) {
    state.face = state.face === "front" ? "back" : "front";
    state.flashStartedAt = getCurrentTime();
    updateCardInformation();
    updateControls();
    requestCurrentRedraw();
    return;
  }

  state.isFlipping = true;
  cardStage.classList.add("is-flipping");
  state.flipMiddleTimer = window.setTimeout(() => {
    state.face = state.face === "front" ? "back" : "front";
    state.flashStartedAt = getCurrentTime();
    updateCardInformation();
    updateControls();
    requestCurrentRedraw();
  }, duration / 2);
  state.flipEndTimer = window.setTimeout(() => {
    state.isFlipping = false;
    state.flipMiddleTimer = null;
    state.flipEndTimer = null;
    cardStage.classList.remove("is-flipping");
  }, duration);
}

function changeCard(offset) {
  if (state.cards.length < 2) return;
  cancelCardFlip();
  state.cardIndex = (state.cardIndex + offset + state.cards.length) % state.cards.length;
  state.face = "front";
  state.flashStartedAt = getCurrentTime();
  updateCardInformation(true);
  updateControls();
  requestCurrentRedraw();
}

function setRarityFilter(rarityId) {
  if (state.rarityFilter === rarityId) return;
  cancelCardFlip();
  state.rarityFilter = rarityId;
  state.cards = rarityId === "ALL"
    ? [...getOwnedCards()]
    : getOwnedCards().filter((card) => card.rarity === rarityId);
  state.cardIndex = 0;
  state.face = "front";
  state.flashStartedAt = getCurrentTime();
  updateCardInformation(true);
  updateControls();
  requestCurrentRedraw();
}

function beginGesture(event) {
  if (!getCurrentCard()) return;
  updatePointer(event);
  state.gesture.active = true;
  state.gesture.pointerId = event.pointerId;
  state.gesture.startX = event.clientX;
  state.gesture.startY = event.clientY;
  state.gesture.lastX = event.clientX;
  state.gesture.lastY = event.clientY;
  try {
    canvas.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture is optional on older Safari versions.
  }
}

function moveGesture(event) {
  updatePointer(event);
  if (!state.gesture.active || event.pointerId !== state.gesture.pointerId) return;
  state.gesture.lastX = event.clientX;
  state.gesture.lastY = event.clientY;
}

function resetGesture() {
  state.gesture.active = false;
  state.gesture.pointerId = null;
}

function endGesture(event) {
  if (!state.gesture.active || event.pointerId !== state.gesture.pointerId) return;
  state.gesture.lastX = event.clientX;
  state.gesture.lastY = event.clientY;
  const deltaX = state.gesture.lastX - state.gesture.startX;
  const deltaY = state.gesture.lastY - state.gesture.startY;
  const bounds = canvas.getBoundingClientRect();
  const swipeDistance = Math.max(SWIPE_MINIMUM_DISTANCE, bounds.width * 0.16);
  const horizontalSwipe = Math.abs(deltaX) >= swipeDistance
    && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
  const tap = Math.hypot(deltaX, deltaY) < 14;
  resetGesture();

  if (horizontalSwipe) {
    changeCard(deltaX < 0 ? 1 : -1);
  } else if (tap) {
    flipCard();
  }
}

function cancelGesture(event) {
  if (event.pointerId === state.gesture.pointerId) resetGesture();
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopGalleryAnimation();
    cancelStaticRedraw();
  } else if (state.mode === CARD_DISPLAY_MODES.GALLERY) {
    startGalleryAnimation();
  } else {
    requestStaticRedraw();
  }
}

galleryModeButton.addEventListener("click", () => setMode(CARD_DISPLAY_MODES.GALLERY));
deckModeButton.addEventListener("click", () => setMode(CARD_DISPLAY_MODES.DECK));
previousCardButton.addEventListener("click", () => changeCard(-1));
nextCardButton.addEventListener("click", () => changeCard(1));
rarityFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setRarityFilter(button.dataset.rarityFilter));
});
canvas.addEventListener("pointerdown", beginGesture);
canvas.addEventListener("pointermove", moveGesture);
canvas.addEventListener("pointerup", endGesture);
canvas.addEventListener("pointercancel", cancelGesture);
canvas.addEventListener("pointerleave", () => {
  if (!state.gesture.active) {
    state.pointer.x = 0.5;
    state.pointer.y = 0.45;
  }
});
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("pagehide", () => {
  stopGalleryAnimation();
  cancelStaticRedraw();
  cancelCardFlip();
});
window.addEventListener("resize", () => {
  clearAllRenderCaches();
  requestCurrentRedraw();
});

if (debugMonitor.enabled) {
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "c") return;
    clearAllRenderCaches();
    requestCurrentRedraw();
  });
}

updateCardInformation();
updateControls();
render(0);
document.fonts?.ready.then(() => {
  clearCardCache();
  requestCurrentRedraw();
});
startGalleryAnimation();
