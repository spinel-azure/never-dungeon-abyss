import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

import { createBossCombatant, getBossById } from "../data/bosses.js";
import { createInitialCharacter } from "../data/classes.js";
import { getItem } from "../data/items.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import {
  applySelfHealingFromActualHpLoss,
  breakReservedEnemyActionOnElementHit,
  createBattleState,
  createEnemyAction,
  resolveBattleRound
} from "../combat/battle-engine.js";
import { getItemUnavailableReason } from "../combat/resolve-item-use.js";

const BREAK_MESSAGE = "炎にあぶられ、振り上げた蔓がひるんだ！ 捕食の構えが崩れた！";

function fixed(value = 0) {
  return () => value;
}

function createPlayer(job = "warrior") {
  const character = createInitialCharacter({ name: "TEST", job });
  character.hp = 5000;
  character.maxHp = 5000;
  character.sp = 500;
  character.maxSp = 500;
  character.baseStats = {
    ...character.baseStats,
    str: 30,
    int: 30,
    agi: 30,
    dex: 30,
    luc: 30
  };
  return character;
}

function createPendingBoss() {
  const boss = createBossCombatant("fleischfresserknospe_b57f");
  const omen = boss.actions.find(entry =>
    entry.action.id === "fleischfresserknospe_predation_omen"
  ).action;
  boss.reservedEnemyAction = structuredClone(omen.reservedAction);
  return boss;
}

test("Fleischfresserknospe has the requested event-boss data and artwork", async () => {
  const boss = getBossById("fleischfresserknospe_b57f");
  assert.equal(boss.name, "フライシュフレッサークスノペ");
  assert.equal(boss.floor, 57);
  assert.equal(boss.level, 90);
  assert.equal(boss.maxHp, 18000);
  assert.equal(boss.attack, 44);
  assert.equal(boss.def, 42);
  assert.deepEqual(boss.stats, { str: 42, int: 42, agi: 22, dex: 38, luc: 30 });
  assert.equal(boss.experienceReward, 45000);
  assert.equal(boss.regainRate, 0.03);
  assert.equal(Math.floor(boss.maxHp * boss.regainRate), 540);
  assert.equal(boss.elementMultipliers.fire, 1.5);
  assert.equal(boss.elementMultipliers.ice, 1);
  assert.equal(boss.escapeRate, 1);
  assert.equal(boss.surpriseRate, 0);
  assert.equal(boss.noDrop, true);
  assert.equal(boss.reward.type, "none");
  assert.equal(boss.bossKind, "event");
  assert.equal(boss.defeatedFlag, "boss_fleischfresserknospe_b57f_defeated");
  assert.equal(boss.image, "images/bosses/boss_23.avif");
  assert.equal(boss.ambientEffect, "tentacle-sway");
  await access(new URL("../images/bosses/boss_23.avif", import.meta.url));

  assert.deepEqual(boss.statusResistances.poison,
    { resistancePoints: 100, immune: true });
  assert.deepEqual(boss.statusResistances.deadly_poison,
    { resistancePoints: 100, immune: true });
  assert.deepEqual(boss.statusResistances.action_skip,
    { resistancePoints: 85, immune: false });
  assert.equal(boss.statusResistances.death_poison, undefined);
});

test("Fleischfresserknospe actions use 40/25/20/15 weights and reserve predation", () => {
  const boss = createBossCombatant("fleischfresserknospe_b57f");
  assert.equal(createEnemyAction(boss, fixed(0.399999)).id,
    "fleischfresserknospe_double_thorn_vines");
  assert.equal(createEnemyAction(boss, fixed(0.4)).id,
    "fleischfresserknospe_deadly_pollen");
  assert.equal(createEnemyAction(boss, fixed(0.649999)).id,
    "fleischfresserknospe_deadly_pollen");
  assert.equal(createEnemyAction(boss, fixed(0.65)).id,
    "fleischfresserknospe_life_drain_vine");
  assert.equal(createEnemyAction(boss, fixed(0.849999)).id,
    "fleischfresserknospe_life_drain_vine");
  const omen = createEnemyAction(boss, fixed(0.85));
  assert.equal(omen.id, "fleischfresserknospe_predation_omen");
  assert.equal(omen.reservedAction.id, "fleischfresserknospe_double_vine_predation");
  assert.equal(omen.reservedAction.hitCount, 2);
  assert.equal(omen.reservedAction.powerPerHit, 1.2);
  assert.equal(omen.reservedAction.turnPriority, -1);

  const pending = createPendingBoss();
  assert.equal(createEnemyAction(pending, fixed(0)).id,
    "fleischfresserknospe_double_vine_predation");
});

