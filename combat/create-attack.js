import { getWeapon, getWeaponType } from "../data/weapons.js";

export function createNormalAttack({ weapon, weaponId, weaponEnhancement = 0, skillIds = [] } = {}) {
  const resolvedWeapon = weapon || getWeapon(weaponId, weaponEnhancement);
  const type = getWeaponType(resolvedWeapon.type);
  const wisdomToPowerActive = skillIds.includes("wisdom_to_power") && resolvedWeapon.id !== "oak_staff";
  return {
    id: "normal_attack",
    name: "攻撃",
    actionType: "physicalAttack",
    hitCount: type.hitCount,
    powerPerHit: type.powerPerHit,
    weapon: resolvedWeapon,
    defensePenetration: (type.defensePenetration || 0) + (resolvedWeapon.defensePenetration || 0),
    attackStat: resolvedWeapon.normalAttackStat || type.normalAttackStat || "str",
    attackStatMultiplier: resolvedWeapon.normalAttackStatMultiplier ?? type.normalAttackStatMultiplier,
    additionalAttackStats: wisdomToPowerActive
      ? Object.freeze([{ stat: "int", multiplier: 0.5 }])
      : Object.freeze([]),
    damageDexMultiplier: type.damageDexMultiplier || 0,
    ignoresDefense: Boolean(resolvedWeapon.normalAttackIgnoresDefense ?? type.normalAttackIgnoresDefense),
    hitBonus: resolvedWeapon.hitBonus || 0,
    criticalBonus: resolvedWeapon.criticalBonus || 0,
    speedModifier: type.speedModifier || 0,
    effects: [...(resolvedWeapon.effects || [])]
  };
}

export function createSkillAttack(skill, { weapon, weaponId, weaponEnhancement = 0 } = {}) {
  const resolvedWeapon = weapon || getWeapon(weaponId, weaponEnhancement);
  const weaponType = getWeaponType(resolvedWeapon.type);
  const usesWeaponHits = skill.hitCountMode === "weapon";
  return {
    ...skill,
    actionType: "physicalAttack",
    hitCount: usesWeaponHits ? weaponType.hitCount : skill.hitCount || 1,
    powerPerHit: skill.powerPerHit ?? 1,
    damageDexMultiplier: weaponType.damageDexMultiplier || 0,
    weapon: resolvedWeapon,
    defensePenetration:
      (weaponType.defensePenetration || 0)
      + (resolvedWeapon.defensePenetration || 0)
      + (skill.defensePenetration || 0),
    hitBonus: (resolvedWeapon.hitBonus || 0) + (skill.hitBonus || 0),
    criticalBonus: (resolvedWeapon.criticalBonus || 0) + (skill.criticalBonus || 0),
    speedModifier: skill.speedModifier ?? weaponType.speedModifier ?? 0,
    effects: [...(resolvedWeapon.effects || []), ...(skill.effects || [])]
  };
}
