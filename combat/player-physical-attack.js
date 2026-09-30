import { MAX_LEVEL } from "../data/growth.js";

// Only the player battle entry point and player detail display use this adapter.
// Explicit ability formulas (including the oak staff) retain their own rules.
export function preparePlayerPhysicalAttack(attack, stats, level = 1) {
  if (attack.ignoreWeaponAttack || attack.attackStatMultiplier != null
    || (attack.attackStat && attack.attackStat !== "str")) return attack;
  const normalizedLevel = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(Number(level) || 1)));
  const coefficient = 1 + (normalizedLevel - 1) * 0.005;
  const greatsword = attack.weapon?.type === "greatsword";
  const weaponAttack = Math.max(0, Number(attack.weapon?.attack ?? attack.weaponAttack) || 0);
  return {
    ...attack,
    weapon: { ...attack.weapon, attack: ((Number(stats.str) || 0) + weaponAttack * (greatsword ? 1.5 : 1)) * coefficient },
    attackStatMultiplier: 0,
    // DEX and additional INT remain outside the level multiplier.
    powerPerHit: greatsword && attack.id === "normal_attack" ? 1 : attack.powerPerHit
  };
}
