import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createBossCombatant } from "../data/bosses.js";
import { createEnemyCombatant, getEnemyById } from "../data/enemies.js";
import { ENEMY_DISPLAY_SIZES, getEnemyDisplaySize } from "../combat/enemy-display-size.js";

const css = fs.readFileSync(new URL("../css/battle.css", import.meta.url), "utf8");
const battle = fs.readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");

test("enemy battle display uses four reusable size categories", () => {
  assert.deepEqual(ENEMY_DISPLAY_SIZES, ["small", "medium", "large", "huge-wide"]);
  for (const size of ENEMY_DISPLAY_SIZES) assert.match(css, new RegExp(`is-size-${size}`));
  assert.match(battle, /getEnemyDisplaySize\(battle\.enemy\)/);
});

test("ordinary enemies default to small and combatants retain explicit sizes", () => {
  assert.equal(getEnemyDisplaySize(createEnemyCombatant(getEnemyById("abyss_rat"))), "small");
  assert.equal(createEnemyCombatant({ ...getEnemyById("abyss_rat"), battleSize: "medium" }).battleSize, "medium");
  assert.equal(getEnemyDisplaySize({ battleSize: "unknown" }), "small");
});

test("representative bosses use the intended large image categories", () => {
  assert.equal(createBossCombatant("fallen_mage_b19f").battleSize, "medium");
  assert.equal(createBossCombatant("iron_maiden_b29f").battleSize, "large");
  for (const id of ["sphinx_b69f", "kriechendes_chaos_b89f", "seelenwuerger_b99f", "jabberwock_event_boss"]) {
    assert.equal(createBossCombatant(id).battleSize, "huge-wide");
  }
});
