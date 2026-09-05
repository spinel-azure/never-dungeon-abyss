export const MAX_LEVEL = 197;
export const MAX_EXPERIENCE = 9_999_999;

export const JOB_GROWTH = Object.freeze({
  warrior: Object.freeze({ hp: 30, hpMax: 999, sp: 15, spMax: 650 }),
  thief: Object.freeze({ hp: 25, hpMax: 850, sp: 20, spMax: 750 }),
  priest: Object.freeze({ hp: 20, hpMax: 750, sp: 25, spMax: 850 }),
  mage: Object.freeze({ hp: 15, hpMax: 650, sp: 30, spMax: 999 })
});

const VITAL_GROWTH_EXPONENT = 1.35;
const VITAL_EARLY_BOOST = 0.009;
const VITAL_GROWTH_JOIN_LEVEL = 50;
const MIDGAME_HP_BONUS_START_LEVEL = 20;
const MIDGAME_HP_BONUS_END_LEVEL = 100;
const MIDGAME_HP_PROGRESS_BONUS_MAX = 0.03;
const PRIME_LEVELS = Object.freeze(
  Array.from({ length: MAX_LEVEL + 1 }, (_, level) => level).filter(isPrime)
);
const EXPERIENCE_ANCHORS = Object.freeze([
  Object.freeze([1, 0]),
  Object.freeze([2, 10]),
  Object.freeze([3, 25]),
  Object.freeze([4, 45]),
  Object.freeze([5, 70]),
  Object.freeze([6, 105]),
  Object.freeze([7, 150]),
  Object.freeze([8, 210]),
  Object.freeze([9, 290]),
  Object.freeze([10, 390]),
  Object.freeze([12, 670]),
  Object.freeze([15, 1_270]),
  Object.freeze([20, 3_000]),
  Object.freeze([30, 12_000]),
  Object.freeze([50, 90_000]),
  Object.freeze([75, 500_000]),
  Object.freeze([100, 1_600_000]),
  Object.freeze([125, 3_500_000]),
  Object.freeze([150, 6_000_000]),
  Object.freeze([175, 8_500_000]),
  Object.freeze([197, MAX_EXPERIENCE])
]);

export function getLevelGrowth(jobId, level) {
  const job = JOB_GROWTH[jobId] || JOB_GROWTH.warrior;
  const normalized = normalizeLevel(level);
  const baseVitalProgress = getVitalGrowthProgress(normalized);
  const hpProgress = Math.min(
    1,
    baseVitalProgress + getMidgameHpProgressBonus(normalized)
  );
  return Object.freeze({
    level: normalized,
    hp: Math.round(job.hp + (job.hpMax - job.hp) * hpProgress),
    sp: Math.round(job.sp + (job.spMax - job.sp) * baseVitalProgress),
    deckCost: getDeckCostAtLevel(normalized)
  });
}

export function getMidgameHpProgressBonus(level) {
  const normalized = normalizeLevel(level);
  if (normalized <= MIDGAME_HP_BONUS_START_LEVEL || normalized >= MIDGAME_HP_BONUS_END_LEVEL) {
    return 0;
  }

  const phase = (normalized - MIDGAME_HP_BONUS_START_LEVEL)
    / (MIDGAME_HP_BONUS_END_LEVEL - MIDGAME_HP_BONUS_START_LEVEL);
  return MIDGAME_HP_PROGRESS_BONUS_MAX * Math.sin(Math.PI * phase);
}

export function getDeckCostAtLevel(level) {
  const normalized = normalizeLevel(level);
  return 3 + PRIME_LEVELS.filter(prime => prime <= normalized).length;
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

export function getLevelForExperience(experience) {
  const normalized = normalizeExperience(experience);
  let level = 1;
  while (level < MAX_LEVEL && normalized >= getExperienceForLevel(level + 1)) level += 1;
  return level;
}

export function getNextLevelExperience(level) {
  const normalized = normalizeLevel(level);
  return normalized >= MAX_LEVEL ? MAX_EXPERIENCE : getExperienceForLevel(normalized + 1);
}

export function normalizeExperience(experience) {
  return Math.min(MAX_EXPERIENCE, Math.max(0, Math.floor(Number(experience) || 0)));
}

function normalizeLevel(level) {
  return Math.min(MAX_LEVEL, Math.max(1, Math.trunc(Number(level) || 1)));
}

function getVitalGrowthProgress(level) {
  const progress = (level - 1) / (MAX_LEVEL - 1);
  const standardProgress = progress ** VITAL_GROWTH_EXPONENT;

  if (level >= VITAL_GROWTH_JOIN_LEVEL) return standardProgress;

  const earlyPhase = (level - 1) / (VITAL_GROWTH_JOIN_LEVEL - 1);
  const earlyBoost = VITAL_EARLY_BOOST * Math.sin(Math.PI * earlyPhase);
  return Math.min(1, standardProgress + earlyBoost);
}

function isPrime(value) {
  if (value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}
