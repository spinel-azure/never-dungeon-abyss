import { COMBAT_CONFIG, randomBetween } from "./combat-config.js";
import { createCombatResult } from "./combat-result.js";
import { resolveEffects } from "./resolve-effects.js";
import { calculatePhysicalHitRate } from "./resolve-physical-attack.js";

export function resolveSpell({
  attacker = {},
  defender = {},
  spell = {},
  elementMultiplier,
  rng = Math.random
} = {}) {
  const multiplier = resolveElementMultiplier(defender, spell.element, elementMultiplier);
  const unavoidable = spell.unavoidable !== false;
  const hitRate = unavoidable
    ? 1
    : calculatePhysicalHitRate({ attacker, defender, attack: spell });
  const hit = unavoidable || roll(rng) < hitRate;
  if (!hit) {
    return createCombatResult("spell", {
      spellId: spell.id,
      element: spell.element,
      elementMultiplier: multiplier,
      hitRate,
      hits: [{ hit: false, damage: 0, critical: false, effects: [] }]
    });
  }

  const spellAttack = numeric(spell.spellPower)
    + numeric(attacker.int) * COMBAT_CONFIG.intelligenceMultiplier;
  const offensiveBonus = spell.element === "fire"
    ? numeric(attacker.fireSpellDamageBonus)
    : spell.element === "ice" ? numeric(attacker.iceSpellDamageBonus) : 0;
  const baseDamage = spellAttack * numericOr(spell.powerMultiplier, 1) * (1 + offensiveBonus);
  let damage = 0;
  if (multiplier !== 0) {
    const variance = randomBetween(
      rng,
      COMBAT_CONFIG.spellVarianceMin,
      COMBAT_CONFIG.spellVarianceMax
    );
    const elementalReduction = spell.element === "fire" ? numeric(defender.fireDamageReduction) : 0;
    const nonElementalReduction = isElementalSpell(spell.element)
      ? 0
      : numeric(defender.nonElementalMagicDamageReduction);
    const elementalMagicReduction = isElementalSpell(spell.element)
      ? numeric(defender.elementalMagicDamageReduction)
      : 0;
    const damageReduction = Math.max(0, Math.min(0.75,
      numeric(defender.magicDamageReduction) + elementalReduction
        + elementalMagicReduction + nonElementalReduction));
    const damageTakenBonus = spell.element === "fire"
      ? numeric(defender.fireDamageTakenBonus)
      : spell.element === "ice" ? numeric(defender.iceDamageTakenBonus) : 0;
    damage = Math.max(1, Math.floor(baseDamage * multiplier * variance * (1 - damageReduction) * (1 + damageTakenBonus)));
  }
  const actionEffects = resolveEffects({
    effects: spell.effects,
    trigger: "perAction",
    attacker,
    defender,
    rng
  });
  return createCombatResult("spell", {
    spellId: spell.id,
    element: spell.element,
    elementMultiplier: multiplier,
    hitRate,
    spellAttack,
    hits: [{ hit: true, damage, critical: false, effects: [] }],
    totalDamage: damage,
    actionEffects
  });
}

function isElementalSpell(element) {
  return ["fire", "ice", "lightning", "water", "wind", "earth", "holy", "dark"].includes(element);
}

function resolveElementMultiplier(defender, element, explicit) {
  if (Number.isFinite(Number(explicit))) return Math.max(0, Number(explicit));
  const value = defender.elementMultipliers?.[element];
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 1;
}

function roll(rng) {
  return Math.max(0, Math.min(0.999999999999, numeric(rng?.())));
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function numericOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
