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
import { resolveFieldSkill } from "../combat/resolve-field-skill.js";
import { resolveStatusEffect } from "../combat/resolve-status-effect.js";
import { resolveInstantDeath } from "../combat/resolve-status-effect.js";
import {
  calculateSurpriseRate,
  resolveEnvironmentSave,
  resolveSurprise
} from "../combat/resolve-environment-save.js";
import { resolveEscapeAttempt } from "../combat/resolve-escape.js";
import { resolveDefeatRecovery } from "../combat/resolve-defeat-recovery.js";
import {
  createBattleState,
  createPlayerAction,
  createEnemyAction,
  resolveBattleRound,
  resolveEnemyAmbush
} from "../combat/battle-engine.js";
import { deriveDetailStats } from "../combat/derive-detail-stats.js";
import { CHARACTER_JOBS } from "../data/town.js";
import { createEnemyCombatant, getEnemyById, getRandomEnemy } from "../data/enemies.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { CARDS, collectCardStatBonuses, getCardById, hasCardEffect } from "../data/cards.js";
import { calculateDeckCost, DECK_SLOT_COUNT, grantCard, normalizeCardState, setDeckSlot } from "../data/deck.js";
import { resolveTurnOrder, createGuardAction } from "../combat/resolve-turn-order.js";
import {
  applyStatus,
  applyStatusApplications,
  clearBattleOnlyStatuses,
  getNonlethalPoisonDamage,
  resolveActionOpportunity,
  resolveEndOfAction
} from "../combat/status-lifecycle.js";
import {
  awardBattleExperience,
  createInnRecovery,
  createTempleRevival,
  resolveDungeonDefeat,
  resolveInnStay
} from "../js/character-services.js";
import {
  getExperienceForLevel,
  getDeckCostAtLevel,
  getLevelGrowth,
  MAX_EXPERIENCE,
  MAX_LEVEL
} from "../data/growth.js";

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

test("registration jobs use the intended order and localized labels", () => {
  assert.deepEqual(
    CHARACTER_JOBS.map(job => [job.id, job.labelJa, job.labelEn]),
    [
      ["warrior", "戦士", "WARRIOR"],
      ["thief", "盗賊", "THIEF"],
      ["priest", "僧侶", "PRIEST"],
      ["mage", "魔法使い", "MAGE"]
    ]
  );
});

test("initial equipment matches every class profile", () => {
  const expected = {
    warrior: { weapon: "鉄の長剣", attack: 8, def: 8, stat: "str", bonus: 1 },
    thief: { weapon: "鉄の短剣", attack: 5, def: 5, stat: "dex", bonus: 1 },
    priest: { weapon: "鉄のメイス", attack: 6, def: 5, stat: "luc", bonus: 1 },
    mage: { weapon: "樫の杖", attack: 3, def: 3, stat: "int", bonus: 2 }
  };
  for (const [job, profile] of Object.entries(expected)) {
    const character = createInitialCharacter({ name: "TEST", job });
    const weapon = getEquipmentItem(character.equipment.rightArmId, "rightArmId");
    const bonuses = collectEquipmentBonuses(character.equipment);
    assert.equal(weapon.name, profile.weapon);
    assert.equal(weapon.attack, profile.attack);
    assert.equal(bonuses.def || 0, profile.def);
    assert.equal(bonuses[profile.stat] || 0, profile.bonus);
    assert.equal(character.equipment.accessoryId, null);
  }
});

test("early enemies use the MVP difficulty profile", () => {
  const rat = getEnemyById("abyss_rat");
  const slime = getEnemyById("cave_slime");
  assert.deepEqual(
    { maxHp: rat.maxHp, def: rat.def, attack: rat.attack },
    { maxHp: 20, def: 4, attack: 4 }
  );
  assert.deepEqual(
    { maxHp: slime.maxHp, def: slime.def, attack: slime.attack },
    { maxHp: 24, def: 5, attack: 3 }
  );
  assert.equal(rat.experienceReward, 4);
  assert.equal(slime.experienceReward, 6);
});

test("B2F adds rabbit, undead and poison slime encounters", () => {
  assert.ok(["abyss_rat", "cave_slime"].includes(getRandomEnemy({ depth: 1, rng: () => 0.99 }).id));
  assert.equal(getRandomEnemy({ depth: 2, rng: () => 0.99 }).id, "poison_slime");
  assert.equal(getEnemyById("abyss_rabbit").minimumDepth, 2);
  assert.equal(getEnemyById("wandering_dead").race, "undead");
  assert.equal(getEnemyById("poison_slime").minimumDepth, 2);
});

test("poison slime sometimes selects an attack that can inflict poison", () => {
  const enemy = createEnemyCombatant(getEnemyById("poison_slime"));
  const special = createEnemyAction(enemy, () => 0.2);
  const normal = createEnemyAction(enemy, () => 0.3);
  assert.equal(special.name, "毒攻撃");
  assert.equal(special.effects[0].statusId, "poison");
  assert.equal(normal.name, "攻撃");
  assert.equal(normal.effects.length, 0);
});

test("enemy action tables select weighted spells and multi-hit attacks", () => {
  const enemy = createBossCombatant(getBossById("otherworldly_wisdom_b4f"));
  const fourHits = createEnemyAction(enemy, () => 0.1);
  const flame = createEnemyAction(enemy, () => 0.3);
  const frost = createEnemyAction(enemy, () => 0.6);
  const ray = createEnemyAction(enemy, () => 0.9);
  assert.equal(fourHits.id, "four_world_assault");
  assert.equal(fourHits.actionType, "physicalAttack");
  assert.equal(fourHits.hitCount, 4);
  assert.equal(flame.id, "otherworldly_flame");
  assert.equal(flame.actionType, "spell");
  assert.equal(frost.effects[0].statusId, "speed_down");
  assert.equal(ray.id, "otherworldly_ray");
});

test("all initial classes can damage the adjusted cave slime", () => {
  const slime = getEnemyById("cave_slime");
  const expectedDamage = { warrior: 10, thief: 4, priest: 6, mage: 10 };
  for (const [job, damage] of Object.entries(expectedDamage)) {
    const character = createInitialCharacter({ name: "TEST", job });
    const stats = collectStats(character);
    const weapon = getEquipmentItem(character.equipment.rightArmId, "rightArmId");
    const result = resolvePhysicalAttack({
      attacker: stats,
      defender: { agi: slime.stats.agi, def: slime.def },
      attack: createNormalAttack({ weapon }),
      rng: fixed(0, 0.9, 0.5, 0, 0.9, 0.5)
    });
    assert.equal(result.totalDamage, damage);
  }
});

