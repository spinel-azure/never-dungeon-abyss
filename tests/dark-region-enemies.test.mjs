import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createEnemyAction } from "../combat/battle-engine.js";
import {
  createEnemyCombatant,
  getDarkRegionEncounterFormation,
  getEnemyById,
  getRandomEncounterEnemy
} from "../data/enemies.js";

const enemyIds = ["sensenmann", "wraith", "will_o_wisp", "schleipnir"];
const ids = formation => formation.map(enemy => enemy.id);

test("暗黒区域の4体はB90F～B99Fだけで通常抽選される", () => {
  for (const depth of [90, 94, 99]) {
    assert.deepEqual(
      [0, 0.26, 0.51, 0.999].map(roll => getRandomEncounterEnemy({ depth, rng: () => roll, allowRare: false }).id),
      enemyIds
    );
  }
  assert.ok(!enemyIds.includes(getRandomEncounterEnemy({ depth: 89, rng: () => 0.999, allowRare: false }).id));
});

test("暗黒区域の編成は指定された1～3体構成を返す", () => {
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 90, rng: () => 0 })), ["sensenmann"]);
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 95, rng: () => 0.2 })), ["sensenmann", "sensenmann"]);
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 95, rng: () => 0.58 })), ["will_o_wisp", "will_o_wisp"]);
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 99, rng: () => 0.75 })), ["will_o_wisp", "will_o_wisp", "will_o_wisp"]);
  assert.deepEqual(ids(getDarkRegionEncounterFormation({ depth: 99, rng: () => 0.999 })), ["schleipnir"]);
  assert.deepEqual(getDarkRegionEncounterFormation({ depth: 89 }), []);
});

test("各敵は通常・中頻度特殊・条件付き低頻度特殊の3行動を持つ", () => {
  for (const enemyId of enemyIds) {
    const enemy = getEnemyById(enemyId);
    assert.equal(enemy.actions.length, 3);
    assert.deepEqual(enemy.actions.map(entry => entry.weight), [55, 35, 10]);
    assert.equal(enemy.actions[0].action.name, "攻撃");
    assert.equal(enemy.actions[1].when, undefined);
    assert.equal(enemy.actions[2].when.hpRateBelow, 0.5);

    const combatant = createEnemyCombatant(enemy);
    combatant.hp = combatant.maxHp;
    assert.notEqual(createEnemyAction(combatant, () => 0.999).id, enemy.actions[2].action.id);
    combatant.hp = Math.floor(combatant.maxHp * 0.49);
    assert.equal(createEnemyAction(combatant, () => 0.999).id, enemy.actions[2].action.id);
  }
});

test("区域内の強さと経験値は★1から★4の順に段階化される", () => {
  const ordered = ["will_o_wisp", "sensenmann", "wraith", "schleipnir"].map(getEnemyById);
  assert.deepEqual(ordered.map(enemy => enemy.experienceReward), [1200, 2300, 5200, 7800]);
  assert.ok(ordered.every((enemy, index) => index === 0 || enemy.maxHp > ordered[index - 1].maxHp));
});

test("暗黒区域の状態効果と画像参照は既存処理で利用できる", async () => {
  assert.equal(getEnemyById("sensenmann").actions[1].action.effects[0].statusId, "bleeding");
  assert.equal(getEnemyById("wraith").actions[1].action.effects[0].statusId, "speed_down");
  assert.equal(getEnemyById("will_o_wisp").actions[2].action.actionType, "spDrain");
  assert.equal(getEnemyById("schleipnir").actions[1].action.hitCount, 2);
  await Promise.all(enemyIds.map(id => access(new URL(`../${getEnemyById(id).image}`, import.meta.url))));
});
