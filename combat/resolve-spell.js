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
  const baseDamage = spellAttack * numericOr(spell.powerMultiplier, 1);
  let damage = 0;
  if (multiplier !== 0) {
    const variance = randomBetween(
      rng,
      COMBAT_CONFIG.spellVarianceMin,
      COMBAT_CONFIG.spellVarianceMax
    );
    const damageReduction = Math.max(0, Math.min(0.75, numeric(defender.magicDamageReduction)));
    damage = Math.max(1, Math.floor(baseDamage * multiplier * variance * (1 - damageReduction)));
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