test("the oak staff alone uses 0.75 INT and ignores defense", () => {
  const mage = createInitialCharacter({ name: "TEST", job: "mage" });
  const stats = collectStats(mage);
  const attack = createNormalAttack({ weapon: getWeapon("oak_staff") });
  const result = resolvePhysicalAttack({
    attacker: stats,
    defender: { agi: 5, def: 99 },
    attack,
    rng: fixed(0, 0.9, 0.5)
  });
  assert.equal(attack.attackStat, "int");
  assert.equal(attack.attackStatMultiplier, 0.75);
  assert.equal(attack.ignoresDefense, true);
  assert.equal(result.attackStat, "int");
  assert.equal(result.effectiveDefense, 0);
  assert.equal(result.totalDamage, 10);
});

test("future staves do not inherit the oak staff rescue attack", () => {
  const attack = createNormalAttack({ weapon: {
    id: "future_staff", name: "TEST", type: "staff", attack: 0, element: "physical"
  } });
  assert.equal(attack.attackStat, "str");
  assert.equal(attack.attackStatMultiplier, undefined);
  assert.equal(attack.ignoresDefense, false);
});

test("Wisdom to Power adds half INT to normal attacks except with the oak staff", () => {
  const attacker = { str: 2, int: 10, dex: 0, agi: 10 };
  const defender = { agi: 0, def: 4 };
  const futureStaff = {
    id: "future_staff", name: "TEST", type: "staff", attack: 0, element: "physical"
  };
  const passiveAttack = createNormalAttack({
    weapon: futureStaff,
    skillIds: ["wisdom_to_power"]
  });
  const passiveResult = resolvePhysicalAttack({
    attacker,
    defender,
    attack: passiveAttack,
    rng: fixed(0, 0.9, 0.5)
  });
  const oakAttack = createNormalAttack({
    weapon: getWeapon("oak_staff"),
    skillIds: ["wisdom_to_power"]
  });

  assert.deepEqual(passiveAttack.additionalAttackStats, [{ stat: "int", multiplier: 0.5 }]);
  assert.equal(passiveResult.totalDamage, 4);
  assert.deepEqual(oakAttack.additionalAttackStats, []);
});

test("equipment bonuses are included in combat stats", () => {
  const warrior = createInitialCharacter({ name: "TEST", job: "warrior" });
  const mage = createInitialCharacter({ name: "TEST", job: "mage" });
  assert.equal(collectStats(warrior).def, 8);
  assert.equal(collectStats(mage).def, 3);
  assert.equal(collectStats(mage).int, 10);
});

test("detail status derives current character percentages", () => {
  const warrior = deriveDetailStats(createInitialCharacter({ name: "TEST", job: "warrior" }));
  assert.deepEqual(warrior, {
    physicalAttack: 12.5,
    spellAttack: 1,
    physicalDamage: 100,
    spellDamage: 100,
    spellResistance: 0,
    criticalRate: 5.5,
    evasionRate: 5,
    hitRate: 95,
    initiativeRate: 0,
    trapDisarmRate: 10,
    statusResistance: 4,
    torchReduction: 0,
    presenceReduction: 0
  });
});

test("detail status attack power includes weapon and equipment stats", () => {
  const mage = deriveDetailStats(createInitialCharacter({ name: "TEST", job: "mage" }));
  assert.equal(mage.physicalAttack, 10.5);
  assert.equal(mage.spellAttack, 5);
});

