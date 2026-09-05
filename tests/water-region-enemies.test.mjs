import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

import { createBattleState, createEnemyAction, resolveBattleRound } from "../combat/battle-engine.js";
import { resolveStatusEffect } from "../combat/resolve-status-effect.js";
import { createInitialCharacter } from "../data/classes.js";
import { createEnemyCombatant, getEnemyById, getRandomEnemy, getWaterRegionEncounterFormation } from "../data/enemies.js";

const ids = formation => formation.map(enemy => enemy.id);

test("B70F through B79F unlock the four water-region enemies progressively", () => {
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 70, rng: () => 0 })), ["abyss_piranha"]);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 71, rng: () => 0.999 })), ["abyss_piranha", "abyss_piranha"]);
  assert.equal(getRandomEnemy({ depth: 72, rng: () => 0.999 }).id, "abgrund_krabbe");
  assert.equal(getRandomEnemy({ depth: 74, rng: () => 0.5 }).id, "abgrund_aal");
  assert.equal(getRandomEnemy({ depth: 76, rng: () => 0.999 }).id, "abyss_giant_catfish");
  for (const depth of [76, 77, 79]) {
    const rolls = [0, 0.26, 0.51, 0.999].map(rng => getRandomEnemy({ depth, rng: () => rng }).id);
    assert.deepEqual(new Set(rolls), new Set(["abyss_piranha", "abgrund_aal", "abgrund_krabbe", "abyss_giant_catfish"]));
  }
});

test("water-region formations deepen from piranha groups into the two B78F mixed parties", () => {
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 72, rng: () => 0.6 })), ["abyss_piranha", "abyss_piranha", "abyss_piranha"]);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 74, rng: () => 0 })), ["abyss_piranha", "abyss_piranha"]);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 74, rng: () => 0.3 })), ["abyss_piranha", "abyss_piranha", "abyss_piranha"]);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 78, rng: () => 0.7 })), ["abyss_piranha", "abyss_piranha", "abgrund_aal"]);
  assert.deepEqual(ids(getWaterRegionEncounterFormation({ depth: 78, rng: () => 0.999 })), ["abyss_piranha", "abyss_piranha", "abgrund_krabbe"]);
  assert.equal(ids(getWaterRegionEncounterFormation({ depth: 79, rng: () => 0.999 })).includes("abyss_giant_catfish"), true);
});

test("a mixed water-region battle safely retargets when the selected enemy is already defeated", () => {
  const piranha = createEnemyCombatant(getEnemyById("abyss_piranha"));
  const eel = createEnemyCombatant(getEnemyById("abgrund_aal"));
  const battle = createBattleState({
    character: createInitialCharacter({ name: "TEST", job: "warrior" }),
    enemy: piranha,
    enemies: [piranha, eel],
    targetIndex: 0
  });
  battle.enemies[0].hp = 0;
  battle.enemies[0].alive = false;
  const result = resolveBattleRound({ battle, playerCommand: { type: "attack", targetIndex: 0 }, rng: () => 0.999 });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.targetIndex, 1);
  assert.equal(result.battle.enemies[0].alive, false);
  assert.equal(result.battle.enemies[1].alive, true);
});

test("Abyss Piranha uses lightning weakness, multi-hit attacks, and normal bleeding resistance", () => {
  const enemy = createEnemyCombatant(getEnemyById("abyss_piranha"));
  const latch = createEnemyAction(enemy, () => 0.5);
  const rend = createEnemyAction(enemy, () => 0.999);
  assert.deepEqual([enemy.maxHp, enemy.def, latch.hitCount, rend.effects[0].statusId], [280, 24, 2, "bleeding"]);
  assert.deepEqual(enemy.elementMultipliers, { fire: 1, ice: 1, lightning: 1.5, arcane: 1 });
  assert.equal(resolveStatusEffect({ attacker: { dex: 30 }, defender: enemy, effect: { statusId: "bleeding", statusKind: "physical", baseRate: 0.25 }, rng: () => 0 }).immune, false);
});

test("Abgrundaal resists lightning, is weak to ice, and carries two action-disable attacks", () => {
  const enemy = createEnemyCombatant(getEnemyById("abgrund_aal"));
  const chargedFang = createEnemyAction(enemy, () => 0.5);
  const discharge = createEnemyAction(enemy, () => 0.999);
  assert.deepEqual(enemy.elementMultipliers, { fire: 1, ice: 1.5, lightning: 0.5, arcane: 1 });
  assert.deepEqual([chargedFang.element, chargedFang.effects[0].statusId], ["lightning", "action_skip"]);
  assert.deepEqual([discharge.actionType, discharge.unavoidable, discharge.effects[0].statusId], ["spell", true, "action_skip"]);
});

test("Abgrundkrabbe is the high-defense bleeding-immune enemy and uses existing guard", () => {
  const enemy = createEnemyCombatant(getEnemyById("abgrund_krabbe"));
  const greatPincer = createEnemyAction(enemy, () => 0.4);
  const combo = createEnemyAction(enemy, () => 0.7);
  const guard = createEnemyAction(enemy, () => 0.999);
  assert.deepEqual([enemy.maxHp, enemy.def, greatPincer.speedModifier, combo.hitCount, guard.actionType], [650, 48, -5, 2, "guard"]);
  assert.equal(enemy.statusResistances.bleeding.immune, true);
  assert.equal(resolveStatusEffect({ defender: enemy, effect: { statusId: "bleeding", baseRate: 1 }, rng: () => 0 }).immune, true);
});

test("Abyss Giant Catfish is the largest reward enemy and applies action disable or speed down", () => {
  const enemy = createEnemyCombatant(getEnemyById("abyss_giant_catfish"));
  const swallow = createEnemyAction(enemy, () => 0.7);
  const muddyStream = createEnemyAction(enemy, () => 0.999);
  assert.deepEqual([enemy.maxHp, enemy.experienceReward, swallow.effects[0].statusId], [850, 2200, "action_skip"]);
  assert.deepEqual([muddyStream.actionType, muddyStream.element, muddyStream.unavoidable, muddyStream.effects[0].statusId], ["spell", "arcane", true, "speed_down"]);
});

test("all four water-region enemy image files exist and no placeholder materials are assigned", async () => {
  for (const id of ["abyss_piranha", "abgrund_aal", "abgrund_krabbe", "abyss_giant_catfish"]) {
    const enemy = getEnemyById(id);
    await access(new URL(`../${enemy.image}`, import.meta.url));
    assert.equal(enemy.dropItemId, undefined);
  }
});
