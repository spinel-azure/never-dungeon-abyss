import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
  applyBossVictory,
  createBossCombatant,
  getBossById,
  isBossDefeated
} from "../data/bosses.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getCardById } from "../data/cards.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import {
  breakReservedEnemyActionOnElementHit,
  createBattleState,
  createEnemyAction,
  resolveBattleRound
} from "../combat/battle-engine.js";
import { applyStatusApplications } from "../combat/status-lifecycle.js";
import { buildBoundaryWallMap, cells, setStartPosition } from "../js/dungeon.js";
import { getSpecialRoomDefinition } from "../data/special-rooms.js";
import { getAdventureChronicle } from "../data/adventure-records.js";
import { getMonsterCompendiumEntries } from "../data/monster-compendium.js";
import { recordMonsterDefeat, recordMonsterEncounter } from "../data/compendium.js";

const STANCE_MESSAGE = "エイスクラッベは巨大な鋏を引き絞り、反撃の構えを取った！";
const BREAK_MESSAGE = "炎が氷の鋏を溶かし、エイスクラッベの反撃の構えが崩れた！";

function fixed(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function combatCharacter(job = "mage") {
  const character = createInitialCharacter({ name: "TEST", job });
  character.hp = 5000;
  character.maxHp = 5000;
  character.sp = 500;
  character.maxSp = 500;
  character.baseStats = { ...character.baseStats, agi: 30, int: 30, dex: 30, str: 30, luc: 30 };
  character.skillIds = [...new Set([...(character.skillIds || []), "flame_sweep", "gale_blades"] )];
  return character;
}

function pendingBoss() {
  const boss = createBossCombatant("eiskrabbe_b47f");
  const stance = boss.actions.find(entry => entry.action.id === "eiskrabbe_counter_stance").action;
  boss.reservedEnemyAction = structuredClone(stance.reservedAction);
  return boss;
}

test("Eiskrabbe has the requested optional B47 superboss data and existing image", async () => {
  const boss = getBossById("eiskrabbe_b47f");
  assert.equal(boss.name, "エイスクラッベ");
  assert.equal(boss.floor, 47);
  assert.equal(boss.level, 65);
  assert.equal(boss.maxHp, 40000);
  assert.equal(boss.attack, 34);
  assert.equal(boss.def, 40);
  assert.deepEqual(boss.stats, { str: 36, int: 18, agi: 16, dex: 30, luc: 24 });
  assert.equal(boss.experienceReward, 25000);
  assert.equal(boss.regainAmount, undefined);
  assert.equal(boss.regainRate, undefined);
  assert.equal(boss.elementMultipliers.fire, 1.5);
  assert.equal(boss.elementMultipliers.ice, 0.5);
  assert.equal(boss.escapeRate, 1);
  assert.equal(boss.surpriseRate, 0);
  assert.equal(boss.noDrop, true);
  assert.equal(boss.bossKind, "event");
  assert.deepEqual(boss.reward, { type: "card", cardId: "zodiac_cancer", amount: 1 });
  assert.equal(boss.image, "images/bosses/boss_21.avif");
  assert.equal(boss.encounterImage, boss.image);
  await access(new URL("../images/bosses/boss_21.avif", import.meta.url));

  assert.deepEqual(boss.statusResistances.poison, { resistancePoints: 100, immune: true });
  assert.deepEqual(boss.statusResistances.deadly_poison, { resistancePoints: 65, immune: false });
  assert.deepEqual(boss.statusResistances.death_poison, { resistancePoints: 100, immune: true });
  assert.deepEqual(boss.statusResistances.bleeding, { resistancePoints: 100, immune: true });
});

test("B47 fixed room contains Eiskrabbe and no random purple chest", () => {
  setStartPosition(0, 0);
  buildBoundaryWallMap(47, fixed(0.5), {});
  const roomCell = cells.flat().find(cell => cell.specialRoom);
  assert.equal(roomCell.specialRoom.content.bossId, "eiskrabbe_b47f");
  assert.equal(roomCell.specialRoom.content.requiredZodiacCount, 3);
  assert.equal(roomCell.treasure, null);
  assert.equal(getSpecialRoomDefinition(46).content.bossId, "glacies_event_boss");
  assert.equal(getSpecialRoomDefinition(46).content.requiredQuestId, "guild_018");
});

test("Eiskrabbe weighted actions use 40/35/25 and a stance reserves the next great pincer", () => {
  const boss = createBossCombatant("eiskrabbe_b47f");
  assert.equal(createEnemyAction(boss, fixed(0.399999)).id, "eiskrabbe_ice_pincer");
  assert.equal(createEnemyAction(boss, fixed(0.4)).id, "eiskrabbe_double_pincer");
  assert.equal(createEnemyAction(boss, fixed(0.749999)).id, "eiskrabbe_double_pincer");
  assert.equal(createEnemyAction(boss, fixed(0.75)).id, "eiskrabbe_counter_stance");

  let battle = createBattleState({ character: combatCharacter(), enemy: boss });
  battle = resolveBattleRound({
    battle,
    playerCommand: { type: "wait" },
    rng: fixed(0.99, 0, 0, 0, 0)
  }).battle;
  assert.equal(battle.log.includes(STANCE_MESSAGE), true);
  assert.equal(battle.enemy.reservedEnemyAction.id, "eiskrabbe_counter_great_pincer");
  assert.equal(createEnemyAction(battle.enemy, fixed(0)).id, "eiskrabbe_counter_great_pincer");
  assert.equal(createEnemyAction(battle.enemy, fixed(0.99)).powerPerHit, 2);
});

test("an unbroken reservation executes the great pincer once and then clears", () => {
  const character = combatCharacter("warrior");
  const startingHp = character.hp;
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: pendingBoss() }),
    playerCommand: { type: "wait" },
    rng: fixed(...Array(16).fill(0))
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.player.hp < startingHp, true);
  assert.equal(result.battle.enemy.reservedEnemyAction, undefined);
  assert.equal(result.battle.log.filter(message => message.includes("反撃の大鋏！")).length, 1);
  assert.equal(result.battle.log.includes("エイスクラッベの反撃の大鋏は空を切った！"), false);
});

