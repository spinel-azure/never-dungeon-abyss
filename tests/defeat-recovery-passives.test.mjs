import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getLevelUnlockedSkillIds, getSkill } from "../data/skills.js";
import { createBattleState, resolveBattleOutcome } from "../combat/battle-engine.js";
import { resolveClassDefeatRecovery } from "../combat/resolve-defeat-recovery.js";

function levelCharacter(job, level = 90) {
  return normalizeCharacter({ ...createInitialCharacter({ name: "復活テスト", job }), level });
}

function dummyEnemy() {
  return {
    id: "recovery_dummy", name: "復活試験体", hp: 100, maxHp: 100, alive: true,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 }, def: 0,
    actions: [], statuses: [], statusResistances: {}, elementMultipliers: {},
    isBoss: false, experienceReward: 0
  };
}

test("mages and priests learn their level 90 recovery passives", () => {
  assert.equal(getLevelUnlockedSkillIds("mage", 89).includes("causality_alteration"), false);
  assert.equal(getLevelUnlockedSkillIds("priest", 89).includes("reincarnation"), false);
  assert.equal(getLevelUnlockedSkillIds("mage", 90).includes("causality_alteration"), true);
  assert.equal(getLevelUnlockedSkillIds("priest", 90).includes("reincarnation"), true);
  assert.equal(getSkill("causality_alteration").actionType, "passive");
  assert.equal(getSkill("reincarnation").actionType, "passive");
});

for (const [job, skillId, name] of [
  ["mage", "causality_alteration", "因果律改変"],
  ["priest", "reincarnation", "リィンカーネーション"]
]) {
  test(`${name} restores half HP, preserves SP and cures negative statuses`, () => {
    const character = levelCharacter(job);
    character.hp = 0;
    character.sp = 37;
    character.alive = false;
    character.statuses = [
      { id: "poison", statusId: "poison", active: true },
      { id: "action_skip", statusId: "action_skip", active: true },
      { id: "guardian_prayer", statusId: "guardian_prayer", active: true }
    ];
    character.condition = "POISON";
    const result = resolveClassDefeatRecovery({ character, battle: {} });
    assert.equal(result.recovered, true);
    assert.equal(result.sourceId, skillId);
    assert.equal(result.character.hp, Math.max(1, Math.floor(character.maxHp * 0.5)));
    assert.equal(result.character.sp, 37);
    assert.deepEqual(result.character.statuses, [
      { id: "guardian_prayer", statusId: "guardian_prayer", active: true }
    ]);
    assert.equal(result.character.condition, "GOOD");
    assert.equal(result.character.alive, true);
    assert.equal(result.character.adventureDefeatRecoveryUsed, true);
  });
}

test("recovery is limited to once per adventure and excluded from scripted or blocked defeats", () => {
  const base = levelCharacter("mage");
  const defeated = { ...base, hp: 0, alive: false };
  assert.equal(resolveClassDefeatRecovery({ character: { ...defeated, adventureDefeatRecoveryUsed: true } }).recovered, false);
  assert.equal(resolveClassDefeatRecovery({ character: defeated, battle: { scriptedBattleType: "story_defeat" } }).recovered, false);
  assert.equal(resolveClassDefeatRecovery({ character: defeated, battle: { defeatRecoveryDisabled: true } }).recovered, false);
  const warrior = levelCharacter("warrior");
  assert.equal(resolveClassDefeatRecovery({ character: { ...warrior, hp: 0, alive: false } }).recovered, false);
});

test("battle outcome recovery is queued after lethal damage and battle continues", () => {
  const character = levelCharacter("priest");
  const battle = createBattleState({ character, enemy: dummyEnemy() });
  battle.player.hp = 0;
  battle.player.alive = false;
  battle.player.sp = 19;
  battle.player.statuses = [{ id: "death_poison", statusId: "death_poison", active: true }];
  battle.presentationEvents = [{ type: "damage", targetSide: "player", amount: character.maxHp, message: "致命傷！" }];
  resolveBattleOutcome(battle);
  assert.equal(battle.outcome, null);
  assert.equal(battle.player.hp, Math.floor(character.maxHp * 0.5));
  assert.equal(battle.player.sp, 19);
  assert.deepEqual(battle.player.statuses, []);
  assert.equal(battle.presentationEvents.at(-1).type, "defeatRecovery");
  assert.equal(battle.presentationEvents.at(-1).message, "リィンカーネーションが発動した！");
});

test("Pisces protection is consumed before the once-per-adventure class recovery", () => {
  const character = levelCharacter("mage");
  const battle = createBattleState({ character, enemy: dummyEnemy() });
  battle.player.hp = 0;
  battle.player.alive = false;
  battle.piscesActiveAtStart = true;
  battle.piscesUsed = false;
  resolveBattleOutcome(battle);
  assert.equal(battle.piscesUsed, true);
  assert.equal(battle.player.adventureDefeatRecoveryUsed, false);
  assert.equal(battle.presentationEvents.at(-1).piscesRevival, true);
});

test("recovery use state is persisted, reset at adventure boundaries and displayed in Japanese", () => {
  const battleSource = readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");
  const mainSource = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../js/skill-overlay.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(battleSource, /adventureDefeatRecoveryUsed: Boolean\(player\.adventureDefeatRecoveryUsed\)/);
  assert.ok((mainSource.match(/character\.adventureDefeatRecoveryUsed = false/g) || []).length >= 4);
  assert.match(overlaySource, /"使用済み" : "発動可能"/);
  assert.match(overlaySource, /状態：\$\{state\}/);
  assert.match(html, /id="battleDefeatRecoveryFlash"/);
  assert.match(css, /@keyframes battle-defeat-recovery-whiteout/);
});
