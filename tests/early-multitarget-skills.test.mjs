import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getExperienceForLevel } from "../data/growth.js";
import { grantItem, getItemCount } from "../data/inventory.js";
import { getSkill } from "../data/skills.js";
import { createEnemyCombatant } from "../data/enemies.js";
import { getWeapon } from "../data/weapons.js";
import { createSkillAttack } from "../combat/create-attack.js";
import {
  createBattleState,
  createPlayerAction,
  getPlayerWeaponElement,
  resolveBattleRound
} from "../combat/battle-engine.js";
import { resolveFieldSkill } from "../combat/resolve-field-skill.js";
import { calculateBattleExperienceReward, resolveInnStay } from "../js/character-services.js";

const LEVEL_TWELVE_SKILLS = Object.freeze({
  warrior: "wide_swing",
  thief: "blade_dance",
  mage: "flame_sweep"
});

function leveledCharacter(job, level) {
  return normalizeCharacter({
    ...createInitialCharacter({ name: job.toUpperCase(), job }),
    level
  });
}

function dummyEnemy(index, {
  hp = 999,
  experienceReward = 10,
  elementMultipliers = {}
} = {}) {
  return createEnemyCombatant({
    id: `early_skill_dummy_${index}`,
    name: `DUMMY ${index}`,
    level: 1,
    maxHp: hp,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0,
    attack: 1,
    experienceReward,
    elementMultipliers
  });
}

function fastCharacter(job, level) {
  const character = leveledCharacter(job, level);
  character.baseStats = { ...character.baseStats, agi: 100, dex: 30, int: 30, str: 30 };
  character.sp = character.maxSp = 100;
  return character;
}

test("the three combat jobs learn only their own level 12 multi-target skill", () => {
  for (const [job, skillId] of Object.entries(LEVEL_TWELVE_SKILLS)) {
    assert.equal(leveledCharacter(job, 11).skillIds.includes(skillId), false, `${job} level 11`);
    const level12 = leveledCharacter(job, 12);
    assert.equal(level12.skillIds.includes(skillId), true, `${job} level 12`);
    for (const [otherJob, otherSkillId] of Object.entries(LEVEL_TWELVE_SKILLS)) {
      if (otherJob !== job) assert.equal(level12.skillIds.includes(otherSkillId), false, `${job} excludes ${otherSkillId}`);
    }
  }
  const priest = leveledCharacter("priest", 99);
  assert.ok(Object.values(LEVEL_TWELVE_SKILLS).every(skillId => !priest.skillIds.includes(skillId)));
});

test("old level 12 saves are normalized with the new skill and level-up reports it", () => {
  for (const [job, skillId] of Object.entries(LEVEL_TWELVE_SKILLS)) {
    const oldSave = createInitialCharacter({ name: "OLD", job });
    oldSave.level = 12;
    assert.equal(oldSave.skillIds.includes(skillId), false);
    assert.equal(normalizeCharacter(oldSave).skillIds.includes(skillId), true);
  }

  const warrior = leveledCharacter("warrior", 11);
  warrior.experience = getExperienceForLevel(11);
  warrior.carriedExperience = getExperienceForLevel(12) - warrior.experience;
  const stayed = resolveInnStay(warrior);
  assert.equal(stayed.changes.level, 12);
  assert.ok(stayed.learnedSkillIds.includes("wide_swing"));
});

test("level 12 skill definitions keep their requested combat values", () => {
  const wideSwing = getSkill("wide_swing");
  assert.deepEqual(
    [wideSwing.spCost, wideSwing.target, wideSwing.hitCount, wideSwing.powerPerHit, wideSwing.speedModifier],
    [7, "allEnemies", 1, 0.7, -5]
  );
  const bladeDance = getSkill("blade_dance");
  assert.deepEqual(
    [bladeDance.spCost, bladeDance.target, bladeDance.hitCount, bladeDance.powerPerHit, bladeDance.speedModifier],
    [6, "allEnemies", 1, 0.6, 10]
  );
  const flameSweep = getSkill("flame_sweep");
  assert.deepEqual(
    [flameSweep.spCost, flameSweep.target, flameSweep.element, flameSweep.spellPower,
      flameSweep.powerMultiplier, flameSweep.unavoidable, flameSweep.speedModifier],
    [8, "allEnemies", "fire", 8, 0.8, true, -5]
  );
  assert.deepEqual(
    [getSkill("fireball").target, getSkill("fireball").spCost, getSkill("fireball").spellPower],
    ["enemy", 3, 10]
  );
});

