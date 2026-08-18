export const EFFECT_SCHEMA_VERSION = 3;

export const EFFECT_PART_TYPES = Object.freeze({
  flash: { label: "円形フラッシュ", defaults: { color: "#ffffff", radius: 150, lineWidth: 10 } },
  slash: { label: "斬撃", defaults: { color: "#d9fbff", length: 360, width: 28, angle: -35, trail: 4 } },
  spark: { label: "火花", defaults: { color: "#ffd45c", count: 28, speed: 240, size: 5, spread: 360 } },
  smoke: { label: "煙", defaults: { color: "#aeb8c2", count: 18, speed: 55, size: 42, spread: 120 } },
  explosion: { label: "爆発", defaults: { color: "#ff7a24", radius: 190, count: 36, secondaryColor: "#ffe76b" } },
  depthOrb: { label: "奥行き発光球", defaults: { color: "#ff000d", glowColor: "#f7765f", radius: 48, fromScale: .15, toScale: 3, depthDirection: "nearToFar", pathDirection: "forward", glowMode: "outer", glowStrength: 50, outlineWidth: 4, pathPoints: "384,523;458,7;480,286", fadeIn: 120, fadeOut: 180 } },
  ice: { label: "氷攻撃", defaults: { color: "#b9f4ff", secondaryColor: "#54bfff", count: 18, radius: 170, size: 22, rotation: 20 } },
  blizzard: { label: "吹雪", defaults: { color: "#e8fbff", secondaryColor: "#8edfff", count: 70, speed: 520, size: 8, angle: 12 } },
  electric: { label: "電撃", defaults: { color: "#fff76a", secondaryColor: "#72d9ff", count: 7, radius: 135, lineWidth: 4, segments: 8 } },
  lightning: { label: "雷撃", defaults: { color: "#ffffff", secondaryColor: "#8ed7ff", height: 420, width: 150, lineWidth: 12, branches: 5, segments: 12 } },
  cracker: { label: "クラッカー", defaults: { color: "#ff4f78", secondaryColor: "#55e8ff", count: 60, speed: 360, size: 10, spread: 100, gravity: 260 } },
  magicCircle: { label: "魔法陣", defaults: { color: "#72e8ff", radius: 130, lineWidth: 5, rotation: 120, rings: 3 } },
  popup: { label: "ダメージ数字", defaults: { color: "#ffffff", valueSource: "", text: "999", previewText: "999", fontSize: 72, rise: 100, outlineColor: "#161616" } },
  shake: { label: "画面振動", defaults: { strength: 14, frequency: 28 } }
});

export function createEffectDefinition(name = "NEW EFFECT") {
  return { version: EFFECT_SCHEMA_VERSION, id: "new_effect", name, description: "", width: 960, height: 540, duration: 1200, background: "#10151b", parts: [] };
}

export function createEffectPart(type, index = 0) {
  const schema = EFFECT_PART_TYPES[type] || EFFECT_PART_TYPES.flash;
  return {
    id: `${type}_${Date.now().toString(36)}_${index}`,
    type,
    enabled: true,
    start: index * 100,
    duration: type === "shake" ? 300 : 500,
    x: 480,
    y: 270,
    easing: "easeOutCubic",
    seed: index + 1,
    ...structuredClone(schema.defaults)
  };
}

export function normalizeEffectDefinition(source = {}) {
  const base = createEffectDefinition();
  const duration = clampNumber(source.duration, 16, 60000, base.duration);
  return {
    version: EFFECT_SCHEMA_VERSION,
    id: safeId(source.id || base.id),
    name: String(source.name || base.name).slice(0, 80),
    description: String(source.description || "").slice(0, 240),
    width: Math.round(clampNumber(source.width, 160, 3840, base.width)),
    height: Math.round(clampNumber(source.height, 90, 2160, base.height)),
    duration,
    background: safeColor(source.background, base.background),
    parts: Array.isArray(source.parts)
      ? source.parts.slice(0, 500).map((part, index) => normalizeEffectPart(part, index, duration)).filter(Boolean)
      : []
  };
}

export function normalizeEffectPart(source, index = 0, effectDuration = 1200) {
  if (!source || !EFFECT_PART_TYPES[source.type]) return null;
  const base = createEffectPart(source.type, index);
  const result = { ...base };
  for (const key of Object.keys(base)) {
    if (typeof base[key] === "number") result[key] = clampNumber(source[key], -100000, 100000, base[key]);
    else if (typeof base[key] === "boolean") result[key] = source[key] !== false;
    else result[key] = String(source[key] ?? base[key]).slice(0, 200);
  }
  result.id = safeId(source.id || base.id);
  result.start = clampNumber(source.start, 0, effectDuration, base.start);
  result.duration = clampNumber(source.duration, 1, 60000, base.duration);
  for (const key of ["color", "secondaryColor", "outlineColor"]) {
    if (key in result) result[key] = safeColor(source[key], base[key]);
  }
  return result;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeId(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "effect";
}

function safeColor(value, fallback = "#ffffff") {
  const color = String(value || "");
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}
