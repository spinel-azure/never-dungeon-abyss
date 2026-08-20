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
      1,
      COMBAT_CONFIG.statMaximum
    );
  }
  return {
    ...stats,
    def: clamp(
      (numeric(source.def ?? source.defense)
        + numeric(equipment.def)
        + numeric(cards.def)
        + numeric(temporary.def)) * positiveMultiplier(equipment.defenseMultiplier),
      0,
      source.job ? COMBAT_CONFIG.defenseMaximum : Number.POSITIVE_INFINITY
    ),
    hitBonus: numeric(source.hitBonus),
    healingMiracleMultiplier: positiveMultiplier(equipment.healingMiracleMultiplier)
      * (1 + numeric(equipment.healingMiracleBonus)),
    evasionBonus: numeric(source.evasionBonus),
    physicalHitMinimum: Number.isFinite(Number(source.physicalHitMinimum))
      ? Number(source.physicalHitMinimum)
      : undefined,
    criticalBonus: numeric(source.criticalBonus),
    speedBonus: numeric(source.speedBonus),
    defensePenetration: numeric(source.defensePenetration),
    statusPowerBonus: numeric(source.statusPowerBonus),
    statusResistanceBonus: numeric(source.statusResistanceBonus),
    attackSpellDamageBonus: numeric(source.attackSpellDamageBonus)
      + numeric(equipment.attackSpellDamageBonus),
    passiveInstantDeathRateBonus: numeric(source.passiveInstantDeathRateBonus)
      + numeric(equipment.passiveInstantDeathRateBonus),
    poisonResistance: clamp(
      numeric(source.poisonResistance)
        + numeric(equipment.poisonResistance)
        + numeric(cards.poisonResistance)
        + numeric(temporary.poisonResistance),
      0,
      1
    ),
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
    deadlyPoisonResistance: clamp(
      numeric(source.deadlyPoisonResistance)
        + numeric(equipment.deadlyPoisonResistance)
        + numeric(cards.deadlyPoisonResistance)
        + numeric(temporary.deadlyPoisonResistance),
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
    fireDamageReduction: clamp(
      numeric(source.fireDamageReduction)
        + numeric(equipment.fireDamageReduction)
        + numeric(cards.fireDamageReduction)
        + numeric(temporary.fireDamageReduction),
      0,
      0.75
    ),
    iceDamageReduction: clamp(
      numeric(source.iceDamageReduction)
        + numeric(equipment.iceDamageReduction)
        + numeric(cards.iceDamageReduction)
        + numeric(temporary.iceDamageReduction),
      0,
      0.75
    ),
    nonElementalMagicDamageReduction: clamp(
      numeric(source.nonElementalMagicDamageReduction)
        + numeric(equipment.nonElementalMagicDamageReduction)
        + numeric(cards.nonElementalMagicDamageReduction)
        + numeric(temporary.nonElementalMagicDamageReduction),
      0,
      0.75
    ),
    elementalMagicDamageReduction: clamp(
      numeric(source.elementalMagicDamageReduction)
        + numeric(equipment.elementalMagicDamageReduction)
        + numeric(cards.elementalMagicDamageReduction)
        + numeric(temporary.elementalMagicDamageReduction),
      0,
      0.75
    ),
    fireSpellDamageBonus: numeric(source.fireSpellDamageBonus) + numeric(equipment.fireSpellDamageBonus),
    iceSpellDamageBonus: numeric(source.iceSpellDamageBonus) + numeric(equipment.iceSpellDamageBonus),
    fireDamageTakenBonus: numeric(source.fireDamageTakenBonus) + numeric(equipment.fireDamageTakenBonus),
    iceDamageTakenBonus: numeric(source.iceDamageTakenBonus) + numeric(equipment.iceDamageTakenBonus),
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

function positiveMultiplier(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}