test("detail status includes the dagger DEX damage contribution", () => {
  const thief = createInitialCharacter({ name: "TEST", job: "thief" });
  const stats = collectStats(thief);
  assert.equal(deriveDetailStats(thief).physicalAttack, 5 + stats.str * 0.5 + stats.dex * 0.25);
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

test("combatants can define a lower physical hit floor and an evasion bonus", () => {
  assert.ok(Math.abs(calculatePhysicalHitRate({
    attacker: { dex: 4 },
    defender: { agi: 12, evasionBonus: 0.2, physicalHitMinimum: 0.65 }
  }) - 0.67) < Number.EPSILON);
  assert.ok(Math.abs(calculatePhysicalHitRate({
    attacker: { dex: 3, hitBonus: -0.2 },
    defender: { agi: 7 }
  }) - 0.71) < Number.EPSILON);
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

test("dagger normal attack, quick strike and poison blade are two hits", () => {
  const weapon = getWeapon("iron_dagger");
  assert.equal(createNormalAttack({ weapon }).hitCount, 2);
  assert.equal(createSkillAttack(getSkill("power_strike"), { weapon }).hitCount, 1);
  const quickStrike = createSkillAttack(getSkill("quick_strike"), { weapon });
  assert.equal(quickStrike.hitCount, 2);
  assert.equal(quickStrike.powerPerHit, 0.9);
  assert.equal(createSkillAttack(getSkill("poison_blade"), { weapon }).hitCount, 2);
});

test("dagger attacks add one quarter of DEX to attack power", () => {
  const attack = createNormalAttack({ weapon: getWeapon("iron_dagger") });
  const result = resolvePhysicalAttack({
    attacker: { str: 0, dex: 8 },
    defender: { agi: 0, def: 0 },
    attack,
    rng: fixed(0, 0.99, 0.5, 0, 0.99, 0.5)
  });
  assert.equal(result.attackPower, 7);
});

test("dagger battle round exposes two separate hit presentation events", () => {
  const thief = createInitialCharacter({ name: "THIEF", job: "thief" });
  const enemy = {
    id: "dummy",
    name: "DUMMY",
    hp: 99,
    maxHp: 99,
    sp: 0,
    maxSp: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0,
    attack: 1,
    statuses: [],
    alive: true
  };
  const resolved = resolveBattleRound({
    battle: createBattleState({ character: thief, enemy }),
    playerCommand: { type: "attack" },
    rng: fixed(0.5, 0.5, 0, 0.9, 0.5, 0, 0.9, 0.5, 0, 0.9)
  });
  const playerHits = resolved.battle.presentationEvents.filter(event =>
    event.actorSide === "player" && event.targetSide === "enemy"
  );
  assert.equal(playerHits.length, 2);
  assert.equal(playerHits[0].hitIndex, 0);
  assert.equal(playerHits[0].actorName, thief.name);
  assert.equal(playerHits[1].hitIndex, 1);
  assert.equal(playerHits[0].hitCount, 2);
  assert.equal(playerHits[1].hitCount, 2);
  assert.match(resolved.battle.log.join("\n"), /1撃目：/);
  assert.match(resolved.battle.log.join("\n"), /2撃目：/);
  assert.match(resolved.battle.log.join("\n"), /合計\d+ダメージ/);
});

test("healing skill exposes a green-number presentation event", () => {
  const priest = createInitialCharacter({ name: "PRIEST", job: "priest" });
  priest.hp = 5;
  const enemy = {
    id: "dummy",
    name: "DUMMY",
    hp: 99,
    maxHp: 99,
    sp: 0,
    maxSp: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0,
    attack: 1,
    statuses: [],
    alive: true
  };
  const resolved = resolveBattleRound({
    battle: createBattleState({ character: priest, enemy }),
    playerCommand: { type: "skill", skillId: "healing_prayer" },
    rng: fixed(0.5, 0.5, 0.5, 0.5, 0.5)
  });
  const healing = resolved.battle.presentationEvents.find(event => event.type === "healing");
  assert.equal(healing.targetSide, "player");
  assert.equal(healing.amount, 13);
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

test("magic damage reduction lowers final spell damage without changing status resistance", () => {
  const spell = { id: "test_spell", element: "arcane", spellPower: 100, powerMultiplier: 1, unavoidable: true };
  const normal = resolveSpell({ attacker: { int: 0 }, defender: {}, spell, rng: () => 0.5 });
  const protectedResult = resolveSpell({
    attacker: { int: 0 },
    defender: { magicDamageReduction: 0.15 },
    spell,
    rng: () => 0.5
  });
  assert.equal(protectedResult.totalDamage, Math.floor(normal.totalDamage * 0.85));
});

test("all implemented enemies and bosses expose internal reference levels", () => {
  for (const id of ["abyss_rat", "cave_slime", "abyss_rabbit", "wandering_dead", "poison_slime", "vampire_bat", "bouncing_coin", "viper", "mimic"]) {
    const enemy = getEnemyById(id);
    assert.ok(Number.isInteger(enemy.level) && enemy.level > 0, id);
    assert.equal(createEnemyCombatant(enemy).level, enemy.level);
  }
  for (const id of ["lingering_ghost_b2f", "otherworldly_wisdom_b4f", "fallen_mage_b19f", "iron_maiden_b29f", "quest_mimic_b6f", "strange_knight_statue_b9f"]) {
    const boss = getBossById(id);
    assert.ok(Number.isInteger(boss.level) && boss.level > 0, id);
    assert.equal(createBossCombatant(boss).level, boss.level);
  }
  assert.equal(getBossById("fallen_mage_b19f").level, 22);
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

test("normal enemy surprise is capped at 30 percent and resistance at 15 percent", () => {
  assert.equal(calculateSurpriseRate({
    player: { luc: 0 },
    enemyBaseRate: 0.8,
    enemyMaximum: 0.8
  }), 0.3);
  assert.equal(calculateSurpriseRate({
    player: { luc: 30, surpriseResistance: 0.15 },
    enemyBaseRate: 0.3,
    enemyMaximum: 0.3
  }), 0);
  assert.equal(calculateSurpriseRate({
    player: { luc: 0, surpriseResistance: 0.9 },
    enemyBaseRate: 0.3,
    enemyMaximum: 0.3
  }), 0.15);
  assert.equal(calculateSurpriseRate({
    player: { luc: 0 },
    enemyBaseRate: 0.8,
    enemyMaximum: 0.8,
    ignoreNormalCap: true
  }), 0.8);
});

test("surprise saving throw uses the final reduced rate", () => {
  assert.equal(resolveSurprise({
    player: { luc: 10 },
    enemyBaseRate: 0.15,
    enemyMaximum: 0.3,
    rng: fixed(0.09)
  }).ambush, true);
  assert.equal(resolveSurprise({
    player: { luc: 10 },
    enemyBaseRate: 0.15,
    enemyMaximum: 0.3,
    rng: fixed(0.1)
  }).ambush, false);
});

test("zero torch fuel can force an ambush regardless of normal resistance", () => {
  const result = resolveSurprise({
    player: { luc: 30, surpriseResistance: 0.15 },
    enemyBaseRate: 0,
    forceAmbush: true,
    rng: fixed(0.999)
  });
  assert.equal(result.ambush, true);
  assert.equal(result.rate, 1);
});

test("enemy ambush grants exactly one enemy opening action", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const enemy = createEnemyCombatant(getEnemyById("abyss_rat"));
  const battle = createBattleState({ character, enemy });
  const resolved = resolveEnemyAmbush({ battle, rng: fixed(0) });
  assert.equal(resolved.accepted, true);
  assert.equal(resolved.battle.enemy.hp, enemy.hp);
  assert.ok(resolved.battle.player.hp < character.hp);
  assert.ok(resolved.battle.presentationEvents.every(event => event.targetSide === "player"));
  assert.equal(resolved.battle.phase, "command");
});

test("escape uses the enemy escape rate with injectable RNG", () => {
  assert.equal(resolveEscapeAttempt({ escapeRate: 0.75, rng: fixed(0.74) }).success, true);
  assert.equal(resolveEscapeAttempt({ escapeRate: 0.75, rng: fixed(0.75) }).success, false);
});

test("poison damages at target action end and never expires naturally", () => {
  let statuses = applyStatus([], { statusId: "poison", success: true });
  assert.equal(statuses[0].remainingTurns, undefined);
  const damages = [];
  for (let index = 0; index < 10; index += 1) {
    const end = resolveEndOfAction({ statuses, maxHp: 100 });
    statuses = end.statuses;
    damages.push(end.poisonDamage);
  }
  assert.deepEqual(damages, Array(10).fill(5));
  assert.equal(statuses.length, 1);
});

test("poison damage stops at one HP", () => {
  assert.equal(getNonlethalPoisonDamage(10, 5), 5);
  assert.equal(getNonlethalPoisonDamage(3, 5), 2);
  assert.equal(getNonlethalPoisonDamage(1, 5), 0);

  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.hp = 3;
  character.maxHp = 100;
  character.statuses = applyStatus([], { statusId: "poison", success: true });
  const defeatedEnemy = {
    id: "test_enemy", name: "TEST ENEMY", race: "beast", hp: 0, maxHp: 1,
    sp: 0, maxSp: 0, stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0, attack: 0, experienceReward: 0, statuses: [], equipment: {},
    elementMultipliers: {}, statusResistances: {}, isBoss: false, alive: false
  };
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: defeatedEnemy }),
    playerCommand: { type: "wait" },
    rng: fixed(0)
  });
  assert.equal(result.battle.player.hp, 1);
  assert.equal(result.battle.player.alive, true);
});

test("same status refreshes instead of stacking", () => {
  let statuses = applyStatus([], { statusId: "poison", success: true });
  statuses = resolveEndOfAction({ statuses, maxHp: 100 }).statuses;
  statuses = applyStatus(statuses, { statusId: "poison", success: true });
  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].remainingTurns, undefined);
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

test("initial character receives class vitals and starting skills", () => {
  const priest = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(priest.maxHp, 20);
  assert.equal(priest.maxSp, 25);
  assert.equal(priest.baseStats.int, 6);
  assert.equal(priest.skillIds.length, 3);
});

test("every initial skill has a display description", () => {
  for (const jobId of ["warrior", "thief", "priest", "mage"]) {
    const character = createInitialCharacter({ name: "TEST", job: jobId });
    for (const skillId of character.skillIds) {
      const skill = getSkill(skillId);
      assert.equal(typeof skill.description, "string");
      assert.ok(skill.description.length > 0);
      assert.ok(skill.description.split("\n").length <= 2);
    }
  }
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
  assert.equal(mage.skillIds.length, 4);
});

test("Magic Wall blocks three weak physical actions but not a strong hit", () => {
  const mage = createInitialCharacter({ name: "M", job: "mage" });
  const rat = createEnemyCombatant(getEnemyById("abyss_rat"));
  let battle = createBattleState({ character: mage, enemy: rat });
  const startingHp = battle.player.hp;

  let round = resolveBattleRound({
    battle,
    playerCommand: { type: "skill", skillId: "magic_wall" },
    rng: () => 0.5
  });
  assert.equal(round.accepted, true);
  battle = round.battle;
  assert.equal(battle.player.hp, startingHp);
  assert.equal(battle.player.statuses.find(status => status.statusId === "magic_wall")?.barrierCharges, 2);
  assert.equal(createPlayerAction(battle.player, { type: "skill", skillId: "magic_wall" }).reason, "alreadyActive");

  for (const remaining of [1, 0]) {
    round = resolveBattleRound({ battle, playerCommand: { type: "wait" }, rng: () => 0.5 });
    battle = round.battle;
    assert.equal(battle.player.hp, startingHp);
    assert.equal(battle.player.statuses.find(status => status.statusId === "magic_wall")?.barrierCharges || 0, remaining);
  }

  const strongEnemy = createEnemyCombatant({
    ...getEnemyById("abyss_rat"), id: "strong_test_enemy", attack: 20,
    stats: { ...getEnemyById("abyss_rat").stats, str: 10 }
  });
  const strongRound = resolveBattleRound({
    battle: createBattleState({ character: mage, enemy: strongEnemy }),
    playerCommand: { type: "skill", skillId: "magic_wall" },
    rng: () => 0.5
  });
  assert.ok(strongRound.battle.player.hp < startingHp);
  assert.equal(strongRound.battle.player.statuses.find(status => status.statusId === "magic_wall")?.barrierCharges, 3);
});

test("Magic Wall blocks the rat, rabbit, slime and lingering ghost normal attacks", () => {
  const enemies = [
    createEnemyCombatant(getEnemyById("abyss_rat")),
    createEnemyCombatant(getEnemyById("abyss_rabbit")),
    createEnemyCombatant(getEnemyById("cave_slime")),
    createBossCombatant(getBossById("lingering_ghost_b2f"))
  ];
  for (const enemy of enemies) {
    const mage = createInitialCharacter({ name: "M", job: "mage" });
    const round = resolveBattleRound({
      battle: createBattleState({ character: mage, enemy }),
      playerCommand: { type: "skill", skillId: "magic_wall" },
      rng: () => 0.5
    });
    assert.equal(round.battle.player.hp, mage.hp, enemy.name);
    assert.equal(round.battle.player.statuses.find(status => status.statusId === "magic_wall")?.barrierCharges, 2, enemy.name);
  }
});

test("existing mage saves receive Magic Wall as a starting skill", () => {
  const mage = normalizeCharacter({
    ...createInitialCharacter({ name: "OLD", job: "mage" }),
    skillIds: ["fireball", "ice_bind", "illusion"]
  });
  assert.equal(mage.skillIds.includes("magic_wall"), true);
});

test("Magic Wall expires when battle-only statuses are cleared", () => {
  const statuses = applyStatusApplications([], [{ statusId: "magic_wall", success: true }]);
  assert.equal(statuses[0].barrierCharges, 3);
  assert.deepEqual(clearBattleOnlyStatuses(statuses), []);
});

test("inn recovery restores HP and SP to maximum", () => {
  assert.deepEqual(createInnRecovery({
    hp: 1,
    maxHp: 30,
    sp: 2,
    maxSp: 15,
    statuses: [{ statusId: "poison" }],
    condition: "POISON"
  }), {
    hp: 30,
    sp: 15,
    statuses: [{ statusId: "poison" }],
    condition: "POISON",
    alive: true
  });
});

test("legacy poison turn counters are removed when character data is normalized", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.statuses = [{ statusId: "poison", remainingTurns: 3 }];
  character.condition = "POISON";
  const normalized = normalizeCharacter(character);
  assert.equal(normalized.statuses.length, 1);
  assert.equal(normalized.statuses[0].statusId, "poison");
  assert.equal(normalized.statuses[0].remainingTurns, undefined);
  assert.equal(normalized.condition, "POISON");
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

test("dungeon defeat loses carried experience unless it is protected", () => {
  const character = {
    hp: 0,
    sp: 7,
    carriedExperience: 345,
    statuses: [{ statusId: "poison", remainingTurns: 3 }]
  };
  assert.equal(resolveDungeonDefeat(character).carriedExperience, 0);
  assert.equal(
    resolveDungeonDefeat(character, { preserveExperience: true }).carriedExperience,
    345
  );
  assert.equal(resolveDungeonDefeat(character).hp, 1);
  assert.equal(resolveDungeonDefeat(character).sp, 7);
});

test("growth curve reaches the formal level 197 HP and SP caps", () => {
  assert.deepEqual(getLevelGrowth("warrior", MAX_LEVEL), {
    level: 197,
    hp: 999,
    sp: 650,
    deckCost: 48
  });
  assert.deepEqual(getLevelGrowth("priest", MAX_LEVEL), {
    level: 197,
    hp: 750,
    sp: 850,
    deckCost: 48
  });
  assert.equal(getExperienceForLevel(2), 10);
  assert.equal(getExperienceForLevel(5), 70);
  assert.equal(getExperienceForLevel(6), 105);
  assert.equal(getExperienceForLevel(10), 390);
  assert.equal(getExperienceForLevel(197), MAX_EXPERIENCE);
});

test("HP and SP growth is front-loaded without changing endpoints or job identities", () => {
  const jobs = [
    ["warrior", 30, 15, 999, 650, 50, 27],
    ["thief", 25, 20, 850, 750, 43, 34],
    ["priest", 20, 25, 750, 850, 34, 43],
    ["mage", 15, 30, 650, 999, 27, 50]
  ];

  for (const [jobId, initialHp, initialSp, finalHp, finalSp, targetHp10, targetSp10] of jobs) {
    const levels = Array.from({ length: MAX_LEVEL }, (_, index) => getLevelGrowth(jobId, index + 1));
    assert.equal(levels[0].hp, initialHp);
    assert.equal(levels[0].sp, initialSp);
    assert.equal(levels.at(-1).hp, finalHp);
    assert.equal(levels.at(-1).sp, finalSp);
    assert.ok(Math.abs(levels[9].hp - targetHp10) <= 1);
    assert.ok(Math.abs(levels[9].sp - targetSp10) <= 1);

    for (let index = 1; index < levels.length; index += 1) {
      const previous = levels[index - 1];
      const current = levels[index];
      assert.ok(Number.isInteger(current.hp) && Number.isInteger(current.sp));
      assert.ok(current.hp >= previous.hp);
      assert.ok(current.sp >= previous.sp);
      assert.ok(current.hp <= 999 && current.sp <= 999);
      if (current.level <= 10) {
        assert.ok(current.hp > previous.hp || current.sp > previous.sp);
      }
    }
  }

  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    const [warrior, thief, priest, mage] = jobs.map(([jobId]) => getLevelGrowth(jobId, level));
    assert.ok(warrior.hp >= thief.hp && thief.hp >= priest.hp && priest.hp >= mage.hp);
    assert.ok(mage.sp >= priest.sp && priest.sp >= thief.sp && thief.sp >= warrior.sp);
  }
});

test("deck cost starts at three and rises only at prime-numbered levels", () => {
  for (const [level, deckCost] of [
    [1, 3], [2, 4], [3, 5], [4, 5], [5, 6],
    [22, 11], [23, 12], [196, 47], [197, 48]
  ]) {
    assert.equal(getDeckCostAtLevel(level), deckCost);
  }
  const priest = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(priest.deckCost, 3);
  assert.equal(normalizeCharacter({ ...priest, level: 23 }).deckCost, 12);
});

test("new characters have an empty six-slot card deck ready for future cards", () => {
  const warrior = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.deepEqual(warrior.cards.ownedCardIds, []);
  assert.equal(warrior.cards.deckSlots.length, DECK_SLOT_COUNT);
  assert.ok(warrior.cards.deckSlots.every(cardId => cardId === null));
  assert.equal(calculateDeckCost(warrior.cards.deckSlots), 0);
});

test("card deck normalization rejects unknown, unowned, duplicate and over-cost cards", () => {
  const normalized = normalizeCardState({
    ownedCardIds: [
      "common_strength_up",
      "rare_defense_up",
      "legendary_unlimited_torch_gauge",
      "unknown"
    ],
    deckSlots: [
      "common_strength_up",
      "common_strength_up",
      "rare_defense_up",
      "legendary_unlimited_torch_gauge",
      "unknown",
      null
    ]
  }, 3);
  assert.deepEqual(normalized.ownedCardIds, [
    "common_strength_up",
    "rare_defense_up",
    "legendary_unlimited_torch_gauge"
  ]);
  assert.deepEqual(normalized.deckSlots, [
    "common_strength_up",
    null,
    "rare_defense_up",
    null,
    null,
    null
  ]);
  assert.equal(calculateDeckCost(normalized.deckSlots), 3);
});

test("inn deck editing equips and removes owned cards without exceeding cost", () => {
  const empty = {
    ownedCardIds: ["common_strength_up", "rare_defense_up"],
    deckSlots: Array(DECK_SLOT_COUNT).fill(null)
  };
  const withCommon = setDeckSlot(empty, 0, "common_strength_up", 3);
  const full = setDeckSlot(withCommon, 1, "rare_defense_up", 3);
  assert.deepEqual(full.deckSlots.slice(0, 2), ["common_strength_up", "rare_defense_up"]);
  assert.equal(calculateDeckCost(full.deckSlots), 3);
  assert.deepEqual(setDeckSlot(full, 2, "common_strength_up", 3), full);
  assert.equal(setDeckSlot(full, 0, null, 3).deckSlots[0], null);
});

test("common event cards share inventory with future drops and apply deck bonuses", () => {
  const initial = createInitialCharacter({ name: "TEST", job: "warrior" });
  const first = grantCard(initial.cards, "common_strength_up", 1, initial.deckCost);
  const dropped = grantCard(first.cards, "common_strength_up", 2, initial.deckCost);
  assert.equal(dropped.cards.ownedCardCounts.common_strength_up, 3);
  const slotOne = setDeckSlot(dropped.cards, 0, "common_strength_up", initial.deckCost);
  const slotTwo = setDeckSlot(slotOne, 1, "common_strength_up", initial.deckCost);
  const slotThree = setDeckSlot(slotTwo, 2, "common_strength_up", initial.deckCost);
  assert.equal(calculateDeckCost(slotThree.deckSlots), 3);
  assert.deepEqual(collectCardStatBonuses(slotThree.deckSlots), { str: 3 });
  assert.equal(setDeckSlot(slotThree, 3, "common_strength_up", initial.deckCost).deckSlots[3], null);
});

test("the three initial common cards use the Excel effect values", () => {
  assert.deepEqual(getCardById("common_strength_up")?.statBonus, { str: 1 });
  assert.deepEqual(getCardById("common_knowledge_book")?.statBonus, { int: 1 });
  assert.deepEqual(getCardById("common_lucky_charm")?.statBonus, { luc: 1 });
});

test("Dexterity Lesson is a stackable cost-one C card with DEX plus one", () => {
  const card = getCardById("common_dexterity_lesson");
  assert.equal(card.nameJa, "技巧の心得");
  assert.equal(card.rarity, "C");
  assert.equal(card.cost, 1);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { dex: 1 });
  assert.equal(CARDS.filter(entry => entry.id === card.id).length, 1);
});

test("Alertness is a stackable cost-one C card with two percent surprise resistance", () => {
  const card = getCardById("common_alertness");
  assert.equal(card.rarity, "C");
  assert.equal(card.cost, 1);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { surpriseResistance: 0.02 });
  const character = normalizeCharacter({
    ...createInitialCharacter({ name: "TEST", job: "thief" }),
    level: 5
  });
  let cards = grantCard(character.cards, card.id, 99, character.deckCost).cards;
  for (let index = 0; index < DECK_SLOT_COUNT; index += 1) {
    cards = setDeckSlot(cards, index, card.id, character.deckCost);
  }
  const bonuses = collectCardStatBonuses(cards.deckSlots);
  assert.ok(Math.abs(bonuses.surpriseResistance - 0.12) < Number.EPSILON);
  assert.ok(Math.abs(collectStats({
    ...character,
    cardStatBonuses: bonuses
  }).surpriseResistance - 0.12) < Number.EPSILON);
});

test("common HP and SP cards stack up to six copies and raise maximum vitals", () => {
  const initial = createInitialCharacter({ name: "TEST", job: "mage" });
  const base = normalizeCharacter({
    ...initial,
    level: 5,
    experience: getExperienceForLevel(5)
  });
  let hpCards = grantCard(base.cards, "common_hp_up", 99, base.deckCost).cards;
  assert.equal(hpCards.ownedCardCounts.common_hp_up, 99);
  for (let index = 0; index < DECK_SLOT_COUNT; index += 1) {
    hpCards = setDeckSlot(hpCards, index, "common_hp_up", base.deckCost);
  }
  const hpCharacter = normalizeCharacter({ ...base, cards: hpCards });
  assert.equal(hpCharacter.cards.deckSlots.filter(Boolean).length, 6);
  assert.equal(hpCharacter.maxHp, base.maxHp + 30);
  hpCharacter.hp = 1;
  const hpStay = resolveInnStay(hpCharacter);
  assert.equal(hpStay.changes.maxHp, base.maxHp + 30);
  assert.equal(hpStay.changes.hp, base.maxHp + 30);

  let spCards = grantCard(base.cards, "common_sp_up", 6, base.deckCost).cards;
  for (let index = 0; index < DECK_SLOT_COUNT; index += 1) {
    spCards = setDeckSlot(spCards, index, "common_sp_up", base.deckCost);
  }
  const spCharacter = normalizeCharacter({ ...base, cards: spCards });
  assert.equal(spCharacter.maxSp, base.maxSp + 30);
  spCharacter.sp = 0;
  const spStay = resolveInnStay(spCharacter);
  assert.equal(spStay.changes.maxSp, base.maxSp + 30);
  assert.equal(spStay.changes.sp, base.maxSp + 30);
});

test("main card registry contains every rarity and all twelve zodiac cards", () => {
  assert.deepEqual([...new Set(CARDS.map(card => card.rarity))].sort(), ["C", "L", "R", "SR", "Z"]);
  assert.equal(CARDS.filter(card => card.rarity === "Z").length, 12);
  assert.equal(getCardById("zodiac_aries")?.cost, 8);
});

test("Ability Boost is a six-copy SR card that raises all five abilities", () => {
  const card = getCardById("sr_ability_boost");
  assert.equal(card.rarity, "SR");
  assert.equal(card.cost, 4);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { str: 2, int: 2, agi: 2, dex: 2, luc: 2 });
  assert.deepEqual(collectCardStatBonuses(Array(6).fill("sr_ability_boost")), {
    str: 12, int: 12, agi: 12, dex: 12, luc: 12
  });
});

