import test from "node:test";
import assert from "node:assert/strict";
import {
  defineEncounterFormation,
  matchesEncounterFormationConditions,
  selectEncounterFormationIds
} from "../data/encounter-formations.js";

test("編成条件でB1Fを単独、B2F以降を混成にできる", () => {
  const formations = [
    defineEncounterFormation(["enemy_a"], { exactDepths: [1] }),
    defineEncounterFormation(["enemy_a", "enemy_b"], { minimumDepth: 2, maximumDepth: 9 })
  ];
  assert.deepEqual(selectEncounterFormationIds(formations, { depth: 1 }), ["enemy_a"]);
  assert.deepEqual(selectEncounterFormationIds(formations, { depth: 2 }), ["enemy_a", "enemy_b"]);
  assert.deepEqual(selectEncounterFormationIds(formations, { depth: 10 }), []);
});

test("特定階・除外階・進行フラグを編成ごとに併用できる", () => {
  const conditions = {
    minimumDepth: 10,
    maximumDepth: 20,
    exactDepths: [12, 14, 16],
    excludedDepths: [14],
    requiredFlags: ["mixedUnlocked"],
    forbiddenFlags: ["bossDefeated"]
  };
  assert.equal(matchesEncounterFormationConditions(conditions, { depth: 12, flags: { mixedUnlocked: true } }), true);
  assert.equal(matchesEncounterFormationConditions(conditions, { depth: 14, flags: { mixedUnlocked: true } }), false);
  assert.equal(matchesEncounterFormationConditions(conditions, { depth: 16, flags: { mixedUnlocked: true, bossDefeated: true } }), false);
  assert.equal(matchesEncounterFormationConditions(conditions, { depth: 12, flags: {} }), false);
});

test("条件適合後の編成は設定した重みで抽選される", () => {
  const formations = [
    defineEncounterFormation(["solo"], { minimumDepth: 1 }, 3),
    defineEncounterFormation(["mixed_a", "mixed_b"], { minimumDepth: 1 }, 1)
  ];
  assert.deepEqual(selectEncounterFormationIds(formations, { depth: 1, rng: () => 0.74 }), ["solo"]);
  assert.deepEqual(selectEncounterFormationIds(formations, { depth: 1, rng: () => 0.75 }), ["mixed_a", "mixed_b"]);
});
