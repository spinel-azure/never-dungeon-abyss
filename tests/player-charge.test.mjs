import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getLevelUnlockedSkillIds, getSkill } from "../data/skills.js";
import { createPlayerAction } from "../combat/battle-engine.js";
import {
  applyPlayerChargeAction,
  createInitialPlayerCharge,
  isPlayerChargeReady,
  normalizePlayerCharge,
  PLAYER_CHARGE_GAINS
} from "../combat/player-charge.js";
import { normalizePlayerChargePresentation } from "../js/player-charge-presentation.js";

test("player charge is backward compatible and uses the requested action gains", () => {
  assert.deepEqual(createInitialPlayerCharge(), { value: 0, cooldown: 0 });
  assert.deepEqual(normalizePlayerCharge(null), { value: 0, cooldown: 0 });
  assert.deepEqual(PLAYER_CHARGE_GAINS, { guard: 1, attack: 5, spSkill: 15 });
  let character = { playerCharge: { value: 0, cooldown: 0 } };
  character = applyPlayerChargeAction(character, { commandType: "guard" });
  character = applyPlayerChargeAction(character, { commandType: "attack" });
  character = applyPlayerChargeAction(character, { commandType: "skill", spCost: 6 });
  assert.equal(character.playerCharge.value, 21);
  character = applyPlayerChargeAction(character, { commandType: "item" });
  assert.equal(character.playerCharge.value, 21);
});

test("using a full player charge resets it and skips one full action before charging again", () => {
  let character = { playerCharge: { value: 100, cooldown: 0 } };
  assert.equal(isPlayerChargeReady(character), true);
  character = applyPlayerChargeAction(character, { commandType: "skill", chargeSkill: true });
  assert.deepEqual(character.playerCharge, { value: 0, cooldown: 1 });
  character = applyPlayerChargeAction(character, { commandType: "attack" });
  assert.deepEqual(character.playerCharge, { value: 0, cooldown: 0 });
  character = applyPlayerChargeAction(character, { commandType: "attack" });
  assert.deepEqual(character.playerCharge, { value: 5, cooldown: 0 });
});

test("each job learns exactly one configured charge skill at level 55", () => {
  const expected = {
    warrior: "falcon_schnitt",
    thief: "twin_rapid_strike",
    priest: "twilight_flash",
    mage: "tunguska"
  };
  for (const [job, skillId] of Object.entries(expected)) {
    assert.equal(getLevelUnlockedSkillIds(job, 54).includes(skillId), false);
    assert.equal(getLevelUnlockedSkillIds(job, 55).includes(skillId), true);
    assert.equal(getSkill(skillId).chargeSkill, true);
  }
});

test("charge skills expose their intended hit, element and passive profiles", () => {
  const warrior = getSkill("falcon_schnitt");
  const thief = getSkill("twin_rapid_strike");
  const priest = getSkill("twilight_flash");
  const mage = getSkill("tunguska");
  assert.deepEqual([warrior.hitCount, warrior.powerPerHit, warrior.passiveInstantDeathId], [2, 1.5, "flash_slash"]);
  assert.deepEqual([thief.hitCount, thief.powerPerHit, thief.passiveInstantDeathId], [4, 0.9, "assassination"]);
  assert.deepEqual([priest.hitCount, priest.attackStat, priest.attackStatMultiplier, priest.ignoresDefense, priest.element], [2, "int", 5, true, "ice"]);
  assert.deepEqual([mage.intelligenceMultiplier, mage.element], [15, "fire"]);
});

test("a charge skill is selectable only when learned and fully charged", () => {
  const character = createInitialCharacter({ name: "CHARGE", job: "warrior" });
  character.skillIds.push("falcon_schnitt");
  character.playerCharge = { value: 99, cooldown: 0 };
  assert.equal(createPlayerAction(character, { type: "skill", skillId: "falcon_schnitt" }).reason, "chargeNotReady");
  character.playerCharge.value = 100;
  const action = createPlayerAction(character, { type: "skill", skillId: "falcon_schnitt" });
  assert.equal(action.ok, true);
  assert.equal(action.action.hitCount, 2);
  assert.equal(action.action.passiveInstantDeathId, "flash_slash");
});

test("legacy characters gain an independent normalized player charge state", () => {
  const character = normalizeCharacter({ ...createInitialCharacter({ name: "OLD", job: "mage" }), playerCharge: undefined });
  assert.deepEqual(character.playerCharge, { value: 0, cooldown: 0 });
});

test("player charge presentation JSON is data-driven and safely normalized", () => {
  const config = JSON.parse(readFileSync(new URL("../data/effects/player_charge_skills.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(config.skills).sort(), ["falcon_schnitt", "tunguska", "twilight_flash", "twin_rapid_strike"]);
  assert.deepEqual(normalizePlayerChargePresentation({ cssClass: "test", durationMs: 250 }), {
    effect: "standard", cssClass: "test", durationMs: 250, image: "", soundId: ""
  });
});
