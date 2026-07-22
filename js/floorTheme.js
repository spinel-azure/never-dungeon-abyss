export const WALL_COLORS = Object.freeze(["default", "red", "blue", "green", "white", "black"]);
export const FLOOR_COLORS = Object.freeze(["default", "red", "blue", "green", "purple", "white"]);
export const FLOOR_THEME_MODES = Object.freeze({ FIXED: "fixed", RANDOM: "random" });

const settings = {
  mode: FLOOR_THEME_MODES.RANDOM,
  fixed: { wall: "default", floor: "default" },
  floorOverrides: new Map()
};

export function configureFloorThemes({ mode, fixed, floorOverrides } = {}) {
  if (Object.values(FLOOR_THEME_MODES).includes(mode)) settings.mode = mode;
  if (fixed) settings.fixed = normalizeTheme(fixed, settings.fixed);
  if (floorOverrides) {
    settings.floorOverrides.clear();
    Object.entries(floorOverrides).forEach(([depth, theme]) => setFloorThemeOverride(Number(depth), theme));
  }
}

export function setFloorThemeMode(mode, fixed = null) {
  configureFloorThemes({ mode, fixed });
}

export function setFloorThemeOverride(depth, theme) {
  if (!Number.isInteger(depth) || depth < 1) return false;
  settings.floorOverrides.set(depth, normalizeTheme(theme, settings.fixed));
  return true;
}

export function clearFloorThemeOverride(depth) {
  settings.floorOverrides.delete(depth);
}

export function resolveFloorTheme(depth, current = settings.fixed) {
  const override = settings.floorOverrides.get(depth);
  if (override) return { ...override, source: "floor" };
  if (settings.mode === FLOOR_THEME_MODES.FIXED) return { ...settings.fixed, source: "fixed" };
  return {
    wall: randomDifferent(WALL_COLORS, current.wall),
    floor: randomDifferent(FLOOR_COLORS, current.floor),
    source: "random"
  };
}

function normalizeTheme(theme = {}, fallback) {
  return {
    wall: WALL_COLORS.includes(theme.wall) ? theme.wall : fallback.wall,
    floor: FLOOR_COLORS.includes(theme.floor) ? theme.floor : fallback.floor
  };
}

function randomDifferent(colors, current) {
  const candidates = colors.filter(color => color !== current);
  return candidates[Math.floor(Math.random() * candidates.length)] || colors[0];
}
