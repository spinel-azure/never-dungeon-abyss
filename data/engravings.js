import { getPlayerStatMaximum } from "./stat-caps.js";

const STAT_KEYS = Object.freeze(["str", "int", "agi", "dex", "luc"]);

export const ENGRAVING_EFFECT_ID = "permanent_stat_engraving";

export function normalizeEngravingBonuses(candidate) {
  return Object.fromEntries(STAT_KEYS.map(key => [
    key,
    Math.max(0, Math.floor(Number(candidate?.[key]) || 0))
  ]));
}

export function getEngravingBaseStat(character, statKey) {
  return Math.max(0, Math.floor(Number(character?.baseStats?.[statKey]) || 0))
    + normalizeEngravingBonuses(character?.engravingStatBonuses)[statKey];
}

export function getEngravingUseReason(character, statKey) {
  if (!STAT_KEYS.includes(statKey)) return "unknownStat";
  return getEngravingBaseStat(character, statKey) >= getPlayerStatMaximum(character?.reincarnationCount)
    ? "statMaximum"
    : "";
}
