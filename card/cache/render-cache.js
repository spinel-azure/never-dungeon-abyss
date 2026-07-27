import { clearCardCache, getCardCacheStats } from "./card-cache.js";
import { clearIconCache, getIconCacheStats } from "./icon-cache.js";

export function clearAllRenderCaches() {
  clearIconCache();
  clearCardCache();
}

export function getRenderCacheStats() {
  return Object.freeze({
    icons: getIconCacheStats(),
    cards: getCardCacheStats(),
  });
}

export { clearCardCache, clearIconCache, getCardCacheStats, getIconCacheStats };
