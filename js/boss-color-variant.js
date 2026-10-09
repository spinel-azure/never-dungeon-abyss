import {streamV1} from './special-map/random-v1.js';
import {KARTE_BOSS_IMAGES} from '../data/karte-boss-images.js';
import {KARTE_SPECIAL_BOSSES} from '../data/karte-special-bosses.js';
import {SPECIAL_MAP_THEMES} from '../data/special-map-themes.js';

export const BOSS_VARIANT_VERSION = 2;
export const BOSS_VARIANT_SIZE = 600;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0))
    : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / (1 - Math.abs(2 * l - 1)), l];
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const rgb = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x]
    : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
  return rgb.map(v => Math.round((v + m) * 255));
}

export function computeBossVariantAdjustments({bossId, level, seed, rarity} = {}) {
  if (typeof bossId !== 'string' || !bossId || !Number.isInteger(level) || level < 1 || level > 100
      || !Number.isInteger(seed) || seed < 0 || seed > 65535 || !['WHITE','SILVER','GOLD'].includes(rarity)) {
    throw new RangeError('Invalid boss variant input');
  }
  const roll = purpose => streamV1('special-map-v2', seed,
    JSON.stringify(['boss-variant', BOSS_VARIANT_VERSION, bossId, purpose]))() / 4294967296 * 2 - 1;
  const strength = (level - 1) / 99;
  const rare = rarity === 'WHITE' ? [0,0,0,.65] : rarity === 'SILVER' ? [-3,-.07,.025,1] : [3,.12,.02,1];
  // Higher map levels rotate farther from the original; seed chooses direction.
  return Object.freeze({
    hueShift: (roll('hue') < 0 ? -1 : 1) * (8 + 142 * strength) + rare[0],
    saturationScale: clamp(1 + roll('saturation') * .25 * strength + rare[1], .75, 1.4),
    lightnessOffset: clamp(roll('lightness') * .035 * strength * rare[3] + rare[2]
      - Math.max(0, level - 60) / 40 * .025, -.06, .06),
  });
}

// Mutates only the provided working ImageData, never the source image.
export function applyBossVariantPixels(data, adjustments) {
  const {hueShift, saturationScale, lightnessOffset} = adjustments;
  if (!(data instanceof Uint8ClampedArray) || data.length % 4
      || ![hueShift,saturationScale,lightnessOffset].every(Number.isFinite)) throw new TypeError('Invalid pixels/adjustments');
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i+3]) continue;
    const [h,s,l] = rgbToHsl(data[i],data[i+1],data[i+2]);
    // Preserve outlines exactly; fade corrections into colored midtones.
    const protection = clamp((l - .08) / .18, 0, 1) * clamp(s / .2, 0, 1);
    if (!protection) continue;
    const rgb = hslToRgb(h + clamp(hueShift,-180,180) * protection,
      s * (1 + (clamp(saturationScale,.75,1.4) - 1) * protection),
      l + clamp(lightnessOffset,-.06,.06) * protection);
    data[i] = rgb[0]; data[i+1] = rgb[1]; data[i+2] = rgb[2];
  }
  return data;
}

export function renderBossVariant(image, adjustments, createCanvas = () => document.createElement('canvas')) {
  const width = image.naturalWidth ?? image.width, height = image.naturalHeight ?? image.height;
  if (![BOSS_VARIANT_SIZE,900].includes(width) || height !== BOSS_VARIANT_SIZE) throw new RangeError('Expected 600×600 or 900×600 image');
  const canvas = createCanvas();
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height);
  applyBossVariantPixels(pixels.data, adjustments);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export function createBossVariantCache({maxEntries = 8, createCanvas} = {}) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new RangeError('Invalid cache size');
  const cache = new Map();
  return {
    getBossVariantImage(options = {}) {
      if (!options || typeof options !== 'object') return undefined;
      const {image, bossId, imagePath, level, seed, rarity} = options;
      if (Object.hasOwn(KARTE_SPECIAL_BOSSES,bossId) || SPECIAL_MAP_THEMES.includes(options.themeId)) return image;
      const definition = KARTE_BOSS_IMAGES[bossId];
      // Explicit registry opt-in: ordinary abyss assets can never enter this path.
      if (!image || !definition?.allowColorVariant || definition.imagePath !== imagePath) return image;
      let adjustments;
      try { adjustments = computeBossVariantAdjustments(options); } catch { return image; }
      // Do not cache a not-yet-loaded image; a later preload completion may retry.
      if (![600,900].includes(image.naturalWidth ?? image.width) || (image.naturalHeight ?? image.height) !== 600) return image;
      const key = JSON.stringify([BOSS_VARIANT_VERSION,bossId,imagePath,level,seed,rarity]);
      if (cache.has(key)) {
        const result = cache.get(key); cache.delete(key); cache.set(key,result); return result;
      }
      let result;
      try { result = renderBossVariant(image, adjustments, createCanvas); }
      catch { result = image; } // Cache failures too: no per-frame CORS retry.
      cache.set(key,result);
      if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
      return result;
    },
    clearBossVariantCache() { cache.clear(); },
    get size() { return cache.size; },
  };
}

const defaultCache = createBossVariantCache();
export const getBossVariantImage = options => defaultCache.getBossVariantImage(options);
export const clearBossVariantCache = () => defaultCache.clearBossVariantCache();
// Await during a future battle's loading phase, BEFORE revealing its first frame.
// No combat hookup is made here. Failed image decoding remains the caller's usual
// missing-image case; variant failure never replaces the original with a blank.
export async function prepareBossVariantImage(options = {}) {
  if (!options || typeof options !== 'object') return undefined;
  try {
    if (typeof options.image?.decode === 'function') await options.image.decode();
    return getBossVariantImage(options);
  } catch { return options.image; }
}
// When scaling the returned CanvasImageSource, the destination renderer must also
// disable smoothing. Clear at session/battle end; eviction drops references only,
// so an already returned canvas stays valid while a renderer still holds it.
