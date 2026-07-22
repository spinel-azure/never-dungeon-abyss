export function createRenderCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return null;
}

export function readLruEntry(cache, key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

export function writeLruEntry(cache, key, value, maximumEntries) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);

  let evicted = 0;
  while (cache.size > maximumEntries) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
    evicted += 1;
  }
  return evicted;
}
