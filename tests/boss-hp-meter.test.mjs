import test from "node:test";
import assert from "node:assert/strict";

import { getBattleHpPercent } from "../js/battle.js";

test("boss HP meter reports one of 100 remaining segments", () => {
  assert.equal(getBattleHpPercent({ hp: 140, maxHp: 140 }), 100);
  assert.equal(getBattleHpPercent({ hp: 70, maxHp: 140 }), 50);
  assert.equal(getBattleHpPercent({ hp: 13, maxHp: 140 }), 10);
  assert.equal(getBattleHpPercent({ hp: 12, maxHp: 140 }), 9);
  assert.equal(getBattleHpPercent({ hp: 1, maxHp: 140 }), 1);
  assert.equal(getBattleHpPercent({ hp: 0, maxHp: 140 }), 0);
});
