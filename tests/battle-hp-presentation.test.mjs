import test from "node:test";
import assert from "node:assert/strict";

import { applyHpPresentationEvent } from "../js/battle.js";

test("battle HP presentation applies attacks, poison, bleeding and healing without drifting", () => {
  const battle = { player: { maxHp: 100 }, enemy: { maxHp: 80 } };
  const events = [
    { type: "attackHit", targetSide: "player", hit: true, damage: 12 },
    { type: "poisonDamage", targetSide: "player", amount: 3 },
    { type: "bleedingDamage", targetSide: "player", amount: 5 },
    { type: "healing", targetSide: "player", amount: 10 },
    { type: "attackHit", targetSide: "enemy", hit: true, damage: 20 }
  ];
  const result = events.reduce(
    (hp, event) => applyHpPresentationEvent(hp, battle, event),
    { player: 70, enemy: 80 }
  );
  assert.deepEqual(result, { player: 60, enemy: 60 });
});

test("quick-status HP can follow every player presentation event through zero HP", () => {
  const battle = { player: { maxHp: 100 }, enemy: { maxHp: 80 } };
  const cases = [
    ["normal hit", 80, [{ type: "attackHit", targetSide: "player", hit: true, damage: 15 }], 65],
    ["multi hit", 80, [
      { type: "attackHit", targetSide: "player", hit: true, damage: 8 },
      { type: "attackHit", targetSide: "player", hit: true, damage: 9 }
    ], 63],
    ["poison", 80, [{ type: "poisonDamage", targetSide: "player", amount: 4 }], 76],
    ["bleeding", 80, [{ type: "bleedingDamage", targetSide: "player", amount: 5 }], 75],
    ["healing", 80, [{ type: "healing", targetSide: "player", amount: 30 }], 100],
    ["ambush hit", 80, [{ type: "attackHit", targetSide: "player", hit: true, damage: 20 }], 60],
    ["defeat", 10, [{ type: "attackHit", targetSide: "player", hit: true, damage: 99 }], 0]
  ];
  for (const [label, startingHp, events, expectedHp] of cases) {
    let battlePlayerHp = { player: startingHp, enemy: 80 };
    let quickHpCurrent = startingHp;
    for (const event of events) {
      battlePlayerHp = applyHpPresentationEvent(battlePlayerHp, battle, event);
      if (event.targetSide === "player") quickHpCurrent = battlePlayerHp.player;
      assert.equal(quickHpCurrent, battlePlayerHp.player, `${label}: per-event HP`);
    }
    assert.equal(battlePlayerHp.player, expectedHp, `${label}: final HP`);
    assert.equal(quickHpCurrent, expectedHp, `${label}: quick-status final HP`);
  }
});

test("multi-enemy HP presentation updates only the event target in real time", () => {
  const battle = {
    enemy: { maxHp: 2000 },
    enemies: [
      { hp: 500, maxHp: 500 },
      { hp: 1900, maxHp: 2000 },
      { hp: 500, maxHp: 500 }
    ],
    targetIndex: 1
  };
  const result = applyHpPresentationEvent(
    { player: 100, enemy: 2000, enemies: [500, 2000, 500] },
    battle,
    { type: "poisonDamage", targetSide: "enemy", targetIndex: 1, amount: 100 }
  );
  assert.deepEqual(result.enemies, [500, 1900, 500]);
  assert.equal(result.enemy, 2000);
});