test("a faster fire spell cancels the already selected great pincer into a wait", () => {
  const character = combatCharacter("mage");
  const startingHp = character.hp;
  const battle = createBattleState({ character, enemy: pendingBoss() });
  const result = resolveBattleRound({
    battle,
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: fixed(0, 0, 0, 0, 0, 0)
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.enemy.reservedEnemyAction, undefined);
  assert.equal(result.battle.log.filter(message => message === BREAK_MESSAGE).length, 1);
  assert.equal(result.battle.log.includes("エイスクラッベの反撃の大鋏は空を切った！"), true);
  assert.equal(result.battle.player.hp, startingHp);
});

test("Flame Armament breaks the stance once even on a four-hit physical attack", () => {
  let character = combatCharacter("thief");
  character.cards = grantCard(character.cards, "sr_flame_armament", 1, 20).cards;
  character.cards = setDeckSlot(character.cards, 0, "sr_flame_armament", 20);
  character.equipment = { ...character.equipment, weaponId: "katzendolch", rightArmId: "katzendolch" };
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: pendingBoss() }),
    playerCommand: { type: "attack" },
    rng: fixed(...Array(24).fill(0))
  });
  const attackEvents = result.battle.presentationEvents.filter(event => event.type === "attackHit" && event.actorSide === "player");
  assert.equal(attackEvents.length, 4);
  assert.equal(result.battle.log.filter(message => message === BREAK_MESSAGE).length, 1);
  assert.equal(result.battle.enemy.reservedEnemyAction, undefined);
});

test("fire oil application alone does not break the stance, but the following physical hit does", () => {
  const character = combatCharacter("warrior");
  character.inventory = grantItem(character.inventory, "fire_lizard_oil", 1).inventory;
  const boss = pendingBoss();
  boss.statuses = applyStatusApplications([], [{ statusId: "action_skip", success: true }]);
  let result = resolveBattleRound({
    battle: createBattleState({ character, enemy: boss }),
    playerCommand: { type: "item", itemId: "fire_lizard_oil" },
    rng: fixed(...Array(12).fill(0))
  });
  assert.equal(result.accepted, true);
  assert.equal(getItemCount(result.battle.player.inventory, "fire_lizard_oil"), 0);
  assert.equal(result.battle.enemy.reservedEnemyAction.id, "eiskrabbe_counter_great_pincer");
  assert.equal(result.battle.log.includes(BREAK_MESSAGE), false);

  result = resolveBattleRound({
    battle: result.battle,
    playerCommand: { type: "attack" },
    rng: fixed(...Array(16).fill(0))
  });
  assert.equal(result.battle.log.filter(message => message === BREAK_MESSAGE).length, 1);
  assert.equal(result.battle.enemy.reservedEnemyAction, undefined);
});

