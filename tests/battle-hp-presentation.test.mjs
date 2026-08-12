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