test("Ability Boost Plus is a six-copy L card that can maximize all abilities at level 137", () => {
  const card = getCardById("legendary_ability_boost_plus");
  assert.equal(card.rarity, "L");
  assert.equal(card.cost, 6);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { str: 5, int: 5, agi: 5, dex: 5, luc: 5 });

  const level136 = normalizeCharacter({
    ...createInitialCharacter({ name: "TEST", job: "warrior" }),
    level: 136
  });
  const level137 = normalizeCharacter({ ...level136, level: 137 });
  assert.equal(level136.deckCost, 35);
  assert.equal(level137.deckCost, 36);

  let cardsAt136 = grantCard(level136.cards, card.id, 6, level136.deckCost).cards;
  for (let index = 0; index < DECK_SLOT_COUNT; index += 1) {
    cardsAt136 = setDeckSlot(cardsAt136, index, card.id, level136.deckCost);
  }
  assert.equal(cardsAt136.deckSlots.filter(Boolean).length, 5);

  let cardsAt137 = grantCard(level137.cards, card.id, 6, level137.deckCost).cards;
  for (let index = 0; index < DECK_SLOT_COUNT; index += 1) {
    cardsAt137 = setDeckSlot(cardsAt137, index, card.id, level137.deckCost);
  }
  assert.equal(cardsAt137.deckSlots.filter(Boolean).length, 6);
  assert.equal(calculateDeckCost(cardsAt137.deckSlots), 36);
  assert.deepEqual(collectCardStatBonuses(cardsAt137.deckSlots), {
    str: 30, int: 30, agi: 30, dex: 30, luc: 30
  });
});

