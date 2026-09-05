import test from "node:test";
import assert from "node:assert/strict";

import {
  createPacingCharacter,
  DEEP_BATTLE_SCENARIOS,
  runDeepBattlePacingMatrix
} from "../tools/simulate-deep-normal-enemy-battles.mjs";

const pacingMatrix = runDeepBattlePacingMatrix();

test("deep normal-enemy pacing uses attainable level, gear, cards, and NPC growth by region", () => {
  for (const scenario of DEEP_BATTLE_SCENARIOS) {
    for (const job of ["warrior", "thief", "priest", "mage"]) {
      const character = createPacingCharacter({
        job,
        level: scenario.level,
        band: scenario.band,
        withNpcs: true
      });
      assert.equal(character.level, scenario.level);
      assert.equal(character.cards.deckSlots.includes("zodiac_scorpio"), false);
      assert.deepEqual(character.npcSystem.activeIds, ["alec", "rebecca", "erika"]);
      assert.equal(character.npcSystem.records.alec.growthStage, Number(scenario.band.slice(1)) / 10);
      const equipped = Object.values(character.equippedInstanceIds).filter(Boolean)
        .map(instanceId => character.equipmentInventory.instances.find(instance => instance.instanceId === instanceId));
      assert.equal(equipped.every(instance => instance?.enhancement === 3), true);
      assert.equal(equipped.some(instance => instance?.equipmentId === "vorpal_sword"), false);
    }
  }
});

test("all four jobs clear every representative party battle within the pacing average", () => {
  const partyRows = pacingMatrix.filter(row => row.party === "Alec+Rebecca+Erika");
  assert.equal(partyRows.length, DEEP_BATTLE_SCENARIOS.length * 4);
  for (const row of partyRows) {
    assert.equal(row.victories, row.seeds.length, `${row.band} ${row.enemies} ${row.job}`);
    assert.equal(row.defeats, 0, `${row.band} ${row.enemies} ${row.job}`);
    assert.ok(row.averageActions <= row.targetMaximum,
      `${row.band} ${row.enemies} ${row.job}: ${row.averageActions} > ${row.targetMaximum}`);
  }
});

test("the same seeded matrix records solo action counts as a non-balancing reference", () => {
  const soloRows = pacingMatrix.filter(row => row.party === "solo");
  assert.equal(soloRows.length, DEEP_BATTLE_SCENARIOS.length * 4);
  assert.equal(soloRows.every(row => row.actions.length === row.seeds.length), true);
  assert.equal(soloRows.every(row => row.actions.every(actions => Number.isInteger(actions) && actions > 0)), true);
});