test("physical sweeps use one hit, inherit weapon power and element, and exclude attack-only effects", () => {
  const wideSwing = createSkillAttack(getSkill("wide_swing"), { weapon: getWeapon("glacies_hammer") });
  assert.equal(wideSwing.hitCount, 1);
  assert.equal(wideSwing.weapon.attack, getWeapon("glacies_hammer").attack);
  assert.equal(getPlayerWeaponElement({}, wideSwing), "ice");
  assert.equal(wideSwing.passiveInstantDeathId, null);
  assert.deepEqual(wideSwing.effects, []);

  const poisonDagger = getWeapon("poison_dagger");
  const bladeDance = createSkillAttack(getSkill("blade_dance"), { weapon: poisonDagger });
  assert.equal(poisonDagger.type, "dagger");
  assert.equal(bladeDance.hitCount, 1);
  assert.equal(bladeDance.weapon.attack, poisonDagger.attack);
  assert.equal(bladeDance.passiveInstantDeathId, null);
  assert.deepEqual(bladeDance.effects, []);
});

test("wide swing and blade dance strike each living enemy once without passive executions", () => {
  for (const [job, skillId] of [["warrior", "wide_swing"], ["thief", "blade_dance"]]) {
    const character = fastCharacter(job, 38);
    const enemies = [dummyEnemy(0), dummyEnemy(1), dummyEnemy(2)];
    const startingSp = character.sp;
    const result = resolveBattleRound({
      battle: createBattleState({ character, enemy: enemies[0], enemies }),
      playerCommand: { type: "skill", skillId },
      rng: () => 0.5
    });
    const hits = result.battle.presentationEvents.filter(event => (
      event.type === "attackHit" && event.actorSide === "player"
    ));
    assert.equal(result.accepted, true);
    assert.deepEqual(hits.map(hit => hit.targetIndex), [0, 1, 2]);
    assert.ok(hits.every(hit => hit.hitCount === 1));
    assert.ok(hits.every(hit => !hit.passiveExecutionId));
    assert.equal(result.battle.player.sp, startingSp - getSkill(skillId).spCost);
  }
});

