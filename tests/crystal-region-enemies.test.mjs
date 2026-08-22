import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

import { createBattleState, createEnemyAction, resolveBattleRound } from "../combat/battle-engine.js";
import { createInitialCharacter } from "../data/classes.js";
import {
  createEnemyCombatant,
  getCrystalRegionEncounterFormation,
  getEnemyById,
  getRandomEnemy
} from "../data/enemies.js";
import { createBossCombatant, getFloorBossByDepth } from "../data/bosses.js";
import { isDungeonDepthUnlocked } from "../data/quests.js";

const ids = formation => formation.map(enemy => enemy.id);

test("B80F through B88F use progressive crystal-region formations and B89F excludes them", () => {
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 80, rng: () => 0 })), ["abyss_crystal_beetle"]);
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 81, rng: () => 0.999 })), ["abyss_crystal_beetle", "abyss_crystal_beetle", "abyss_crystal_beetle"]);
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 82, rng: () => 0.999 })), ["abyss_crystal_beetle", "abyss_crystal_beetle", "prism_moth"]);
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 84, rng: () => 0.999 })), ["abyss_crystal_beetle", "amethyst_golem"]);
  assert.deepEqual(ids(getCrystalRegionEncounterFormation({ depth: 88, rng: () => 0.999 })), ["amethyst_golem", "abyss_crystal_beetle", "abyss_crystal_beetle"]);
  assert.notEqual(getRandomEnemy({ depth: 89, rng: () => 0.999 }).maximumDepth, 88);
});

test("crystal enemies divide weaknesses, defenses, statuses, rewards, and SP drain", () => {
  const beetle = createEnemyCombatant(getEnemyById("abyss_crystal_beetle"));
  const moth = createEnemyCombatant(getEnemyById("prism_moth"));
  const golem = createEnemyCombatant(getEnemyById("amethyst_golem"));
  const mimic = createEnemyCombatant(getEnemyById("crystal_mimic"));
  assert.deepEqual(beetle.physicalTypeMultipliers, { blunt: 1.35, slash: 0.85, pierce: 0.85 });
  assert.equal(beetle.crackTrait.bluntRate > beetle.crackTrait.baseRate, true);
  assert.deepEqual([moth.elementMultipliers.fire, moth.elementMultipliers.ice, moth.elementMultipliers.holy], [1.5, 0.65, 0.65]);
  assert.deepEqual([golem.def, golem.elementMultipliers.lightning, golem.statusResistances.instant_death.immune], [55, 1.5, true]);
  assert.deepEqual([mimic.elementMultipliers.dark, mimic.elementMultipliers.lightning, mimic.experienceReward], [1.5, 0.5, 3200]);
  assert.equal(mimic.actions.find(entry => entry.action.id === "mana_absorption").action.spDamage, 12);
});

test("crystal multi-hit ranges and SP drain use the shared battle engine safely", () => {
  const mimic = createEnemyCombatant(getEnemyById("crystal_mimic"));
  const absorption = createEnemyAction(mimic, () => 0.999);
  assert.equal(absorption.actionType, "spDrain");
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.sp = 20;
  const battle = createBattleState({ character, enemy: mimic });
  battle.enemy.actions = [{ weight: 100, action: absorption }];
  const result = resolveBattleRound({ battle, playerCommand: { type: "wait" }, rng: () => 0.999 });
  assert.equal(result.battle.player.sp, 8);
  assert.match(result.battle.log.join("\n"), /SPが12減少/);
});

test("B89F Amethystdrache is a tuned floor boss and gates B90F", () => {
  const boss = getFloorBossByDepth(89);
  assert.deepEqual([boss.id, boss.image, boss.maxHp, boss.def, boss.experienceReward], [
    "amethyst_drache_b89f", "images/bosses/boss_16.avif", 14000, 52, 65000
  ]);
  assert.equal(createBossCombatant(boss).resonanceTrait.element, "lightning");
  assert.equal(isDungeonDepthUnlocked({ eventFlags: {} }, 90), false);
  assert.equal(isDungeonDepthUnlocked({ eventFlags: { boss_b89f_defeated: true } }, 90), true);
});

test("available crystal monster and boss images exist at their declared paths", async () => {
  for (const id of ["abyss_crystal_beetle", "prism_moth", "crystal_mimic"]) {
    await access(new URL(`../${getEnemyById(id).image}`, import.meta.url));
  }
  await access(new URL("../images/bosses/boss_16.avif", import.meta.url));
  assert.equal(getEnemyById("amethyst_golem").image, "images/enemies/enemy_35.avif");
});
