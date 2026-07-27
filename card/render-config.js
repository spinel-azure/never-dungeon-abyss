export const CARD_RENDER_SIZES = Object.freeze({
  deck: Object.freeze({ width: 180, height: 260 }),
  list: Object.freeze({ width: 180, height: 260 }),
  detail: Object.freeze({ width: 360, height: 540 }),
  gallery: Object.freeze({ width: 360, height: 540 }),
});

export const ICON_RENDER_SIZES = Object.freeze([64, 96, 128, 192, 256, 320]);

export const RENDER_CACHE_LIMITS = Object.freeze({
  icons: 128,
  cards: 96,
});

export const RENDER_DESIGN_REVISION = "card-system-2026-07-17-d";
export const GALLERY_MAX_FPS = 30;

export function normalizeIconRenderSize(requestedSize) {
  const safeSize = Math.max(1, Number(requestedSize) || ICON_RENDER_SIZES[0]);
  return ICON_RENDER_SIZES.reduce((nearest, candidate) => (
    Math.abs(candidate - safeSize) < Math.abs(nearest - safeSize) ? candidate : nearest
  ));
}