test("Resistance Spirit stacks to sixty percent across three R cards", () => {
  const card = getCardById("rare_resistance_spirit");
  assert.equal(card.rarity, "R");
  assert.equal(card.cost, 2);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 3);
  assert.deepEqual(card.statBonus, { actionSkipResistance: 0.2 });
  const cardResistance = collectCardStatBonuses(Array(3).fill(card.id)).actionSkipResistance;
  assert.equal(Math.round(cardResistance * 100), 60);
  const combinedResistance = collectStats({
    cardStatBonuses: { actionSkipResistance: cardResistance },
    equipmentStatBonuses: { actionSkipResistance: 0.3 }
  }).actionSkipResistance;
  assert.equal(Math.round(combinedResistance * 100), 90);
});

test("First Aid is an R card with thirty percent bleeding resistance", () => {
  const card = getCardById("common_first_aid");
  assert.equal(card.rarity, "R");
  assert.equal(card.cost, 2);
  assert.equal(card.maxOwned, 1);
  assert.equal(card.maxCopies, 1);
  assert.deepEqual(card.statBonus, { bleedingResistance: 0.3 });
});

test("legendary vitality cards allow max HP and SP to exceed four digits", () => {
  const definitions = [
    ["warrior", "legendary_vital_surge", "maxHp", 1599, false],
    ["mage", "legendary_spirit_surge", "maxSp", 1599, true]
  ];
  for (const [job, cardId, vitalKey, expected, vorpalSwordUsed] of definitions) {
    const card = getCardById(cardId);
    assert.equal(card.rarity, "L");
    assert.equal(card.cost, 6);
    assert.equal(card.maxOwned, 99);
    assert.equal(card.maxCopies, 6);
    assert.equal(card.acquisition.bossId, "jabberwock");
    assert.equal(card.acquisition.vorpalSwordUsed, vorpalSwordUsed);

    let character = normalizeCharacter({
      ...createInitialCharacter({ name: "TEST", job }),
      level: 197
    });
    character.cards = grantCard(character.cards, cardId, 6, character.deckCost).cards;
    for (let index = 0; index < DECK_SLOT_COUNT; index += 1) {
      character.cards = setDeckSlot(character.cards, index, cardId, character.deckCost);
    }
    character = normalizeCharacter(character);
    assert.equal(character[vitalKey], expected);
  }
});

