import test from "node:test";
import assert from "node:assert/strict";

import { CHARACTER_CLASSES, createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getWeapon } from "../data/weapons.js";
import { collectEquipmentBonuses, getEquipmentItem } from "../data/equipment.js";
import { getSkill } from "../data/skills.js";
import { collectStats } from "../combat/collect-stats.js";
import { createNormalAttack, createSkillAttack } from "../combat/create-attack.js";
import {
  calculatePhysicalHitRate,
  resolvePhysicalAttack
} from "../combat/resolve-physical-attack.js";
import { resolveSpell } from "../combat/resolve-spell.js";
import { resolveHealing } from "../combat/resolve-healing.js";
import { resolveStatusEffect } from "../combat/resolve-status-effect.js";
import { resolveInstantDeath } from "../combat/resolve-status-effect.js";
import {
  calculateSurpriseRate,
  resolveEnvironmentSave
} from "../combat/resolve-environment-save.js";
import { resolveEscapeAttempt } from "../combat/resolve-escape.js";
import { resolveTurnOrder, createGuardAction } from "../combat/resolve-turn-order.js";
import {
  applyStatus,
  applyStatusApplications,
  resolveActionOpportunity,
  resolveEndOfAction
} from "../combat/status-lifecycle.js";
import {
  createInnRecovery,
  createTempleRevival
} from "../js/character-services.js";

const fixed = (...values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
};

test("all classes have 24 stat points and 45 HP+SP", () => {
  for (const characterClass of Object.values(CHARACTER_CLASSES)) {
    assert.equal(Object.values(characterClass.stats).reduce((a, b) => a + b, 0), 24);
    assert.equal(characterClass.maxHp + characterClass.maxSp, 45);
  }
});

test("initial equipment matches every class profile", () => {
  const expected = {
    warrior: { weapon: "鉄の長剣", attack: 8, def: 8, int: 0 },
    thief: { weapon: "鉄の短剣", attack: 5, def: 5, int: 0 },
    priest: { weapon: "鉄のメイス", attack: 6, def: 5, int: 0 },
    mage: { weapon: "樫の杖", attack: 3, def: 2, int: 1 }
  };
  for (const [job, profile] of Object.entries(expected)) {
    const character = createInitialCharacter({ name: "TEST", job });
    const weapon = getEquipmentItem(character.equipment.rightArmId, "rightArmId");
    const bonuses = collectEquipmentBonuses(character.equipment);
    assert.equal(weapon.name, profile.weapon);
    assert.equal(weapon.attack, profile.attack);
    assert.equal(bonuses.def || 0, profile.def);
    assert.equal(bonuses.int || 0, profile.int);
    assert.equal(character.equipment.accessoryId, null);
  }
});

test("equipment bonuses are included in combat stats", () => {
  const warrior = createInitialCharacter({ name: "TEST", job: "warrior" });
  const mage = createInitialCharacter({ name: "TEST", job: "mage" });
  assert.equal(collectStats(warrior).def, 8);
  assert.equal(collectStats(mage).def, 2);
  assert.equal(collectStats(mage).int, 9);
});

test("collected main stats are capped at 30", () => {
  const stats = collectStats({
    baseStats: { str: 29, int: 30, agi: 40, dex: 5, luc: 5 },
    equipmentStatBonuses: { str: 9, int: 9, agi: 9, dex: 40, luc: 40 }
  });
  for (const key of ["str", "int", "agi", "dex", "luc"]) assert.ok(stats[key] <= 30);
});

test("fixed RNG reproduces physical attack results", () => {
  const args = {
    attacker: { str: 8, dex: 5 },
    defender: { agi: 5, def: 4 },
    attack: createNormalAttack({ weapon: getWeapon("iron_longsword") })
  };
  assert.deepEqual(
    resolvePhysicalAttack({ ...args, rng: fixed(0, 0.9, 0.5) }),
    resolvePhysicalAttack({ ...args, rng: fixed(0, 0.9, 0.5) })
  );
});

test("miss deals zero and a landed hit deals at least one", () => {
  const attack = createNormalAttack({ weapon: getWeapon("iron_longsword") });
  const miss = resolvePhysicalAttack({
    attacker: { str: 1, dex: 0 },
    defender: { agi: 30, def: 999 },
    attack,
    rng: fixed(0.99)
  });
  assert.equal(miss.totalDamage, 0);
  const hit = resolvePhysicalAttack({
    attacker: { str: 1, dex: 0 },
    defender: { agi: 30, def: 999 },
    attack,
    rng: fixed(0, 0.99, 0)
  });
  assert.equal(hit.totalDamage, 1);
});