test("misses and non-fire elements do not clear a reserved attack", () => {
  const battle = { log: [] };
  const enemy = pendingBoss();
  assert.equal(breakReservedEnemyActionOnElementHit({ battle, enemy, element: "fire", landedHitCount: 0 }), false);
  assert.equal(breakReservedEnemyActionOnElementHit({ battle, enemy, element: "ice", landedHitCount: 1 }), false);
  assert.equal(enemy.reservedEnemyAction.id, "eiskrabbe_counter_great_pincer");
  assert.equal(breakReservedEnemyActionOnElementHit({ battle, enemy, element: "fire", landedHitCount: 2 }), true);
  assert.equal(enemy.reservedEnemyAction, undefined);
  assert.deepEqual(battle.log, [BREAK_MESSAGE]);
});

test("fresh retries reset HP and stance, while first-victory reward and flag are idempotent", () => {
  const escaped = pendingBoss();
  escaped.hp = 123;
  const retry = createBossCombatant("eiskrabbe_b47f");
  assert.equal(retry.hp, 40000);
  assert.equal(retry.reservedEnemyAction, undefined);

  const initial = createInitialCharacter({ name: "REWARD", job: "warrior" });
  const first = applyBossVictory(initial, "eiskrabbe_b47f");
  assert.equal(first.accepted, true);
  assert.equal(isBossDefeated(first.character, "eiskrabbe_b47f"), true);
  const restored = normalizeCharacter(JSON.parse(JSON.stringify(first.character)));
  assert.equal(isBossDefeated(restored, "eiskrabbe_b47f"), true);
  const repeated = applyBossVictory(restored, "eiskrabbe_b47f");
  assert.equal(repeated.accepted, false);
  assert.equal(repeated.reason, "alreadyDefeated");
  assert.equal(repeated.reward, null);

  const cancer = getCardById(first.reward.cardId);
  assert.equal(cancer.id, "zodiac_cancer");
  assert.equal(cancer.maxHpMultiplier, 1.25);
  assert.equal(cancer.doubleReturnRate, 0.3);
  assert.equal(cancer.doubleReturnMultiplier, 2);
  const granted = grantCard(initial.cards, cancer.id, 1, initial.deckCost);
  assert.equal(granted.gained, 1);
  assert.equal(grantCard(granted.cards, cancer.id, 1, initial.deckCost).gained, 0);
});

test("victory unlocks the Eiskrabbe achievement and event-boss compendium entry", () => {
  const initial = createInitialCharacter({ name: "RECORD", job: "warrior" });
  const hidden = getAdventureChronicle(initial).find(entry => entry.id === "eiskrabbe");
  assert.equal(hidden.label, "？？？？？？――巨大な氷鋏");

  const victory = applyBossVictory(initial, "eiskrabbe_b47f");
  let character = victory.character;
  character.compendium = recordMonsterEncounter(character.compendium, "eiskrabbe_b47f");
  character.compendium = recordMonsterDefeat(character.compendium, "eiskrabbe_b47f");
  const achieved = getAdventureChronicle(character).find(entry => entry.id === "eiskrabbe");
  assert.equal(achieved.label, "エイスクラッベを倒した");
  assert.equal(achieved.achieved, true);
  const compendium = getMonsterCompendiumEntries(character, "40").find(entry => entry.id === "eiskrabbe_b47f");
  assert.equal(compendium.name, "エイスクラッベ");
  assert.equal(compendium.maxHp, "40,000");
  assert.equal(compendium.defeated, true);
});

test("escape remains retryable and the normal boss gate blocks defeated re-entry", async () => {
  const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(mainSource, /if \(!boss \|\| isCurrentBossDefeated\(boss\.id\)\) return false/);
  assert.doesNotMatch(mainSource, /outcome === "escaped" && battle\.enemy\?\.id === "eiskrabbe_b47f"/);
});
