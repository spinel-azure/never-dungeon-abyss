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
  resolveEnvironmentSave
} from "../combat/resolve-environment-save.js";
import { resolveEscapeAttempt } from "../combat/resolve-escape.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { deriveDetailStats } from "../combat/derive-detail-stats.js";
import { CHARACTER_JOBS } from "../data/town.js";
import { getEnemyById } from "../data/enemies.js";
import { CARDS, getCardById } from "../data/cards.js";
import { calculateDeckCost, DECK_SLOT_COUNT, normalizeCardState, setDeckSlot } from "../data/deck.js";
import { resolveTurnOrder, createGuardAction } from "../combat/resolve-turn-order.js";
import {
  applyStatus,
  applyStatusApplications,
  resolveActionOpportunity,
  resolveEndOfAction
} from "../combat/status-lifecycle.js";
import {
  awardBattleExperience,
  createInnRecovery,
  createTempleRevival,
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

test("all initial classes can damage the adjusted cave slime", () => {
  const slime = getEnemyById("cave_slime");
  const expectedDamage = { warrior: 9, thief: 2, priest: 6, mage: 1 };
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

test("equipment bonuses are included in combat stats", () => {
  const warrior = createInitialCharacter({ name: "TEST", job: "warrior" });
  const mage = createInitialCharacter({ name: "TEST", job: "mage" });
  assert.equal(collectStats(warrior).def, 8);
  assert.equal(collectStats(mage).def, 2);
  assert.equal(collectStats(mage).int, 9);
});

test("detail status derives current character percentages", () => {
  const warrior = deriveDetailStats(createInitialCharacter({ name: "TEST", job: "warrior" }));
  assert.deepEqual(warrior, {
    physicalAttack: 12,
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
  assert.equal(mage.physicalAttack, 4);
  assert.equal(mage.spellAttack, 4.5);
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

test("every initial skill has a display description", () => {
  for (const jobId of ["warrior", "thief", "priest", "mage"]) {
    const character = createInitialCharacter({ name: "TEST", jobId });
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
  assert.equal(getExperienceForLevel(197), MAX_EXPERIENCE);
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

test("main card registry contains every rarity and all twelve zodiac cards", () => {
  assert.deepEqual([...new Set(CARDS.map(card => card.rarity))].sort(), ["C", "L", "R", "SR", "Z"]);
  assert.equal(CARDS.filter(card => card.rarity === "Z").length, 12);
  assert.equal(getCardById("zodiac_aries")?.cost, 8);
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
