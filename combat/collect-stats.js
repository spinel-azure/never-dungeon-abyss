import { COMBAT_CONFIG, clamp } from "./combat-config.js";
import { STAT_KEYS, getCharacterClass } from "../data/classes.js";

export function collectStats(source = {}) {
  const characterClass = getCharacterClass(source.job);
  const classStats = characterClass?.stats || {};
  const base = source.baseStats || source.stats || classStats;
  const equipment = source.equipmentStatBonuses || source.equipmentBonuses || {};
  const cards = source.cardStatBonuses || source.cardBonuses || {};
  const temporary = source.temporaryStatBonuses || {};
  const npc = source.npcStatBonuses || source.npcBonuses || {};
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
    def: Math.max(
      0,
      numeric(source.def ?? source.defense)
        + numeric(equipment.def)
        + numeric(cards.def)
        + numeric(temporary.def)
    ),
    hitBonus: numeric(source.hitBonus),
    evasionBonus: numeric(source.evasionBonus),
    physicalHitMinimum: Number.isFinite(Number(source.physicalHitMinimum))
      ? Number(source.physicalHitMinimum)
      : undefined,
    criticalBonus: numeric(source.criticalBonus),
    speedBonus: numeric(source.speedBonus),
    defensePenetration: numeric(source.defensePenetration),
    statusPowerBonus: numeric(source.statusPowerBonus),
    statusResistanceBonus: numeric(source.statusResistanceBonus),
    bleedingResistance: numeric(source.bleedingResistance) + numeric(equipment.bleedingResistance)
      + numeric(cards.bleedingResistance) + numeric(temporary.bleedingResistance),
    actionSkipResistance: clamp(
      numeric(source.actionSkipResistance)
        + numeric(equipment.actionSkipResistance)
        + numeric(cards.actionSkipResistance)
        + numeric(temporary.actionSkipResistance),
      0,
      1
    ),
    magicDamageReduction: clamp(
      numeric(source.magicDamageReduction)
        + numeric(equipment.magicDamageReduction)
        + numeric(cards.magicDamageReduction)
        + numeric(temporary.magicDamageReduction),
      0,
      0.75
    ),
    instantDeathResistance: numeric(source.instantDeathResistance),
    surpriseResistance:
      numeric(source.surpriseResistance)
      + numeric(equipment.surpriseResistance)
      + numeric(cards.surpriseResistance)
      + numeric(temporary.surpriseResistance)
      + numeric(npc.surpriseResistance)
  };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