test("critical is 1.5x normal with minimum two", () => {
  const attack = createNormalAttack({ weapon: { ...getWeapon("iron_longsword"), attack: 0 } });
  const result = resolvePhysicalAttack({
    attacker: { str: 0, dex: 30, criticalBonus: 1 },
    defender: { agi: 0, def: 999 },
    attack,
    rng: fixed(0, 0, 0)
  });
  assert.equal(result.hits[0].critical, true);
  assert.equal(result.totalDamage, 2);
});

test("dagger normal attack is two hits, power strike one, poison blade two", () => {
  const weapon = getWeapon("iron_dagger");
  assert.equal(createNormalAttack({ weapon }).hitCount, 2);
  assert.equal(createSkillAttack(getSkill("power_strike"), { weapon }).hitCount, 1);
  assert.equal(createSkillAttack(getSkill("poison_blade"), { weapon }).hitCount, 2);
});

test("poison blade resolves poison once on the first landed hit", () => {
  const result = resolvePhysicalAttack({
    attacker: { str: 4, dex: 30 },
    defender: { agi: 0, def: 0, luc: 0, statusResistances: {} },
    attack: createSkillAttack(getSkill("poison_blade"), { weapon: getWeapon("iron_dagger") }),
    rng: fixed(0, 0.9, 0.5, 0, 0, 0.9, 0.5)
  });
  assert.equal(result.hits.length, 2);
  assert.equal(result.hits.flatMap(hit => hit.effects).length, 1);
});

test("defense penetration is capped at 75 percent", () => {
  const result = resolvePhysicalAttack({
    attacker: { str: 8, dex: 5, defensePenetration: 1 },
    defender: { agi: 5, def: 20 },
    attack: { ...createNormalAttack({ weaponId: "iron_mace" }), defensePenetration: 1 },
    rng: fixed(0, 0.9, 0.5)
  });
  assert.equal(result.defensePenetration, 0.75);
});

test("fireball is unavoidable, immunity is zero and weakness is 1.5x", () => {
  const fireball = getSkill("fireball");
  const immune = resolveSpell({
    attacker: { int: 8 },
    defender: { elementMultipliers: { fire: 0 } },
    spell: fireball,
    rng: fixed(0.5)
  });
  assert.equal(immune.hitRate, 1);
  assert.equal(immune.totalDamage, 0);
  const normal = resolveSpell({
    attacker: { int: 8 },
    defender: { elementMultipliers: { fire: 1 } },
    spell: fireball,
    rng: fixed(0.5)
  });
  const weak = resolveSpell({
    attacker: { int: 8 },
    defender: { elementMultipliers: { fire: 1.5 } },
    spell: fireball,
    rng: fixed(0.5)
  });
  assert.equal(weak.totalDamage, Math.floor(normal.totalDamage * 1.5));
});

test("healing uses no RNG and cannot overheal", () => {
  let calls = 0;
  const result = resolveHealing({
    caster: { int: 6 },
    target: { hp: 18, maxHp: 20 },
    healing: getSkill("healing_prayer"),
    rng: () => { calls += 1; return 0; }
  });
  assert.equal(result.calculatedHealing, 13);
  assert.equal(result.actualHealing, 2);
  assert.equal(calls, 0);
});

test("ice immunity does not prevent ice bind status roll", () => {
  const result = resolveSpell({
    attacker: { int: 30 },
    defender: {
      luc: 0,
      elementMultipliers: { ice: 0 },
      statusResistances: {}
    },
    spell: getSkill("ice_bind"),
    rng: fixed(0.5, 0)
  });
  assert.equal(result.totalDamage, 0);
  assert.equal(result.actionEffects.length, 1);
  assert.equal(result.actionEffects[0].success, true);
});

test("immune status always fails", () => {
  const result = resolveStatusEffect({
    attacker: { dex: 30 },
    defender: {
      luc: 0,
      statusResistances: { poison: { resistancePoints: 0, immune: true } }
    },
    effect: { statusId: "poison", statusKind: "physical", baseRate: 1 },
    rng: fixed(0)
  });
  assert.equal(result.success, false);
  assert.equal(result.rate, 0);
});

test("environment saves expose the configured success effect", () => {
  const result = resolveEnvironmentSave({
    target: { luc: 20 },
    effect: { baseSaveRate: 0.1, saveSuccessEffect: "halfDamage" },
    rng: fixed(0)
  });
  assert.equal(result.rate, 0.4);
  assert.equal(result.success, true);
  assert.equal(result.successEffect, "halfDamage");
});

test("instant death is capped at 50 percent and immunity is zero", () => {
  const capped = resolveInstantDeath({
    defender: { luc: 0, statusResistances: {} },
    baseRate: 1,
    rng: fixed(0.49)
  });
  assert.equal(capped.rate, 0.5);
  assert.equal(capped.success, true);
  const immune = resolveInstantDeath({
    defender: {
      luc: 0,
      statusResistances: { instantDeath: { immune: true } }
    },
    baseRate: 1,
    rng: fixed(0)
  });
  assert.equal(immune.rate, 0);
  assert.equal(immune.success, false);
});

