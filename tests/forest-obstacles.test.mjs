import test from "node:test";
import assert from "node:assert/strict";

import { createBossCombatant, getBossById } from "../data/bosses.js";
import { getCardById } from "../data/cards.js";
import { getItem } from "../data/items.js";
import { getQuestById } from "../data/quests.js";
import { createInitialCharacter } from "../data/classes.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import { getItemUnavailableReasonForEnemies } from "../combat/resolve-item-use.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { readFile } from "node:fs/promises";

const fixedRng = () => 0.5;

function createHerbicideBattle({ hp = 10000, amount = 1, suppressedTurns = 0, enemyActsFirst = false } = {}) {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "strong_herbicide", amount).inventory;
  const enemy = createBossCombatant("fleischfresser_b59f");
  enemy.hp = hp;
  enemy.def = 9999;
  enemy.physicalDamageReduction = 1;
  enemy.magicDamageReduction = 1;
  enemy.regainSuppressedTurns = suppressedTurns;
  enemy.actions = [{
    weight: 1,
    action: {
      id: "herbicide_test_wait",
      name: "待機",
      actionType: "wait",
      speedModifier: enemyActsFirst ? 1000 : -1000,
      waitMessage: "フライシュフレッサーは動かない。"
    }
  }];
  return createBattleState({ character, enemy });
}

test("B50F through B58F place five giant vines until Fleischfresser is defeated", () => {
  for (const depth of [50, 54, 58]) {
    buildBoundaryWallMap(depth, fixedRng, { eventFlags: {} });
    assert.equal(cells.flat().filter(cell => cell.bossId === "giant_vine_obstacle").length, 5);
  }
  buildBoundaryWallMap(50, fixedRng, { eventFlags: { boss_fleischfresser_b59f_defeated: true } });
  assert.equal(cells.flat().filter(cell => cell.bossId === "giant_vine_obstacle").length, 0);
  buildBoundaryWallMap(59, fixedRng, { eventFlags: {} });
  assert.equal(cells.flat().filter(cell => cell.bossId === "giant_vine_obstacle").length, 0);
});

test("giant vines and Fleischfresser use their dedicated confirmed artwork and escape rules", () => {
  const vine = getBossById("giant_vine_obstacle");
  assert.equal(vine.encounterImage, "images/npc/NPC_event_11.avif");
  assert.equal(vine.maxHp, 500);
  assert.equal(vine.def, 60);
  assert.equal(vine.physicalDamageReduction, 0.9);
  assert.equal(vine.magicDamageReduction, 0.75);
  assert.equal(vine.escapeRate, 1);
  const boss = getBossById("fleischfresser_b59f");
  assert.equal(boss.image, "images/bosses/boss_11.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_11b.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_12.avif");
  assert.equal(boss.regainRate, 0.05);
  assert.equal(boss.event.autoStartDelay, 2000);
  assert.equal(boss.event.prompt.split("\n").length, 3);
  assert.equal(boss.escapeRate, 1);
});

test("herbicide quests, items, and legendary step-recovery cards keep their contract", () => {
  const trial = getItem("strong_herbicide_trial");
  const regular = getItem("strong_herbicide");
  assert.equal(trial.sellPrice, 0);
  assert.equal(regular.buyPrice, 100);
  assert.equal(regular.effects[0].value, 500);
  const quest020 = getQuestById("guild_020");
  assert.equal(quest020.client, "ヘレン");
  assert.equal(quest020.requiredCount, 5);
  assert.equal(quest020.reward.cardId, "legendary_mana_activation");
  assert.deepEqual(quest020.description, [
    "強力除草剤の試供品を入荷したんだけど、試しに",
    "密林区域で使ってもらいたいの。",
    "もしも効き目があるなら、店で正式に取り扱う",
    "つもりよ。お願いできるかしら？"
  ]);
  const quest023 = getQuestById("guild_023");
  assert.deepEqual(quest023.prerequisiteQuestIds, ["guild_020"]);
  assert.equal(quest023.reward.cardId, "legendary_goddess_breath");
  assert.equal(getCardById("legendary_mana_activation").effectId, "step_sp_recovery");
  assert.equal(getCardById("legendary_goddess_breath").effectId, "step_hp_recovery");
});

test("strong herbicide is available immediately when any living battle target is a giant vine", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "strong_herbicide", 1).inventory;
  const muskBeast = { id: "musk_beast_b56f", hp: 100, alive: true };
  const vine = { ...getBossById("giant_vine_obstacle"), hp: 500, alive: true };
  assert.equal(getItemUnavailableReasonForEnemies({
    character,
    itemId: "strong_herbicide",
    context: "battle",
    enemies: [vine, muskBeast, vine]
  }), "");
  assert.equal(getItemUnavailableReasonForEnemies({
    character,
    itemId: "strong_herbicide",
    context: "battle",
    enemies: [muskBeast]
  }), "plantOnly");
  for (const itemId of ["strong_herbicide_trial", "strong_herbicide"]) {
    assert.equal(getItemUnavailableReasonForEnemies({
      character: { ...character, inventory: grantItem(character.inventory, itemId, 1).inventory },
      itemId,
      context: "battle",
      enemies: [createBossCombatant("fleischfresser_b59f")]
    }), "");
  }
});

