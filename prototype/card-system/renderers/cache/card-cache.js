import { RENDER_CACHE_LIMITS, RENDER_DESIGN_REVISION } from "../render-config.js";
import { createRenderCanvas, readLruEntry, writeLruEntry } from "./cache-utils.js";

const cardCache = new Map();
const statistics = { hits: 0, misses: 0, evictions: 0 };

function createCardCacheKey(card, width, height, options) {
  return [
    RENDER_DESIGN_REVISION,
    card.id,
    width,
    height,
    options.mode ?? "deck",
    card.rarity,
    card.cost,
    card.iconId ?? "no-icon",
    card.effectId ?? "no-effect",
    card.version ?? "v1",
    card.footerText ?? card.name ?? "",
    options.themeId ?? "default",
    options.variant ?? "default",
    options.glow === false ? "no-glow" : "glow",
    options.face ?? "front",
  ].join(":");
}

export function getCachedCard(card, width, height, options, drawUncached) {
  const renderWidth = Math.max(1, Math.ceil(width));
  const renderHeight = Math.max(1, Math.ceil(height));
  const cacheKey = createCardCacheKey(card, renderWidth, renderHeight, options);
  const cached = readLruEntry(cardCache, cacheKey);
  if (cached) {
    statistics.hits += 1;
    return cached;
  }

  statistics.misses += 1;
  const canvas = createRenderCanvas(renderWidth, renderHeight);
  const cacheContext = canvas?.getContext("2d");
  if (!cacheContext) return null;

  const localRect = {
    x: 0,
    y: 0,
    width: renderWidth,
    height: renderHeight,
    radius: options.radius ?? 18,
  };
  drawUncached(cacheContext, card, localRect, { ...options, cache: false, time: 0 });
  statistics.evictions += writeLruEntry(
    cardCache,
    cacheKey,
    canvas,
    RENDER_CACHE_LIMITS.cards,
  );
  return canvas;
}

export function clearCardCache() {
  cardCache.clear();
  statistics.hits = 0;
  statistics.misses = 0;
  statistics.evictions = 0;
}

export function getCardCacheStats() {
  return Object.freeze({
    entries: cardCache.size,
    maximumEntries: RENDER_CACHE_LIMITS.cards,
    hits: statistics.hits,
    misses: statistics.misses,
    evictions: statistics.evictions,
  });
}