test("surprise chance is reduced by LUC and never below zero", () => {
  assert.ok(Math.abs(calculateSurpriseRate({
    player: { luc: 30 },
    enemyBaseRate: 0.2,
    enemyMaximum: 0.5
  }) - 0.05) < Number.EPSILON);
  assert.equal(calculateSurpriseRate({
    player: { luc: 30, surpriseResistance: 1 },
    enemyBaseRate: 0.2,
    enemyMaximum: 0.5
  }), 0);
});

test("escape uses the enemy escape rate with injectable RNG", () => {
  assert.equal(resolveEscapeAttempt({ escapeRate: 0.75, rng: fixed(0.74) }).success, true);
  assert.equal(resolveEscapeAttempt({ escapeRate: 0.75, rng: fixed(0.75) }).success, false);
});

test("poison damages at target action end and lasts three ticks", () => {
  let statuses = applyStatus([], { statusId: "poison", success: true });
  assert.equal(statuses[0].remainingTurns, 3);
  const damages = [];
  for (let index = 0; index < 3; index += 1) {
    const end = resolveEndOfAction({ statuses, maxHp: 100 });
    statuses = end.statuses;
    damages.push(end.poisonDamage);
  }
  assert.deepEqual(damages, [5, 5, 5]);
  assert.equal(statuses.length, 0);
});

test("same status refreshes instead of stacking", () => {
  let statuses = applyStatus([], { statusId: "poison", success: true });
  statuses = resolveEndOfAction({ statuses, maxHp: 100 }).statuses;
  statuses = applyStatus(statuses, { statusId: "poison", success: true });
  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].remainingTurns, 3);
});

test("action skip consumes one opportunity and is removed", () => {
  const statuses = applyStatusApplications([], [{ statusId: "action_skip", success: true }]);
  const result = resolveActionOpportunity(statuses);
  assert.equal(result.skipped, true);
  assert.equal(result.statuses.length, 0);
});

test("turn order uses AGI, speed modifier and raw AGI tie-break", () => {
  const ordered = resolveTurnOrder([
    { id: "slow", actor: { agi: 5 }, action: { speedModifier: 0 } },
    { id: "fast", actor: { agi: 10 }, action: { speedModifier: 0 } }
  ], fixed(0, 0, 0, 0));
  assert.equal(ordered[0].id, "fast");
  const tied = resolveTurnOrder([
    { id: "lowAgi", actor: { agi: 5 }, action: { speedModifier: 10 } },
    { id: "highAgi", actor: { agi: 10 }, action: { speedModifier: 0 } }
  ], fixed(0, 0, 0, 0));
  assert.equal(tied[0].id, "highAgi");
  assert.equal(createGuardAction().speedModifier, 15);
});

test("illusion changes the physical hit floor to 50 percent", () => {
  const rate = calculatePhysicalHitRate({
    attacker: { dex: 0 },
    defender: {
      agi: 30,
      statuses: [{
        id: "illusion",
        physicalHitPenalty: 0.2,
        physicalHitRateFloor: 0.5
      }]
    },
    attack: {}
  });
  assert.equal(rate, 0.5);
});

test("initial character receives class vitals, stats and three skills", () => {
  const priest = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(priest.maxHp, 20);
  assert.equal(priest.maxSp, 25);
  assert.equal(priest.baseStats.int, 6);
  assert.equal(priest.skillIds.length, 3);
});

test("legacy characters migrate to their class vitals and skills", () => {
  const mage = normalizeCharacter({
    name: "OLD",
    job: "mage",
    hp: 30,
    maxHp: 30,
    sp: 15,
    maxSp: 15,
    alive: true
  });
  assert.equal(mage.hp, 15);
  assert.equal(mage.maxHp, 15);
  assert.equal(mage.sp, 30);
  assert.equal(mage.maxSp, 30);
  assert.equal(mage.skillIds.length, 3);
});

test("inn recovery restores HP and SP to maximum", () => {
  assert.deepEqual(createInnRecovery({
    hp: 1,
    maxHp: 30,
    sp: 2,
    maxSp: 15
  }), {
    hp: 30,
    sp: 15,
    statuses: [],
    condition: "GOOD",
    alive: true
  });
});

test("temple revival restores one HP and preserves death-time SP", () => {
  assert.deepEqual(createTempleRevival({
    hp: 0,
    maxHp: 30,
    sp: 7,
    maxSp: 15
  }), {
    hp: 1,
    sp: 7,
    statuses: [],
    condition: "GOOD",
    alive: true
  });
});
