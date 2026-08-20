export const WALL_COLORS = Object.freeze(["default", "red", "blue", "green", "yellow", "slate", "water", "white", "black"]);
export const FLOOR_COLORS = Object.freeze(["default", "red", "blue", "green", "yellow", "slate", "water", "purple", "white", "black"]);
export const FLOOR_THEME_MODES = Object.freeze({ FIXED: "fixed", RANDOM: "random" });

export function isForcedTorchZeroFloor(depth) {
  const floor = Math.floor(Number(depth) || 0);
  return floor >= 90 && floor <= 99;
}

const settings = {
  mode: FLOOR_THEME_MODES.FIXED,
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
  if (Number(depth) >= 1 && Number(depth) <= 9) {
    return { wall: "slate", floor: "slate", source: "floor" };
  }
  if (Number(depth) >= 10 && Number(depth) <= 19) {
    return { wall: "slate", floor: "slate", source: "floor" };
  }
  if (Number(depth) >= 20 && Number(depth) <= 29) {
    return { wall: "slate", floor: "slate", source: "floor" };
  }
  if (Number(depth) >= 30 && Number(depth) <= 39) {
    return { wall: "red", floor: "red", source: "floor" };
  }
  if (Number(depth) >= 40 && Number(depth) <= 49) {
    return { wall: "blue", floor: "blue", source: "floor" };
  }
  if (Number(depth) >= 50 && Number(depth) <= 59) {
    return { wall: "green", floor: "green", source: "floor" };
  }
  if (Number(depth) >= 60 && Number(depth) <= 69) {
    return { wall: "yellow", floor: "yellow", source: "floor" };
  }
  if (Number(depth) >= 70 && Number(depth) <= 79) {
    return { wall: "water", floor: "water", source: "floor" };
  }
  if (Number(depth) >= 90 && Number(depth) <= 99) {
    return { wall: "black", floor: "black", source: "floor" };
  }
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