test("flame sweep hits every living enemy and applies fire affinity per target", () => {
  const mage = fastCharacter("mage", 12);
  const enemies = [
    dummyEnemy(0, { elementMultipliers: { fire: 1.5 } }),
    dummyEnemy(1, { elementMultipliers: { fire: 0.5 } }),
    dummyEnemy(2, { elementMultipliers: { fire: 0 } })
  ];
  const result = resolveBattleRound({
    battle: createBattleState({ character: mage, enemy: enemies[0], enemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  });
  const hits = result.battle.presentationEvents.filter(event => (
    event.type === "attackHit" && event.actorSide === "player"
  ));
  assert.equal(result.accepted, true);
  assert.deepEqual(hits.map(hit => hit.targetIndex), [0, 1, 2]);
  assert.ok(hits[0].damage > hits[1].damage);
  assert.equal(hits[2].damage, 0);
  assert.ok(hits.every(hit => hit.hit));
  assert.equal(result.battle.player.sp, mage.sp - 8);
});

test("multi-target skills reject insufficient SP and a party defeat keeps one reward per enemy", () => {
  const exhausted = fastCharacter("warrior", 12);
  exhausted.sp = 6;
  assert.equal(createPlayerAction(exhausted, { type: "skill", skillId: "wide_swing" }).reason, "insufficientSp");

  const mage = fastCharacter("mage", 12);
  const enemies = [0, 1, 2].map(index => dummyEnemy(index, { hp: 1, experienceReward: (index + 1) * 10 }));
  const result = resolveBattleRound({
    battle: createBattleState({ character: mage, enemy: enemies[0], enemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  });
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.battle.presentationEvents.filter(event => event.actorSide === "player").length, 3);
  const baseReward = result.battle.enemies.reduce((sum, enemy) => sum + enemy.experienceReward, 0);
  assert.equal(baseReward, 60);
  assert.equal(calculateBattleExperienceReward(mage, baseReward), 60);
});

test("Survival Instinct cures only poison and costs one quarter max HP without killing", () => {
  const warrior = leveledCharacter("warrior", 5);
  warrior.maxHp = 100;
  warrior.hp = 100;
  warrior.statuses = [{ statusId: "poison" }, { statusId: "deadly_poison" }];
  warrior.condition = "DEADLY POISON";
  const result = resolveFieldSkill({ character: warrior, skillId: "survival_instinct" });
  assert.equal(getSkill("survival_instinct").damageRate, 0.25);
  assert.equal(result.damage, 25);
  assert.equal(result.character.hp, 75);
  assert.equal(result.character.statuses.some(status => status.statusId === "poison"), false);
  assert.equal(result.character.statuses.some(status => status.statusId === "deadly_poison"), true);

  warrior.hp = 2;
  const nonlethal = resolveFieldSkill({ character: warrior, skillId: "survival_instinct" });
  assert.equal(nonlethal.character.hp, 1);
});

test("Full Sprint unlocks only for level 20 warriors and old saves receive it", () => {
  assert.equal(leveledCharacter("warrior", 19).skillIds.includes("full_sprint"), false);
  assert.equal(leveledCharacter("warrior", 20).skillIds.includes("full_sprint"), true);
  for (const job of ["thief", "priest", "mage"]) {
    assert.equal(leveledCharacter(job, 99).skillIds.includes("full_sprint"), false, job);
  }
  const oldSave = createInitialCharacter({ name: "OLD", job: "warrior" });
  oldSave.level = 20;
  assert.equal(oldSave.skillIds.includes("full_sprint"), false);
  assert.equal(normalizeCharacter(oldSave).skillIds.includes("full_sprint"), true);
});

test("Full Sprint consumes 30 SP only after dungeon auto-return eligibility succeeds", () => {
  const warrior = leveledCharacter("warrior", 20);
  warrior.sp = 50;
  warrior.inventory = grantItem(warrior.inventory, "auto_walker", 2).inventory;
  const available = { accepted: true, reason: "", path: ["W"] };
  const accepted = resolveFieldSkill({
    character: warrior,
    skillId: "full_sprint",
    context: "dungeon",
    autoReturnAvailability: available
  });
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.character.sp, 20);
  assert.equal(warrior.sp, 50);
  assert.equal(getItemCount(accepted.character.inventory, "auto_walker"), 2);
  assert.equal(accepted.environment.startAutoWalker, true);

  for (const reason of ["alreadyAtStart", "noPath", "alreadyActive", "moving"]) {
    const rejected = resolveFieldSkill({
      character: warrior,
      skillId: "full_sprint",
      context: "dungeon",
      autoReturnAvailability: { accepted: false, reason }
    });
    assert.equal(rejected.accepted, false);
    assert.equal(rejected.reason, reason);
    assert.equal(warrior.sp, 50);
  }
  assert.equal(resolveFieldSkill({
    character: warrior,
    skillId: "full_sprint",
    context: "town",
    autoReturnAvailability: available
  }).reason, "dungeonOnly");

  warrior.sp = 29;
  assert.equal(resolveFieldSkill({
    character: warrior,
    skillId: "full_sprint",
    context: "dungeon",
    autoReturnAvailability: available
  }).reason, "insufficientSp");
  assert.equal(warrior.sp, 29);
});