test("the bleed roll is per action and life drain is based on actual HP loss", () => {
  const boss = getBossById("fleischfresserknospe_b57f");
  const thorn = boss.actions.find(entry =>
    entry.action.id === "fleischfresserknospe_double_thorn_vines"
  ).action;
  const drain = boss.actions.find(entry =>
    entry.action.id === "fleischfresserknospe_life_drain_vine"
  ).action;
  assert.deepEqual(thorn.effects, [{
    statusId: "bleeding",
    trigger: "perAction",
    statusKind: "physical",
    baseRate: 0.25
  }]);
  assert.equal(drain.selfHealFromActualHpLossRate, 1);

  const actor = { name: boss.name, hp: 17000, maxHp: 18000, alive: true };
  const battle = { log: [], presentationEvents: [] };
  assert.equal(applySelfHealingFromActualHpLoss({
    battle,
    action: drain,
    actor,
    actualHpLoss: 700
  }), 700);
  assert.equal(actor.hp, 17700);
  assert.equal(battle.presentationEvents[0].amount, 700);
  assert.equal(applySelfHealingFromActualHpLoss({
    battle,
    action: drain,
    actor,
    actualHpLoss: 900
  }), 300);
  assert.equal(actor.hp, 18000);
  assert.equal(applySelfHealingFromActualHpLoss({
    battle,
    action: drain,
    actor,
    actualHpLoss: 0
  }), 0);
});

test("life drain integration heals only the HP actually removed from its target", () => {
  const player = createPlayer();
  const boss = createBossCombatant("fleischfresserknospe_b57f");
  boss.hp = 17000;
  boss.regainRate = 0;
  boss.actions = [{
    weight: 1,
    action: {
      id: "test_life_drain",
      name: "吸命の蔓",
      actionType: "physicalAttack",
      hitCount: 1,
      powerPerHit: 1.3,
      unavoidable: true,
      speedModifier: 1000,
      selfHealFromActualHpLossRate: 1,
      effects: []
    }
  }];
  const result = resolveBattleRound({
    battle: createBattleState({ character: player, enemy: boss }),
    playerCommand: { type: "wait" },
    rng: fixed(0)
  });
  const actualHpLoss = player.hp - result.battle.player.hp;
  assert.equal(actualHpLoss > 0, true);
  assert.equal(result.battle.enemy.hp, 17000 + actualHpLoss);
  assert.equal(result.battle.presentationEvents.some(event =>
    event.type === "healing"
      && event.actorSide === "enemy"
      && event.amount === actualHpLoss
  ), true);
});

test("Knospe stance requires a landed fire attack that removes HP", () => {
  const noDamage = createPendingBoss();
  const noDamageBattle = { log: [] };
  assert.equal(breakReservedEnemyActionOnElementHit({
    battle: noDamageBattle,
    enemy: noDamage,
    element: "fire",
    landedHitCount: 1,
    actualHpLoss: 0
  }), false);
  assert.ok(noDamage.reservedEnemyAction);
  assert.deepEqual(noDamageBattle.log, []);

  const missed = createPendingBoss();
  assert.equal(breakReservedEnemyActionOnElementHit({
    battle: { log: [] },
    enemy: missed,
    element: "fire",
    landedHitCount: 0,
    actualHpLoss: 10
  }), false);
  assert.ok(missed.reservedEnemyAction);

  const nonFire = createPendingBoss();
  assert.equal(breakReservedEnemyActionOnElementHit({
    battle: { log: [] },
    enemy: nonFire,
    element: "ice",
    landedHitCount: 1,
    actualHpLoss: 10
  }), false);
  assert.ok(nonFire.reservedEnemyAction);

  const broken = createPendingBoss();
  const brokenBattle = { log: [] };
  assert.equal(breakReservedEnemyActionOnElementHit({
    battle: brokenBattle,
    enemy: broken,
    element: "fire",
    landedHitCount: 2,
    actualHpLoss: 1
  }), true);
  assert.equal(broken.reservedEnemyAction, undefined);
  assert.deepEqual(brokenBattle.log, [BREAK_MESSAGE]);
});

