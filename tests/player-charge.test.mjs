import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getLevelUnlockedSkillIds, getSkill } from "../data/skills.js";
import { createBattleState, createPlayerAction, resolveBattleRound } from "../combat/battle-engine.js";
import { getEffectiveSpCost } from "../combat/sp-cost.js";
import { calculatePhysicalHitRate } from "../combat/resolve-physical-attack.js";
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
  assert.deepEqual(PLAYER_CHARGE_GAINS, { guard: 1, item: 1, attack: 5, spSkill: 15 });
  let character = { playerCharge: { value: 0, cooldown: 0 } };
  character = applyPlayerChargeAction(character, { commandType: "guard" });
  character = applyPlayerChargeAction(character, { commandType: "attack" });
  character = applyPlayerChargeAction(character, { commandType: "skill", spCost: 6 });
  assert.equal(character.playerCharge.value, 21);
  character = applyPlayerChargeAction(character, { commandType: "item" });
  assert.equal(character.playerCharge.value, 22);
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
  assert.deepEqual([thief.hitCount, thief.powerPerHit, thief.defensePenetration, thief.passiveInstantDeathId], [4, 0.9, 0.5, "assassination"]);
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
  assert.equal(Object.keys(config.skills).length, 16);
  for (const id of ["nieder_schlag", "auf_schlag", "falcon_schnitt", "drachen_fang",
    "blindheit", "todes_gift", "twin_rapid_strike", "acht_streich",
    "green_budding", "green_healing", "twilight_flash", "call_goddess_name",
    "mana_spring", "mana_amplification", "tunguska", "apocalypse"]) {
    assert.ok(config.skills[id], `${id} has presentation config`);
  }
  assert.deepEqual(normalizePlayerChargePresentation({ cssClass: "test", durationMs: 250 }), {
    effect: "standard", cssClass: "test", durationMs: 250, image: "", soundId: ""
  });
});

test("each job learns charge skills at levels 10, 30, 55 and 80", () => {
  const expected = {
    warrior: ["nieder_schlag", "auf_schlag", "falcon_schnitt", "drachen_fang"],
    thief: ["blindheit", "todes_gift", "twin_rapid_strike", "acht_streich"],
    priest: ["green_budding", "green_healing", "twilight_flash", "call_goddess_name"],
    mage: ["mana_spring", "mana_amplification", "tunguska", "apocalypse"]
  };
  for (const [job, ids] of Object.entries(expected)) {
    assert.deepEqual(getLevelUnlockedSkillIds(job, 80).filter(id => getSkill(id)?.chargeSkill), ids);
  }
});

test("level 80 charge skills cost an unreduced 100 SP and are once per battle", () => {
  const character = createInitialCharacter({ name: "ULT", job: "warrior" });
  character.skillIds.push("drachen_fang");
  character.sp = character.maxSp = 200;
  character.spCostReduction = 99;
  character.playerCharge = { value: 100, cooldown: 0 };
  assert.equal(getEffectiveSpCost(getSkill("drachen_fang"), character), 100);
  const enemy = { id: "dummy", name: "DUMMY", hp: 99999, maxHp: 99999, str: 1, int: 1,
    agi: 1, dex: 1, luc: 1, def: 10, attack: 1, alive: true, statuses: [], statusResistances: {} };
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy }),
    playerCommand: { type: "skill", skillId: "drachen_fang" },
    rng: () => 0.5
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.player.sp, 100);
  assert.ok(result.battle.player.statuses.some(status => (status.id || status.statusId) === "charge_ultimate_used"));
  result.battle.player.playerCharge = { value: 100, cooldown: 0 };
  assert.equal(createPlayerAction(result.battle.player, { type: "skill", skillId: "drachen_fang" }).reason, "ultimateAlreadyUsed");
});

test("mana spring makes ordinary attack spells free but not charge skills", () => {
  const mage = createInitialCharacter({ name: "MANA", job: "mage" });
  mage.statuses = [{ id: "charge_mana_spring", statusId: "charge_mana_spring", active: true }];
  assert.equal(getEffectiveSpCost({ spCost: 12, category: "attackSpell" }, mage), 0);
  assert.equal(getEffectiveSpCost({ spCost: 100, category: "chargeSkill", chargeSkill: true, ignoreSpCostReduction: true }, mage), 100);
});

test("Blindheit lowers the afflicted enemy's physical accuracy", () => {
  const baseline = calculatePhysicalHitRate({
    attacker: { dex: 10, statuses: [] },
    defender: { agi: 10, statuses: [] }
  });
  const reduced = calculatePhysicalHitRate({
    attacker: { dex: 10, statuses: [{ id: "charge_blindness", physicalHitPenalty: 0.5, physicalHitRateFloor: 0.05 }] },
    defender: { agi: 10, statuses: [] }
  });
  assert.equal(reduced, Math.max(0.05, baseline - 0.5));
});

test("level 80 priest and mage expose holy execution and resistance bypass rules", () => {
  const priest = getSkill("call_goddess_name");
  assert.deepEqual([priest.target, priest.element, priest.ignoresDefense, priest.instantKillNormalUndead,
    priest.raceDamageMultipliers.undead], ["allEnemies", "holy", true, true, 1.25]);
  const mage = getSkill("apocalypse");
  assert.deepEqual([mage.target, mage.element, mage.intelligenceMultiplier, mage.ignoresMagicResistance],
    ["allEnemies", "arcane", 100, true]);
});
