import { COMBAT_CONFIG, clamp } from "./combat-config.js";
import { STAT_KEYS, getCharacterClass } from "../data/classes.js";

export function collectStats(source = {}) {
  const characterClass = getCharacterClass(source.job);
  const classStats = characterClass?.stats || {};
  const base = source.baseStats || source.stats || classStats;
  const equipment = source.equipmentStatBonuses || source.equipmentBonuses || {};
  const cards = source.cardStatBonuses || source.cardBonuses || {};
  const temporary = source.temporaryStatBonuses || {};
  const stats = {};
  for (const key of STAT_KEYS) {
    stats[key] = clamp(
      numeric(base[key]) + numeric(equipment[key]) + numeric(cards[key]) + numeric(temporary[key]),
      0,
      COMBAT_CONFIG.statMaximum
    );
  }
  return {
    ...stats,
    def: Math.max(0, numeric(source.def ?? source.defense)),
    hitBonus: numeric(source.hitBonus),
    criticalBonus: numeric(source.criticalBonus),
    speedBonus: numeric(source.speedBonus),
    defensePenetration: numeric(source.defensePenetration),
    statusPowerBonus: numeric(source.statusPowerBonus),
    statusResistanceBonus: numeric(source.statusResistanceBonus),
    instantDeathResistance: numeric(source.instantDeathResistance),
    surpriseResistance: numeric(source.surpriseResistance)
  };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
