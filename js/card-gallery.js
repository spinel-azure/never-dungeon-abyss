import { CARD_DISPLAY_MODES, CARD_RARITIES } from "../card/card-display.js";
import { drawCard } from "../card/renderers/card-renderer.js";
import { GALLERY_MAX_FPS } from "../card/render-config.js";
import { CARDS } from "../data/cards.js";

const FILTERS = Object.freeze(["ALL", "C", "R", "SR", "L", "Z"]);
const FRAME_INTERVAL = 1000 / GALLERY_MAX_FPS;
const FLIP_DURATION = 480;
const SWIPE_MINIMUM_DISTANCE = 44;
const CARD_RECT = Object.freeze({ x: 16, y: 14, width: 328, height: 512, radius: 22 });

const gallery = {
  root: null,
  canvas: null,
  context: null,
  stage: null,
  heading: null,
  count: null,
  empty: null,
  filters: [],
  previous: null,
  next: null,
  getCharacter: () => null,
  playSe: () => {},
  onClose: () => {},
  active: false,
  filter: "ALL",
  cards: [],
  cardIndex: 0,
  face: "front",
  animationFrameId: null,
  lastDrawTime: Number.NEGATIVE_INFINITY,
  flipMiddleTimer: 0,
  flipEndTimer: 0,
  pointer: { x: 0.5, y: 0.45 },
  flashStartedAt: 0,
  gesture: { active: false, pointerId: null, startX: 0, startY: 0, lastX: 0, lastY: 0 }
};

export function getOwnedGalleryCards(cardState, filter = "ALL") {
  const counts = cardState?.ownedCardCounts || {};
  const cards = CARDS.filter(card => Number(counts[card.id]) > 0).map(card => ({
    ...card,
    footerText: card.footerText || card.nameJa || card.name,
    descriptionJa: card.descriptionJa || card.concept
  }));
  return filter === "ALL" ? cards : cards.filter(card => card.rarity === filter);
}

export function configureCardGallery({ root, getCharacter, playSe, onClose }) {
  gallery.root = root;
  gallery.canvas = root.querySelector("[data-card-gallery-canvas]");
  gallery.context = gallery.canvas.getContext("2d");
  gallery.stage = root.querySelector("[data-card-gallery-stage]");
  gallery.heading = root.querySelector("[data-card-gallery-heading]");
  gallery.count = root.querySelector("[data-card-gallery-count]");
  gallery.empty = root.querySelector("[data-card-gallery-empty]");
  gallery.filters = [...root.querySelectorAll("[data-card-gallery-filter]")];
  gallery.previous = root.querySelector('[data-card-gallery-nav="previous"]');
  gallery.next = root.querySelector('[data-card-gallery-nav="next"]');
  gallery.getCharacter = getCharacter;
  gallery.playSe = playSe;
  gallery.onClose = onClose;
  bindGalleryControls();
}

export function openCardGallery() {
  gallery.active = true;
  gallery.filter = "ALL";
  gallery.cardIndex = 0;
  gallery.face = "front";
  gallery.pointer = { x: 0.5, y: 0.45 };
  gallery.flashStartedAt = performance.now();
  refreshOwnedCards();
  updateGalleryInformation();
  drawGalleryCard(performance.now());
  startGalleryAnimation();
}

export function closeCardGallery() {
  gallery.active = false;
  stopGalleryAnimation();
  cancelCardFlip();
  gallery.gesture.active = false;
}

export function handleCardGalleryInput(action) {
  if (!gallery.active) return false;
  if (action === "cancel") {
    gallery.playSe("cancel");
    gallery.onClose();
    return true;
  }
  if (action === "left" || action === "right") {
    gallery.playSe("cursorMove");
    changeCard(action === "right" ? 1 : -1);
    return true;
  }
  if (action === "up" || action === "down") {
    gallery.playSe("cursorMove");
    const current = Math.max(0, FILTERS.indexOf(gallery.filter));
    setFilter(FILTERS[(current + (action === "down" ? 1 : FILTERS.length - 1)) % FILTERS.length]);
    return true;
  }
  if (action === "confirm") {
    gallery.playSe("confirm");
    flipCard();
    return true;
  }
  return true;
}

