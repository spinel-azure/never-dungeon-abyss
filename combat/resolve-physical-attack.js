import { COMBAT_CONFIG, clamp, randomBetween } from "./combat-config.js";
import { createCombatResult } from "./combat-result.js";
import { resolveEffects } from "./resolve-effects.js";

export function resolvePhysicalAttack({
  attacker = {},
  defender = {},
  attack = {},
  rng = Math.random
} = {}) {
  const hitCount = Math.max(1, Math.floor(Number(attack.hitCount) || 1));
  const penetration = clamp(
    numeric(attack.defensePenetration) + numeric(attacker.defensePenetration),
    0,
    COMBAT_CONFIG.defensePenetrationMaximum
  );
  const effectiveDefense = attack.ignoresDefense
    ? 0
    : Math.max(0, numeric(defender.def))
      * COMBAT_CONFIG.defenseMultiplier
      * (1 - penetration);
  const attackStat = attack.attackStat === "int" ? "int" : "str";
  const attackStatMultiplier = Number.isFinite(Number(attack.attackStatMultiplier))
    ? Number(attack.attackStatMultiplier)
    : COMBAT_CONFIG.strengthMultiplier;
  const attackPower = Math.max(0, numeric(attack.weapon?.attack ?? attack.weaponAttack))
    + numeric(attacker[attackStat]) * attackStatMultiplier
    + numeric(attacker.dex) * numeric(attack.damageDexMultiplier);
  const hitRate = calculatePhysicalHitRate({ attacker, defender, attack });
  const criticalRate = calculateCriticalRate({ attacker, attack });
  const hits = [];
  let firstHitEffectsResolved = false;

  for (let index = 0; index < hitCount; index += 1) {
    const hit = attack.unavoidable ? true : roll(rng) < hitRate;
    if (!hit) {
      hits.push({
        hit: false,
        damage: 0,
        critical: false,
        effects: []
      });
      continue;
    }

    const critical = roll(rng) < criticalRate;
    const baseDamage = Math.max(
      0,
      attackPower * numericOr(attack.powerPerHit, 1) - effectiveDefense
    );
    const variance = randomBetween(
      rng,
      COMBAT_CONFIG.physicalVarianceMin,
      COMBAT_CONFIG.physicalVarianceMax
    );
    const normalDamage = Math.max(1, Math.floor(baseDamage * variance));
    const damage = critical
      ? Math.max(
        COMBAT_CONFIG.criticalDamageMinimum,
        Math.floor(normalDamage * COMBAT_CONFIG.criticalMultiplier)
      )
      : normalDamage;
    const effects = [
      ...resolveEffects({ effects: attack.effects, trigger: "perHit", attacker, defender, rng })
    ];
    if (!firstHitEffectsResolved) {
      effects.push(...resolveEffects({
        effects: attack.effects,
        trigger: "firstHitOnly",
        attacker,
        defender,
        rng
      }));
      firstHitEffectsResolved = true;
    }
    hits.push({ hit: true, damage, critical, effects });
  }

  const anyHit = hits.some(hit => hit.hit);
  const actionEffects = anyHit
    ? resolveEffects({ effects: attack.effects, trigger: "perAction", attacker, defender, rng })
    : [];
  return createCombatResult("physicalAttack", {
    attackId: attack.id || "normal_attack",
    hitRate,
    criticalRate,
    attackPower,
    attackStat,
    attackStatMultiplier,
    ignoresDefense: Boolean(attack.ignoresDefense),
    effectiveDefense,
    defensePenetration: penetration,
    hits,
    totalDamage: hits.reduce((total, hit) => total + hit.damage, 0),
    actionEffects
  });
}

export function calculatePhysicalHitRate({ attacker = {}, defender = {}, attack = {} } = {}) {
  const illusion = getActiveStatus(defender, "illusion");
  const minimum = illusion?.physicalHitRateFloor
    ?? defender.physicalHitMinimum
    ?? COMBAT_CONFIG.physicalHitMinimum;
  const penalty = illusion?.physicalHitPenalty || 0;
  return clamp(
    COMBAT_CONFIG.physicalHitBase
      + (numeric(attacker.dex) - numeric(defender.agi)) * COMBAT_CONFIG.physicalHitStatStep
      + numeric(attacker.hitBonus)
      + numeric(attack.hitBonus)
      - numeric(defender.evasionBonus)
      - penalty,
    minimum,
    COMBAT_CONFIG.physicalHitMaximum
  );
}

export function calculateCriticalRate({ attacker = {}, attack = {} } = {}) {
  return clamp(
    COMBAT_CONFIG.criticalRateBase
      + numeric(attacker.dex) * COMBAT_CONFIG.criticalDexMultiplier
      + numeric(attacker.criticalBonus)
      + numeric(attack.criticalBonus),
    0,
    COMBAT_CONFIG.criticalRateMaximum
  );
}

function getActiveStatus(target, id) {
  const status = target.statuses?.find(item => item.id === id || item.statusId === id);
  return status?.active === false ? null : status;
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