test("the reserved predation waits for the player's response even when the boss is faster", () => {
  const player = createPlayer("mage");
  player.baseStats.agi = 0;
  player.skillIds = [...player.skillIds, "flame_sweep"];
  const startingHp = player.hp;
  const result = resolveBattleRound({
    battle: createBattleState({ character: player, enemy: createPendingBoss() }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: fixed(0)
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.player.hp, startingHp);
  assert.equal(result.battle.enemy.reservedEnemyAction, undefined);
  assert.equal(result.battle.log.filter(message => message === BREAK_MESSAGE).length, 1);
  assert.equal(result.battle.log.includes("フライシュフレッサークスノペは体勢を立て直している。"), true);
});

test("existing Eiskrabbe still breaks on a landed fire hit even when damage is zero", () => {
  const boss = createBossCombatant("eiskrabbe_b47f");
  const stance = boss.actions.find(entry =>
    entry.action.id === "eiskrabbe_counter_stance"
  ).action;
  boss.reservedEnemyAction = structuredClone(stance.reservedAction);
  assert.equal(breakReservedEnemyActionOnElementHit({
    battle: { log: [] },
    enemy: boss,
    element: "fire",
    landedHitCount: 1,
    actualHpLoss: 0
  }), true);
});

test("both herbicides deal 500 fixed damage to Knospe and refresh five turns", () => {
  for (const itemId of ["strong_herbicide_trial", "strong_herbicide"]) {
    const player = createPlayer();
    player.inventory = grantItem(player.inventory, itemId, 1).inventory;
    const boss = createBossCombatant("fleischfresserknospe_b57f");
    boss.actions = [{
      weight: 1,
      action: {
        id: "test_wait",
        name: "待機",
        actionType: "wait",
        speedModifier: 1000,
        waitMessage: "フライシュフレッサークスノペは動かない。"
      }
    }];
    assert.equal(getItemUnavailableReason({
      character: player,
      itemId,
      context: "battle",
      enemy: boss
    }), "");
    const result = resolveBattleRound({
      battle: createBattleState({ character: player, enemy: boss }),
      playerCommand: { type: "item", itemId },
      rng: fixed(0)
    });
    assert.equal(result.battle.enemy.hp, 17500);
    assert.equal(result.battle.enemy.regainSuppressedTurns, 5);
    assert.equal(getItemCount(result.battle.player.inventory, itemId), 0);
    assert.equal(result.battle.player.herbicideTrialUses, 0);
    assert.equal(result.battle.presentationEvents.some(event =>
      event.type === "damage" && event.damage === getItem(itemId).effects[0].value
    ), true);
  }
});

test("legacy herbicide target ids remain usable even without the new data trait", () => {
  const player = createPlayer();
  player.inventory = grantItem(player.inventory, "strong_herbicide", 1).inventory;
  assert.equal(getItemUnavailableReason({
    character: player,
    itemId: "strong_herbicide",
    context: "battle",
    enemy: { id: "fleischfresser_b59f" }
  }), "");
  assert.equal(getItemUnavailableReason({
    character: player,
    itemId: "strong_herbicide",
    context: "battle",
    enemy: { id: "fleischfresserknospe_b57f" }
  }), "");
});

test("herbicide descriptions cover both flesh-eating plant bosses", () => {
  for (const itemId of ["strong_herbicide_trial", "strong_herbicide"]) {
    const description = getItem(itemId).description;
    assert.match(description, /フライシュフレッサー/);
    assert.match(description, /フライシュフレッサークスノペ/);
    assert.match(description, /再生を5ターン停止/);
  }
});