test("Indomitable Spirit is a six-copy SR card with HP and defense bonuses", () => {
  const card = getCardById("sr_indomitable_spirit");
  assert.equal(card.rarity, "SR");
  assert.equal(card.cost, 4);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { maxHp: 15, def: 3 });
  assert.deepEqual(card.acquisition, {
    type: "blackChest", minDepth: 6, maxDepth: 10, excludedDepths: [9]
  });
});

test("black-chest R cards cost two and allow six copies", () => {
  const expected = {
    rare_strength_up_plus: { str: 2 },
    rare_dexterity_lesson_plus: { dex: 2 },
    rare_lucky_charm_plus: { luc: 2 },
    rare_knowledge_book_plus: { int: 2 },
    rare_gale_feather_plus: { agi: 2 },
    rare_hp_up: { maxHp: 10 },
    rare_sp_up: { maxSp: 10 }
  };
  for (const [cardId, statBonus] of Object.entries(expected)) {
    const card = getCardById(cardId);
    assert.equal(card.rarity, "R");
    assert.equal(card.cost, 2);
    assert.equal(card.maxOwned, 99);
    assert.equal(card.maxCopies, 6);
    assert.deepEqual(card.statBonus, statBonus);
  }
});

test("Defense Up is a six-copy R card with three defense", () => {
  const card = getCardById("rare_defense_up");
  assert.equal(card.rarity, "R");
  assert.equal(card.cost, 2);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { def: 3 });
  assert.deepEqual(collectCardStatBonuses(Array(6).fill(card.id)), { def: 18 });
});

