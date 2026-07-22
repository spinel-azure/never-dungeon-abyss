export const STAT_KEYS = Object.freeze(["str", "int", "agi", "dex", "luc"]);
export const STAT_CAP = 30;
export const MAX_LEVEL = 197;
export const JOBS = Object.freeze({
  warrior: Object.freeze({ name: "WARRIOR", nameJa: "戦士", hp: 30, hpMax: 999, sp: 15, spMax: 650, stats: Object.freeze({ str: 8, int: 2, agi: 5, dex: 5, luc: 4 }) }),
  thief: Object.freeze({ name: "THIEF", nameJa: "盗賊", hp: 25, hpMax: 850, sp: 20, spMax: 750, stats: Object.freeze({ str: 4, int: 3, agi: 7, dex: 7, luc: 3 }) }),
  cleric: Object.freeze({ name: "CLERIC", nameJa: "僧侶", hp: 20, hpMax: 750, sp: 25, spMax: 850, stats: Object.freeze({ str: 5, int: 6, agi: 4, dex: 4, luc: 5 }) }),
  mage: Object.freeze({ name: "MAGE", nameJa: "魔術師", hp: 15, hpMax: 650, sp: 30, spMax: 999, stats: Object.freeze({ str: 2, int: 8, agi: 5, dex: 5, luc: 4 }) }),
});
const PRIME_LEVELS = Object.freeze(Array.from({ length: MAX_LEVEL + 1 }, (_, level) => level).filter(isPrime));
const VITAL_GROWTH_EXPONENT = 1.35;
const EXPERIENCE_ANCHORS = Object.freeze([
  Object.freeze([1, 0]), Object.freeze([2, 10]), Object.freeze([3, 25]), Object.freeze([4, 45]), Object.freeze([5, 70]),
  Object.freeze([20, 3_000]), Object.freeze([30, 12_000]), Object.freeze([50, 90_000]), Object.freeze([75, 500_000]),
  Object.freeze([100, 1_600_000]), Object.freeze([125, 3_500_000]), Object.freeze([150, 6_000_000]),
  Object.freeze([175, 8_500_000]), Object.freeze([197, 9_999_999]),
]);
function isPrime(value) { if (value < 2) return false; for (let divisor = 2; divisor * divisor <= value; divisor += 1) if (value % divisor === 0) return false; return true; }
function normalizeLevel(level) { return Math.min(MAX_LEVEL, Math.max(1, Math.trunc(Number(level) || 1))); }
function readBonus(source, key) { return Number(source?.[key]) || 0; }
export function getDeckCostAtLevel(level) { const normalized = normalizeLevel(level); return 3 + PRIME_LEVELS.filter((prime) => prime <= normalized).length; }
export function getLevelGrowth(jobId, level) {
  const job = JOBS[jobId] ?? JOBS.warrior; const normalized = normalizeLevel(level);
  const progress = ((normalized - 1) / (MAX_LEVEL - 1)) ** VITAL_GROWTH_EXPONENT;
  const hp = Math.round(job.hp + (job.hpMax - job.hp) * progress);
  const sp = Math.round(job.sp + (job.spMax - job.sp) * progress);
  return Object.freeze({ level: normalized, hp, sp, deckCost: getDeckCostAtLevel(normalized) });
}
// Single source of truth for the status, equipment, deck and battle consumers.
export function calculateStats({ jobId = "warrior", equipment = {}, cards = {} } = {}) {
  const job = JOBS[jobId] ?? JOBS.warrior; const stats = {}; let valid = true;
  for (const key of STAT_KEYS) {
    const base = readBonus(job.stats, key); const equipmentBonus = readBonus(equipment, key); const cardBonus = readBonus(cards, key); const total = base + equipmentBonus + cardBonus;
    if (total > STAT_CAP || total < 0) valid = false;
    stats[key] = Object.freeze({ base, equipment: equipmentBonus, cards: cardBonus, total, over: Math.max(0, total - STAT_CAP) });
  }
  return Object.freeze({ jobId, cap: STAT_CAP, valid, stats: Object.freeze(stats) });
}
export function previewStatChange(build, source, bonuses) {
  if (source !== "equipment" && source !== "cards") throw new TypeError("source must be equipment or cards");
  const nextBuild = { ...build, [source]: { ...(build[source] ?? {}) } };
  for (const key of STAT_KEYS) nextBuild[source][key] = readBonus(nextBuild[source], key) + readBonus(bonuses, key);
  const result = calculateStats(nextBuild); const exceededStats = STAT_KEYS.filter((key) => result.stats[key].total > STAT_CAP);
  return Object.freeze({ allowed: exceededStats.length === 0, exceededStats: Object.freeze(exceededStats), result });
}
export function getExperienceForLevel(level) {
  const normalized = normalizeLevel(level);
  const upperIndex = EXPERIENCE_ANCHORS.findIndex(([anchorLevel]) => anchorLevel >= normalized);
  const upper = EXPERIENCE_ANCHORS[upperIndex];
  if (upper[0] === normalized || upperIndex === 0) return upper[1];
  const lower = EXPERIENCE_ANCHORS[upperIndex - 1];
  const progress = (normalized - lower[0]) / (upper[0] - lower[0]);
  return Math.round(lower[1] + (upper[1] - lower[1]) * progress);
}
