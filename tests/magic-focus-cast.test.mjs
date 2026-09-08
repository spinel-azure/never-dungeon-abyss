import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { applyStatusApplications } from "../combat/status-lifecycle.js";

function makeMage({ focused = false, gemini = false } = {}) {
  const source = createInitialCharacter({ name: "FOCUS", job: "mage" });
  source.level = 40;
  const character = normalizeCharacter(source);
  character.baseStats = { ...character.baseStats, int: 20, agi: 100, dex: 30, luc: 1 };
  character.sp = character.maxSp = 999;
  if (focused) {
    character.statuses = applyStatusApplications(character.statuses, [{
      statusId: "magic_focus", success: true
    }]);
  }
  if (gemini) character.cards.deckSlots[0] = "zodiac_gemini";
  return character;
}

function makeEnemy(index = 0) {
  return {
    id: `focus_target_${index}`,
    name: `TARGET ${index}`,
    level: 1,
    race: "beast",
    hp: 9999,
    maxHp: 9999,
    sp: 0,
    maxSp: 0,
    attack: 1,
    def: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    statuses: [],
    statusResistances: {},
    elementMultipliers: {},
    alive: true,
    isBoss: false,
    experienceReward: 0,
    actions: [{ id: "wait", name: "待機", actionType: "wait", weight: 1 }]
  };
}

function playerDamageEvents(battle) {
  return battle.presentationEvents.filter(event => event.type === "attackHit" && event.actorSide === "player");
}

function castSingle(character) {
  return resolveBattleRound({
    battle: createBattleState({ character, enemy: makeEnemy() }),
    playerCommand: { type: "skill", skillId: "fireball" },
    rng: () => 0.5
  }).battle;
}

test("Magic Focus strengthens one single-target casting and is then consumed", () => {
  const ordinary = castSingle(makeMage());
  const focused = castSingle(makeMage({ focused: true }));
  assert.equal(playerDamageEvents(focused)[0].damage, Math.floor(playerDamageEvents(ordinary)[0].damage * 1.5));
  assert.equal(focused.player.statuses.some(status => (status.id || status.statusId) === "magic_focus"), false);
  assert.equal(focused.log.filter(line => line.includes("魔力集中の力")).length, 1);
});

test("Magic Focus applies to every target in the original casting", () => {
  const ordinaryEnemies = [makeEnemy(0), makeEnemy(1)];
  const focusedEnemies = [makeEnemy(0), makeEnemy(1)];
  const ordinary = resolveBattleRound({
    battle: createBattleState({ character: makeMage(), enemy: ordinaryEnemies[0], enemies: ordinaryEnemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  }).battle;
  const focused = resolveBattleRound({
    battle: createBattleState({ character: makeMage({ focused: true }), enemy: focusedEnemies[0], enemies: focusedEnemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  }).battle;
  const ordinaryDamage = playerDamageEvents(ordinary).map(event => event.damage);
  assert.deepEqual(
    playerDamageEvents(focused).map(event => event.damage),
    ordinaryDamage.map(damage => Math.floor(damage * 1.5))
  );
  assert.equal(focused.log.filter(line => line.includes("魔力集中の力")).length, 1);
});

test("Magic Focus does not carry from the original casting into Gemini's extra casting", () => {
  const ordinary = castSingle(makeMage());
  const focusedGemini = castSingle(makeMage({ focused: true, gemini: true }));
  const events = playerDamageEvents(focusedGemini);
  assert.equal(events.length, 2);
  assert.equal(events[0].damage, Math.floor(playerDamageEvents(ordinary)[0].damage * 1.5));
  assert.equal(events[1].damage, playerDamageEvents(ordinary)[0].damage);
  assert.equal(focusedGemini.geminiDuplicationAvailable, false);
});