test("Ability Boost is a six-copy SR card that raises all five abilities", () => {
  const card = getCardById("sr_ability_boost");
  assert.equal(card.rarity, "SR");
  assert.equal(card.cost, 4);
  assert.equal(card.maxOwned, 99);
  assert.equal(card.maxCopies, 6);
  assert.deepEqual(card.statBonus, { str: 2, int: 2, agi: 2, dex: 2, luc: 2 });
  assert.deepEqual(collectCardStatBonuses(Array(6).fill("sr_ability_boost")), {
    str: 12, int: 12, agi: 12, dex: 12, luc: 12
  });
});

test("Goddess's Grace is a unique cost-one C card that preserves defeat experience", () => {
  const card = getCardById("common_goddess_grace");
  assert.equal(card.rarity, "C");
  assert.equal(card.cost, 1);
  assert.equal(card.maxOwned, 1);
  assert.equal(card.maxCopies, 1);
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  const granted = grantCard(character.cards, card.id, 2, character.deckCost);
  assert.equal(granted.gained, 1);
  const equipped = setDeckSlot(granted.cards, 0, card.id, character.deckCost);
  assert.equal(hasCardEffect(equipped.deckSlots, "preserve_experience_on_defeat"), true);
});

test("battle rewards are carried and settled into consecutive inn level-ups", () => {
  const thief = createInitialCharacter({ name: "TEST", job: "thief" });
  Object.assign(thief, awardBattleExperience(thief, 4));
  Object.assign(thief, awardBattleExperience(thief, 6));
  assert.equal(thief.experience, 0);
  assert.equal(thief.carriedExperience, 10);
  thief.hp = 1;
  thief.sp = 0;
  const stay = resolveInnStay(thief);
  assert.equal(stay.gainedExperience, 10);
  assert.equal(stay.levelsGained, 1);
  assert.equal(stay.changes.level, 2);
  assert.equal(stay.changes.deckCost, 4);
  assert.equal(stay.hpGained, 1);
  assert.equal(stay.spGained, 1);
  assert.equal(stay.deckCostGained, 1);
  assert.equal(stay.changes.experience, 10);
  assert.equal(stay.changes.carriedExperience, 0);
  assert.equal(stay.changes.hp, stay.changes.maxHp);
  assert.equal(stay.changes.sp, stay.changes.maxSp);
});

test("one inn settlement can gain several levels and stops at level 197", () => {
  const mage = createInitialCharacter({ name: "TEST", job: "mage" });
  mage.carriedExperience = getExperienceForLevel(5);
  const multi = resolveInnStay(mage);
  assert.equal(multi.levelsGained, 4);
  assert.equal(multi.changes.level, 5);
  assert.equal(multi.hpGained, multi.changes.maxHp - mage.maxHp);
  assert.equal(multi.spGained, multi.changes.maxSp - mage.maxSp);
  assert.equal(multi.deckCostGained, 3);

  mage.experience = MAX_EXPERIENCE - 1;
  mage.carriedExperience = 999;
  mage.level = 196;
  const maximum = resolveInnStay(mage);
  assert.equal(maximum.changes.experience, MAX_EXPERIENCE);
  assert.equal(maximum.changes.level, MAX_LEVEL);
  assert.equal(maximum.changes.deckCost, 48);
  assert.equal(maximum.changes.maxSp, 999);
});

test("healing prayer can restore HP and consume SP outside battle", () => {
  const priest = createInitialCharacter({ name: "TEST", job: "priest" });
  priest.hp = 5;
  const result = resolveFieldSkill({ character: priest, skillId: "healing_prayer" });
  assert.equal(result.accepted, true);
  assert.equal(result.healing, 13);
  assert.equal(result.character.hp, 18);
  assert.equal(result.character.sp, 20);
  assert.equal(priest.hp, 5);
});

test("field skills reject battle-only actions and full-HP healing", () => {
  const priest = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(resolveFieldSkill({
    character: priest,
    skillId: "holy_strike"
  }).reason, "battleOnly");
  assert.equal(resolveFieldSkill({
    character: priest,
    skillId: "healing_prayer"
  }).reason, "fullHp");
});

test("priests learn Antidote at level 3 and Exorcism at level 5", () => {
  const priest = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(priest.skillIds.includes("antidote"), false);
  assert.equal(priest.skillIds.includes("exorcism"), false);
  const level3 = normalizeCharacter({ ...priest, level: 3 });
  assert.equal(level3.skillIds.includes("antidote"), true);
  assert.equal(level3.skillIds.includes("exorcism"), false);
  const level5 = normalizeCharacter({ ...level3, level: 5 });
  assert.equal(level5.skillIds.includes("exorcism"), true);
  assert.equal(getSkill("antidote").spCost, 3);
  assert.equal(getSkill("exorcism").spCost, 5);

  const lodging = { ...priest, level: 2, experience: getExperienceForLevel(2) };
  lodging.carriedExperience = getExperienceForLevel(5) - lodging.experience;
  const stayed = resolveInnStay(lodging);
  assert.deepEqual(stayed.learnedSkillIds, ["antidote", "exorcism"]);
  assert.equal(stayed.changes.skillIds.includes("antidote"), true);
  assert.equal(stayed.changes.skillIds.includes("exorcism"), true);
});

