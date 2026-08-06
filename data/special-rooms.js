export const SPECIAL_ROOM_UNLOCK_CURVES = Object.freeze({
  standard: Object.freeze([
    Object.freeze([0, 0.25]),
    Object.freeze([5, 0.45]),
    Object.freeze([10, 0.65]),
    Object.freeze([20, 0.85]),
    Object.freeze([30, 1])
  ]),
  elite: Object.freeze([
    Object.freeze([0, 0.01]),
    Object.freeze([10, 0.05]),
    Object.freeze([15, 0.1]),
    Object.freeze([19, 0.2]),
    Object.freeze([20, 0.3]),
    Object.freeze([25, 0.45]),
    Object.freeze([30, 0.6])
  ])
});

export const DEFAULT_SPECIAL_ROOM_LOCK = Object.freeze({
  mode: "dexCurve",
  curveId: "standard",
  attempts: 3,
  retryMultipliers: Object.freeze([1, 0.8, 0.6])
});

// Add only differences here when a floor receives an event, treasure or boss.
export const SPECIAL_ROOM_FLOOR_OVERRIDES = Object.freeze({
  2: Object.freeze({
    content: Object.freeze({
      type: "repeatableBoss",
      bossId: "lingering_ghost_paul_b2f",
      minimapMarker: "E",
      revealBeforeExploration: true
    })
  }),
  4: Object.freeze({
    dangerWarning: true,
    content: Object.freeze({
      type: "eventBoss",
      bossId: "otherworldly_wisdom_b4f",
      minimapMarker: "E",
      revealBeforeExploration: true
    })
  }),
  6: Object.freeze({
    content: Object.freeze({ type: "eventBoss", bossId: "quest_mimic_b6f",
      minimapMarker: "E", revealBeforeExploration: true, requiredQuestId: "guild_006" })
  })
});

export const SPECIAL_ROOM_ACCESS_BLOCKED_MESSAGE = "今はこの扉を開けられないようだ。";

export function getSpecialRoomDefinition(depth) {
  const normalizedDepth = Math.max(1, Math.floor(Number(depth) || 1));
  const override = SPECIAL_ROOM_FLOOR_OVERRIDES[normalizedDepth] || {};
  if (override.enabled === false) return null;
  return {
    id: override.id || `special_room_b${normalizedDepth}f`,
    depth: normalizedDepth,
    required: Boolean(override.required),
    content: structuredClone(override.content ?? null),
    dangerWarning: Boolean(override.dangerWarning),
    lock: {
      ...structuredClone(DEFAULT_SPECIAL_ROOM_LOCK),
      ...structuredClone(override.lock || {})
    }
  };
}

export function getSpecialRoomAccessRestriction({ forcedEnemyId = null } = {}) {
  return forcedEnemyId
    ? { blocked: true, reason: "forcedEncounter", message: SPECIAL_ROOM_ACCESS_BLOCKED_MESSAGE }
    : { blocked: false, reason: "", message: "" };
}

export function getSpecialRoomUnlockRate(lock, dex, attemptIndex = 0) {
  const mode = lock?.mode || "dexCurve";
  if (mode === "alwaysSuccess") return 1;
  if (mode === "alwaysFail") return 0;
  const multiplier = Math.max(0, Number(lock?.retryMultipliers?.[attemptIndex]) || 0);
  const baseRate = mode === "fixedRate"
    ? clampRate(lock?.fixedRate)
    : interpolateCurve(
      SPECIAL_ROOM_UNLOCK_CURVES[lock?.curveId] || SPECIAL_ROOM_UNLOCK_CURVES.standard,
      Math.max(0, Number(dex) || 0)
    );
  return clampRate(baseRate * multiplier);
}

function interpolateCurve(points, value) {
  if (value <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    const [leftX, leftY] = points[index - 1];
    if (value > rightX) continue;
    const progress = (value - leftX) / Math.max(1, rightX - leftX);
    return leftY + (rightY - leftY) * progress;
  }
  return points.at(-1)[1];
}

function clampRate(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