function ownedCards() {
  return getOwnedGalleryCards(gallery.getCharacter()?.cards, gallery.filter);
}

function refreshOwnedCards() {
  const cards = ownedCards();
  gallery.cards = cards;
  gallery.cardIndex = gallery.cards.length ? Math.min(gallery.cardIndex, gallery.cards.length - 1) : 0;
}

function currentCard() {
  return gallery.cards[gallery.cardIndex] || null;
}

function drawGalleryCard(time = 0) {
  const context = gallery.context;
  context.clearRect(0, 0, gallery.canvas.width, gallery.canvas.height);
  const card = currentCard();
  if (!card) return;
  drawCard(context, card, CARD_RECT, {
    mode: CARD_DISPLAY_MODES.GALLERY,
    face: gallery.face,
    time,
    themeId: "default",
    glow: true,
    pointer: gallery.pointer,
    flashStartedAt: gallery.flashStartedAt
  });
}

function animate(time) {
  gallery.animationFrameId = null;
  const elapsed = time - gallery.lastDrawTime;
  if (!Number.isFinite(gallery.lastDrawTime) || elapsed >= FRAME_INTERVAL) {
    drawGalleryCard(time);
    gallery.lastDrawTime = Number.isFinite(elapsed) ? time - (elapsed % FRAME_INTERVAL) : time;
  }
  if (gallery.active && !document.hidden) gallery.animationFrameId = requestAnimationFrame(animate);
}

function startGalleryAnimation() {
  if (gallery.animationFrameId !== null || document.hidden) return;
  gallery.lastDrawTime = Number.NEGATIVE_INFINITY;
  gallery.animationFrameId = requestAnimationFrame(animate);
}

function stopGalleryAnimation() {
  if (gallery.animationFrameId === null) return;
  cancelAnimationFrame(gallery.animationFrameId);
  gallery.animationFrameId = null;
}

function updateGalleryInformation() {
  const card = currentCard();
  const ownedCount = card ? Number(gallery.getCharacter()?.cards?.ownedCardCounts?.[card.id]) || 0 : 0;
  gallery.stage.classList.toggle("has-card", Boolean(card));
  gallery.empty.hidden = Boolean(card);
  gallery.previous.disabled = gallery.cards.length < 2;
  gallery.next.disabled = gallery.cards.length < 2;
  gallery.filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.cardGalleryFilter === gallery.filter)));
  if (card) {
    const rarityName = CARD_RARITIES[card.rarity]?.name || card.rarity;
    gallery.heading.textContent = `${rarityName} / ${card.nameJa}`;
    gallery.count.textContent = `${gallery.cardIndex + 1}/${gallery.cards.length}　所持数 ×${ownedCount}`;
    gallery.canvas.setAttribute("aria-label", `レアリティ${card.rarity}、${card.nameJa}、${gallery.face === "back" ? "詳細面" : "表面"}`);
  } else {
    const label = gallery.filter === "ALL" ? "" : `${gallery.filter} `;
    gallery.heading.textContent = `NO ${label}CARDS OWNED`;
    gallery.count.textContent = `所持カード 0/${CARDS.length}`;
    gallery.empty.textContent = `NO ${label}CARDS OWNED`;
    gallery.canvas.setAttribute("aria-label", gallery.empty.textContent);
  }
}

function changeCard(offset) {
  if (gallery.cards.length < 2) return;
  cancelCardFlip();
  gallery.cardIndex = (gallery.cardIndex + offset + gallery.cards.length) % gallery.cards.length;
  gallery.face = "front";
  gallery.flashStartedAt = performance.now();
  updateGalleryInformation();
  drawGalleryCard(performance.now());
}