test("Antidote cures poison for 3 SP without restoring HP", () => {
  const priest = normalizeCharacter({ ...createInitialCharacter({ name: "TEST", job: "priest" }), level: 3 });
  priest.hp = 4;
  priest.statuses = [{ statusId: "poison", remaining: 3 }];
  priest.condition = "POISON";
  const result = resolveFieldSkill({ character: priest, skillId: "antidote" });
  assert.equal(result.accepted, true);
  assert.equal(result.character.hp, 4);
  assert.equal(result.character.sp, priest.sp - 3);
  assert.equal(result.character.statuses.some(status => status.statusId === "poison"), false);
  assert.equal(result.character.condition, "GOOD");
  assert.equal(resolveFieldSkill({ character: result.character, skillId: "antidote" }).reason, "noEffect");
});

test("the three jobs learn their new dungeon skills at the intended levels", () => {
  assert.equal(normalizeCharacter({ ...createInitialCharacter({ name: "W", job: "warrior" }), level: 5 }).skillIds.includes("survival_instinct"), true);
  assert.equal(normalizeCharacter({ ...createInitialCharacter({ name: "M", job: "mage" }), level: 4 }).skillIds.includes("staff_light"), true);
  assert.equal(normalizeCharacter({ ...createInitialCharacter({ name: "T", job: "thief" }), level: 8 }).skillIds.includes("conceal_presence"), true);
});

test("mages learn Wisdom to Power at level 25 and cannot activate the passive manually", () => {
  const level24 = normalizeCharacter({ ...createInitialCharacter({ name: "M", job: "mage" }), level: 24 });
  const level25 = normalizeCharacter({ ...createInitialCharacter({ name: "M", job: "mage" }), level: 25 });
  assert.equal(level24.skillIds.includes("wisdom_to_power"), false);
  assert.equal(level25.skillIds.includes("wisdom_to_power"), true);
  assert.equal(getSkill("wisdom_to_power").actionType, "passive");
  assert.equal(createPlayerAction(level25, { type: "skill", skillId: "wisdom_to_power" }).reason, "passive");
});

test("Staff Light restores fifty torch points and Conceal Presence cannot stack", () => {
  const mage = normalizeCharacter({ ...createInitialCharacter({ name: "M", job: "mage" }), level: 4 });
  const light = resolveFieldSkill({ character: mage, skillId: "staff_light", torchFuel: 35 });
  assert.equal(light.accepted, true);
  assert.equal(light.environment.torchFuel, 85);
  assert.equal(light.character.sp, mage.sp - 4);
  assert.equal(resolveFieldSkill({ character: light.character, skillId: "staff_light", torchFuel: 100 }).reason, "fullTorch");

  const thief = normalizeCharacter({ ...createInitialCharacter({ name: "T", job: "thief" }), level: 8 });
  const conceal = resolveFieldSkill({ character: thief, skillId: "conceal_presence" });
  assert.equal(conceal.environment.presenceIncreaseReduction, 0.5);
  assert.equal(conceal.character.sp, thief.sp - 10);
  assert.equal(resolveFieldSkill({
    character: conceal.character, skillId: "conceal_presence", presenceIncreaseReduction: 0.5
  }).reason, "alreadyActive");
});

test("Survival Instinct cures poison nonlethally in the field and battle", () => {
  const warrior = normalizeCharacter({ ...createInitialCharacter({ name: "W", job: "warrior" }), level: 5 });
  warrior.hp = 3;
  warrior.statuses = [{ statusId: "poison" }];
  warrior.condition = "POISON";
  const field = resolveFieldSkill({ character: warrior, skillId: "survival_instinct" });
  assert.equal(field.accepted, true);
  assert.equal(field.character.hp, 1);
  assert.equal(field.character.statuses.some(status => status.statusId === "poison"), false);

  const enemy = createEnemyCombatant(getEnemyById("cave_slime"));
  const battle = resolveBattleRound({
    battle: createBattleState({ character: warrior, enemy }),
    playerCommand: { type: "skill", skillId: "survival_instinct" },
    rng: fixed(0.5)
  }).battle;
  assert.equal(battle.player.statuses.some(status => status.statusId === "poison"), false);
  assert.ok(battle.log.some(message => message.includes("生存本能")));
});

test("Exorcism banishes only non-boss undead for 5 SP and grants no experience", () => {
  const priest = normalizeCharacter({ ...createInitialCharacter({ name: "TEST", job: "priest" }), level: 5 });
  const enemy = {
    id: "test_undead", name: "UNDEAD", race: "undead", hp: 10, maxHp: 10,
    sp: 0, maxSp: 0, stats: { str: 1, int: 1, agi: 0, dex: 1, luc: 1 },
    def: 0, attack: 0, experienceReward: 999, statuses: [], equipment: {},
    elementMultipliers: {}, statusResistances: {}, isBoss: false, alive: true
  };
  const result = resolveBattleRound({
    battle: createBattleState({ character: priest, enemy }),
    playerCommand: { type: "skill", skillId: "exorcism" },
    rng: () => 0
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.battle.player.sp, priest.sp - 5);
  assert.equal(result.battle.enemy.experienceReward, 0);
  assert.equal(result.battle.enemy.noDrop, true);

  const beast = resolveBattleRound({
    battle: createBattleState({ character: priest, enemy: { ...enemy, race: "beast" } }),
    playerCommand: { type: "skill", skillId: "exorcism" }
  });
  assert.equal(beast.accepted, false);
  assert.equal(beast.reason, "undeadOnly");
  const boss = resolveBattleRound({
    battle: createBattleState({ character: priest, enemy: { ...enemy, isBoss: true } }),
    playerCommand: { type: "skill", skillId: "exorcism" }
  });
  assert.equal(boss.accepted, false);
  assert.equal(boss.reason, "bossImmune");
});

test("defeat presentation is skipped only when a future recovery resolver restores HP", () => {
  const defeated = { hp: 0, alive: false };
  assert.equal(resolveDefeatRecovery({ character: defeated }).recovered, false);
  const recovered = resolveDefeatRecovery({
    character: defeated,
    recoveryResolvers: [({ character }) => ({
      character: { ...character, hp: 1, alive: true },
      sourceId: "reincarnation"
    })]
  });
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.character.hp, 1);
  assert.equal(recovered.sourceId, "reincarnation");
});
