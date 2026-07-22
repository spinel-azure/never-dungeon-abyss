import {
  normalizeIconRenderSize,
  RENDER_CACHE_LIMITS,
  RENDER_DESIGN_REVISION,
} from "../render-config.js?v=20260717-4";
import { getIconDrawer, getUnknownIconDrawer } from "../icon-registry.js?v=20260717-4";
import { createRenderCanvas, readLruEntry, writeLruEntry } from "./cache-utils.js";

const iconCache = new Map();
const warnedIconIds = new Set();
const statistics = { hits: 0, misses: 0, evictions: 0 };

function createIconCacheKey(iconId, renderSize, options) {
  return [
    RENDER_DESIGN_REVISION,
    iconId,
    renderSize,
    options.variant ?? "default",
    options.themeId ?? "default",
    options.glow === false ? "no-glow" : "glow",
    options.lineWidth ?? "default-line",
  ].join(":");
}

export function getCachedIcon(iconId, requestedSize, options = {}) {
  const renderSize = normalizeIconRenderSize(requestedSize);
  const cacheKey = createIconCacheKey(iconId, renderSize, options);
  const cached = readLruEntry(iconCache, cacheKey);
  if (cached) {
    statistics.hits += 1;
    return cached;
  }

  statistics.misses += 1;
  let drawer = getIconDrawer(iconId);
  if (!drawer) {
    drawer = getUnknownIconDrawer();
    if (!warnedIconIds.has(iconId)) {
      warnedIconIds.add(iconId);
      console.warn(`Unknown iconId: ${iconId}. Falling back to the question-mark icon.`);
    }
  }

  const canvas = createRenderCanvas(renderSize, renderSize);
  const cacheContext = canvas?.getContext("2d");
  if (!cacheContext) return null;

  drawer(cacheContext, renderSize / 2, renderSize / 2, renderSize, options);
  statistics.evictions += writeLruEntry(
    iconCache,
    cacheKey,
    canvas,
    RENDER_CACHE_LIMITS.icons,
  );
  return canvas;
}

export function drawCachedIcon(context, iconId, centerX, centerY, size, options = {}) {
  const cachedIcon = getCachedIcon(iconId, size, options);
  if (!cachedIcon) return false;
  context.drawImage(cachedIcon, centerX - size / 2, centerY - size / 2, size, size);
  return true;
}

export function clearIconCache() {
  iconCache.clear();
  warnedIconIds.clear();
  statistics.hits = 0;
  statistics.misses = 0;
  statistics.evictions = 0;
}

export function getIconCacheStats() {
  return Object.freeze({
    entries: iconCache.size,
    maximumEntries: RENDER_CACHE_LIMITS.icons,
    hits: statistics.hits,
    misses: statistics.misses,
    evictions: statistics.evictions,
  });
}