function setFilter(filter) {
  if (!FILTERS.includes(filter)) return;
  cancelCardFlip();
  gallery.filter = filter;
  gallery.cardIndex = 0;
  gallery.face = "front";
  gallery.flashStartedAt = performance.now();
  refreshOwnedCards();
  updateGalleryInformation();
  drawGalleryCard(performance.now());
}

function cancelCardFlip() {
  clearTimeout(gallery.flipMiddleTimer);
  clearTimeout(gallery.flipEndTimer);
  gallery.flipMiddleTimer = 0;
  gallery.flipEndTimer = 0;
  gallery.stage.classList.remove("is-flipping");
}

function flipCard() {
  if (!currentCard() || gallery.flipEndTimer) return;
  const duration = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 0 : FLIP_DURATION;
  if (!duration) {
    gallery.face = gallery.face === "front" ? "back" : "front";
    updateGalleryInformation();
    drawGalleryCard(performance.now());
    return;
  }
  gallery.stage.classList.add("is-flipping");
  gallery.flipMiddleTimer = setTimeout(() => {
    gallery.face = gallery.face === "front" ? "back" : "front";
    updateGalleryInformation();
    drawGalleryCard(performance.now());
  }, duration / 2);
  gallery.flipEndTimer = setTimeout(() => {
    gallery.flipMiddleTimer = 0;
    gallery.flipEndTimer = 0;
    gallery.stage.classList.remove("is-flipping");
  }, duration);
}

function updatePointer(event) {
  const bounds = gallery.canvas.getBoundingClientRect();
  gallery.pointer.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  gallery.pointer.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
}

function bindGalleryControls() {
  gallery.filters.forEach(button => button.addEventListener("click", () => {
    gallery.playSe("cursorMove");
    setFilter(button.dataset.cardGalleryFilter);
  }));
  gallery.previous.addEventListener("click", () => { gallery.playSe("cursorMove"); changeCard(-1); });
  gallery.next.addEventListener("click", () => { gallery.playSe("cursorMove"); changeCard(1); });
  gallery.canvas.addEventListener("pointerdown", event => {
    if (!currentCard()) return;
    updatePointer(event);
    Object.assign(gallery.gesture, { active: true, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY });
    try {
      gallery.canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional on older mobile browsers.
    }
  });
  gallery.canvas.addEventListener("pointermove", event => {
    updatePointer(event);
    if (gallery.gesture.active && event.pointerId === gallery.gesture.pointerId) {
      gallery.gesture.lastX = event.clientX;
      gallery.gesture.lastY = event.clientY;
    }
  });
  gallery.canvas.addEventListener("pointerup", event => {
    if (!gallery.gesture.active || event.pointerId !== gallery.gesture.pointerId) return;
    gallery.gesture.lastX = event.clientX;
    gallery.gesture.lastY = event.clientY;
    const deltaX = gallery.gesture.lastX - gallery.gesture.startX;
    const deltaY = gallery.gesture.lastY - gallery.gesture.startY;
    const swipeDistance = Math.max(SWIPE_MINIMUM_DISTANCE, gallery.canvas.getBoundingClientRect().width * .16);
    const swipe = Math.abs(deltaX) >= swipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    const tap = Math.hypot(deltaX, deltaY) < 14;
    gallery.gesture.active = false;
    if (swipe) { gallery.playSe("cursorMove"); changeCard(deltaX < 0 ? 1 : -1); }
    else if (tap) { gallery.playSe("confirm"); flipCard(); }
  });
  gallery.canvas.addEventListener("pointercancel", () => { gallery.gesture.active = false; });
  document.addEventListener("visibilitychange", () => {
    if (!gallery.active) return;
    if (document.hidden) stopGalleryAnimation();
    else startGalleryAnimation();
  });
}
