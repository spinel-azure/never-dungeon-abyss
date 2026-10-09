export const MAX_REINCARNATIONS = 3;
export const REINCARNATION_LEVEL_SPAN = 196;

export const REINCARNATION_COSTS = Object.freeze([0, 500_000, 1_000_000, 2_000_000]);
export const REINCARNATION_EXPERIENCE_MULTIPLIERS = Object.freeze([1, 1.25, 1.5, 2]);
export const REINCARNATION_MEDALS = Object.freeze([
  null,
  "images/screenshots/medal_02.avif",
  "images/screenshots/medal_03.avif",
  "images/screenshots/medal_04.avif"
]);
export const REINCARNATION_GODDESSES = Object.freeze([
  null,
  Object.freeze({ name: "女神ゼレーナ", image: "images/npc/NPC_19e.avif" }),
  Object.freeze({ name: "女神ノクティア", image: "images/npc/NPC_19d.avif" }),
  Object.freeze({ name: "女神ルミナ", image: "images/npc/NPC_19c.avif" })
]);

export function normalizeReincarnationCount(value) {
  return Math.max(0, Math.min(MAX_REINCARNATIONS, Math.floor(Number(value) || 0)));
}

export function getReincarnationCost(nextCount) {
  return REINCARNATION_COSTS[normalizeReincarnationCount(nextCount)] || 0;
}

export function getReincarnationExperienceMultiplier(count) {
  return REINCARNATION_EXPERIENCE_MULTIPLIERS[normalizeReincarnationCount(count)] || 1;
}

export function getPhysicalReincarnationMultiplier(level, count) {
  const trainingLevels = Math.max(0, Math.floor(Number(level) || 1) - 1)
    + normalizeReincarnationCount(count) * REINCARNATION_LEVEL_SPAN;
  return 1 + trainingLevels * 0.005;
}

export function getSpellReincarnationMultiplier(level, count) {
  const reincarnations = normalizeReincarnationCount(count);
  if (reincarnations <= 0) return 1;
  const trainingLevels = (reincarnations - 1) * REINCARNATION_LEVEL_SPAN
    + Math.max(0, Math.floor(Number(level) || 1) - 1);
  return 1 + trainingLevels * 0.005;
}
