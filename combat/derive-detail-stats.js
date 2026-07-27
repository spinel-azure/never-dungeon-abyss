import { collectStats } from "./collect-stats.js";
import { COMBAT_CONFIG, clamp } from "./combat-config.js";
import { getEquipmentItem } from "../data/equipment.js";
import { getWeaponType } from "../data/weapons.js";

export function deriveDetailStats(character = {}) {
  const stats = collectStats(character);
  const weaponId = character.equipment?.rightArmId || character.equipment?.weaponId;
  const weapon = getEquipmentItem(weaponId, "rightArmId");
  const weaponType = getWeaponType(weapon?.type);
  const normalAttackStat = weaponType.normalAttackStat === "int" ? stats.int : stats.str;
  return {
    physicalAttack: rounded(
      numeric(weapon?.attack) + normalAttackStat * COMBAT_CONFIG.strengthMultiplier
    ),
    spellAttack: rounded(stats.int * COMBAT_CONFIG.intelligenceMultiplier),
    physicalDamage: percent(1 + numeric(character.physicalDamageBonus)),
    spellDamage: percent(1 + numeric(character.spellDamageBonus)),
    spellResistance: percent(clamp(numeric(character.spellResistance), 0, 1)),
    criticalRate: percent(clamp(
      COMBAT_CONFIG.criticalRateBase
        + stats.dex * COMBAT_CONFIG.criticalDexMultiplier
        + stats.criticalBonus,
      0,
      COMBAT_CONFIG.criticalRateMaximum
    )),
    evasionRate: percent(clamp(
      stats.agi * COMBAT_CONFIG.physicalHitStatStep + numeric(character.evasionBonus),
      0,
      1
    )),
    hitRate: percent(clamp(
      COMBAT_CONFIG.physicalHitBase + stats.hitBonus,
      COMBAT_CONFIG.physicalHitMinimum,
      COMBAT_CONFIG.physicalHitMaximum
    )),
    initiativeRate: percent(clamp(numeric(character.initiativeBonus), 0, 1)),
    trapDisarmRate: percent(clamp(
      stats.dex * 0.02 + numeric(character.trapDisarmBonus),
      0,
      1
    )),
    statusResistance: percent(clamp(
      stats.luc * COMBAT_CONFIG.physicalHitStatStep + stats.statusResistanceBonus,
      0,
      1
    )),
    torchReduction: percent(clamp(numeric(character.torchConsumptionReduction), 0, 1)),
    presenceReduction: percent(clamp(numeric(character.presenceIncreaseReduction), 0, 1))
  };
}

function percent(value) {
  return Math.round(value * 1000) / 10;
}

function rounded(value) {
  return Math.round(value * 10) / 10;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