test("strong herbicide always deals its configured 500 fixed damage and refreshes regain suppression", () => {
  let battle = createHerbicideBattle({ amount: 2, enemyActsFirst: true });
  let result = resolveBattleRound({
    battle,
    playerCommand: { type: "item", itemId: "strong_herbicide" },
    rng: fixedRng
  });
  assert.equal(result.accepted, true);
  battle = result.battle;
  assert.equal(battle.enemy.hp, 9500);
  assert.equal(battle.enemy.regainSuppressedTurns, 5);
  assert.equal(getItemCount(battle.player.inventory, "strong_herbicide"), 1);
  assert.match(battle.log.join("\n"), /フライシュフレッサーに500の固定ダメージ！/);
  assert.match(battle.log.join("\n"), /再生能力が5ターン停止した！/);
  assert.deepEqual(
    battle.presentationEvents.filter(event => event.type === "damage" && event.targetSide === "enemy")
      .map(event => ({ hit: event.hit, damage: event.damage })),
    [{ hit: true, damage: 500 }]
  );

  result = resolveBattleRound({
    battle,
    playerCommand: { type: "item", itemId: "strong_herbicide" },
    rng: fixedRng
  });
  battle = result.battle;
  assert.equal(battle.enemy.hp, 9000);
  assert.equal(battle.enemy.regainSuppressedTurns, 5);
  assert.equal(getItemCount(battle.player.inventory, "strong_herbicide"), 0);
  assert.match(battle.log.join("\n"), /再生停止時間が5ターンに延長された！/);
  assert.deepEqual(
    battle.presentationEvents.filter(event => event.type === "damage" && event.targetSide === "enemy")
      .map(event => event.damage),
    [500]
  );
});

test("strong herbicide can defeat Fleischfresser through the normal victory path", () => {
  const result = resolveBattleRound({
    battle: createHerbicideBattle({ hp: 400 }),
    playerCommand: { type: "item", itemId: "strong_herbicide" },
    rng: fixedRng
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.enemy.hp, 0);
  assert.equal(result.battle.enemy.alive, false);
  assert.equal(result.battle.enemy.regainSuppressedTurns, 5);
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.battle.phase, "complete");
  assert.equal(getItemCount(result.battle.player.inventory, "strong_herbicide"), 0);
  assert.equal(result.battle.presentationEvents.some(event =>
    event.type === "damage" && event.hit === true && event.damage === 500
  ), true);
  assert.match(result.battle.log.at(-1), /フライシュフレッサーを倒した！/);
});

test("Fleischfresser loses five regain opportunities before its ordinary five-percent regain returns", () => {
  let battle = createHerbicideBattle({ hp: 9000, amount: 0, suppressedTurns: 5 });
  for (let turn = 0; turn < 5; turn += 1) {
    battle = resolveBattleRound({ battle, playerCommand: { type: "guard" }, rng: fixedRng }).battle;
    assert.equal(battle.enemy.hp, 9000);
    assert.equal(battle.enemy.regainSuppressedTurns, 4 - turn);
  }
  battle = resolveBattleRound({ battle, playerCommand: { type: "guard" }, rng: fixedRng }).battle;
  assert.equal(battle.enemy.hp, 9500);
  assert.match(battle.log.join("\n"), /500HPを再生した！/);
});

test("trial herbicide still removes a giant vine in one use and records only that quest use", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "strong_herbicide_trial", 1).inventory;
  const vine = createBossCombatant("giant_vine_obstacle");
  vine.actions = [{ weight: 1, action: { id: "wait", name: "待機", actionType: "wait", speedModifier: -1000 } }];
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: vine }),
    playerCommand: { type: "item", itemId: "strong_herbicide_trial" },
    rng: fixedRng
  });
  assert.equal(result.battle.enemy.hp, 0);
  assert.equal(result.battle.enemy.alive, false);
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.battle.player.herbicideTrialUses, 1);
  assert.equal(getItemCount(result.battle.player.inventory, "strong_herbicide_trial"), 0);
});

test("multi-enemy herbicide damage stays on the selected Fleischfresser target", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "strong_herbicide", 1).inventory;
  const vine = createBossCombatant("giant_vine_obstacle");
  const fleischfresser = createBossCombatant("fleischfresser_b59f");
  for (const enemy of [vine, fleischfresser]) {
    enemy.actions = [{ weight: 1, action: { id: "wait", name: "待機", actionType: "wait", speedModifier: -1000 } }];
  }
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: fleischfresser, enemies: [vine, fleischfresser], targetIndex: 1 }),
    playerCommand: { type: "item", itemId: "strong_herbicide", targetIndex: 1 },
    rng: fixedRng
  });
  assert.equal(result.battle.enemies[0].hp, vine.maxHp);
  assert.equal(result.battle.enemies[0].alive, true);
  assert.equal(result.battle.enemies[1].hp, 9500);
  assert.equal(result.battle.presentationEvents.some(event =>
    event.type === "damage" && event.damage === 500 && event.targetIndex === 1
  ), true);
});

test("the hidden legacy enemy stage cannot appear behind a multi-enemy formation", async () => {
  const css = await readFile(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(css, /\.battle-enemy-stage\[hidden\]\s*\{\s*display:\s*none;/);
});

test("the formation highlight follows the target-selection cursor", async () => {
  const source = await readFile(new URL("../js/battle.js", import.meta.url), "utf8");
  assert.match(source, /battleUi\.mode === "targets" \? battleUi\.selectedIndex : battle\.targetIndex/);
  assert.match(source, /renderSelection\(\);\s*renderEnemyPartySelection\(\);/);
});

test("multi-enemy names use the k8x12 pixel font", async () => {
  const css = await readFile(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(css, /\.battle-enemy-member-name\s*\{[^}]*font-family:\s*"PixelFont"/);
});
