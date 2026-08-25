import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { createInitialCharacter } from "../data/classes.js";
import { createEnemyCombatant, getEnemyById } from "../data/enemies.js";
import { calculateFixedGoldPerDefeat } from "../data/loot.js";
import { createBattleState, createEnemyAction, resolveBattleRound, resolveMultiBattleRound } from "../combat/battle-engine.js";
import { calculatePhysicalHitRate } from "../combat/resolve-physical-attack.js";

const alwaysLast = () => 0.999999;

test("Bouncing Coin is the B1F-B4F one-to-three enemy with fixed per-unit rewards", () => {
  const coin = getEnemyById("bouncing_coin");
  assert.deepEqual({
    minimumDepth: coin.minimumDepth,
    maximumDepth: coin.maximumDepth,
    count: coin.encounterCountRange,
    strength: coin.regionStrength,
    hp: coin.maxHp,
    attack: coin.attack,
    dex: coin.stats.dex,
    exp: coin.experienceReward,
    gold: coin.dropGold,
    mixed: coin.allowMixedFormation
  }, {
    minimumDepth: 1,
    maximumDepth: 4,
    count: [1, 3],
    strength: 1,
    hp: 10,
    attack: 1,
    dex: 1,
    exp: 2,
    gold: 20,
    mixed: false
  });
  assert.equal(coin.fixedGoldPerDefeat, true);
  assert.deepEqual(coin.actions.map(entry => entry.weight), [55, 35, 10]);
  assert.deepEqual(coin.actions[0].action.hitCountRange, [1, 5]);
  assert.equal(coin.actions[0].action.hitBonus, -0.65);
  assert.equal(coin.actions[0].action.physicalHitRateFloor, 0.2);
});

test("Bouncing Coin only calls one ally at a time and stops after two reinforcements", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior", jobLabel: "戦士" });
  const coin = createEnemyCombatant(getEnemyById("bouncing_coin"));
  let battle = createBattleState({ character, enemy: coin });

  let round = resolveBattleRound({ battle, playerCommand: { type: "guard" }, rng: alwaysLast });
  assert.equal(round.accepted, true);
  battle = round.battle;
  assert.equal(battle.enemies.length, 2);
  assert.equal(battle.enemies.filter(enemy => enemy.alive).length, 2);
  assert.equal(battle.enemySummonsUsed, 1);
  assert.equal(battle.enemies[1].summonedInBattle, true);

  battle.enemies[1].hp = 0;
  battle.enemies[1].alive = false;
  round = resolveBattleRound({ battle, playerCommand: { type: "guard" }, rng: alwaysLast });
  battle = round.battle;
  assert.equal(battle.enemies.length, 3);
  assert.equal(battle.enemies.filter(enemy => enemy.alive).length, 2);
  assert.equal(battle.enemySummonsUsed, 2);

  battle.enemies[2].hp = 0;
  battle.enemies[2].alive = false;
  const action = createEnemyAction(battle.enemies[0], alwaysLast, { battle });
  assert.notEqual(action.actionType, "summonAlly");
});

test("fixed coin gold counts every defeated initial or summoned unit and ignores living units", () => {
  const coin = createEnemyCombatant(getEnemyById("bouncing_coin"));
  const defeated = [0, 1, 2].map(index => ({ ...structuredClone(coin), hp: 0, alive: false, summonedInBattle: index > 0 }));
  assert.equal(calculateFixedGoldPerDefeat(defeated), 60);
  defeated[2].hp = 10;
  defeated[2].alive = true;
  assert.equal(calculateFixedGoldPerDefeat(defeated), 40);
});

test("multi-enemy UI hides HP bars and preserves defeated layout slots invisibly", () => {
  const css = fs.readFileSync(new URL("../css/battle.css", import.meta.url), "utf8");
  const battleUi = fs.readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");
  assert.match(css, /battle-enemy-member\.is-defeated\s*\{[^}]*opacity:\s*0[^}]*visibility:\s*hidden[^}]*900ms/);
  assert.match(css, /battle-enemy-member-hp\s*\{[^}]*display:\s*none/);
  assert.match(battleUi, /member\.disabled = !enemy\.alive/);
  assert.match(battleUi, /visuallyDefeated.*presentedHp[^;]*presentedHp <= 0/);
  assert.match(battleUi, /hideDefeated = visuallyDefeated.*isEnemyVanishPending/);
  assert.match(battleUi, /aria-hidden.*hideDefeated/);
  assert.match(battleUi, /img\.classList\.toggle\("is-concealed", battleUi\.concealed\)/);
  assert.match(css, /battle-enemy-member-image\.is-concealed/);
  assert.match(css, /battle-enemy-member-image\.is-hit/);
});
test("Bouncing Coin multi-hit accuracy averages only one or two hits out of five", () => {
  const coin = createEnemyCombatant(getEnemyById("bouncing_coin"));
  const action = createEnemyAction(coin, () => 0);
  const hitRate = calculatePhysicalHitRate({
    attacker: coin.stats,
    defender: { agi: 1 },
    attack: action
  });
  assert.ok(hitRate >= 0.2 && hitRate <= 0.35, `unexpected hit rate: ${hitRate}`);
});

test("a multi-battle enemy defeated before its queued turn cannot attack", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior", jobLabel: "戦士" });
  Object.assign(character.baseStats, { str: 30, agi: 30, dex: 30, luc: 30 });
  const doomed = createEnemyCombatant(getEnemyById("bouncing_coin"));
  doomed.name = "行動前撃破対象";
  doomed.hp = 1;
  doomed.maxHp = 1;
  const survivor = createEnemyCombatant(getEnemyById("bouncing_coin"));
  survivor.name = "生存対象";
  survivor.maxHp = 999;
  survivor.hp = 999;
  const battle = createBattleState({ character, enemy: doomed, enemies: [doomed, survivor] });
  const result = resolveMultiBattleRound({
    battle,
    playerCommand: { type: "attack", targetIndex: 0 },
    rng: () => 0
  });
  assert.equal(result.battle.enemies[0].alive, false);
  assert.equal(result.battle.presentationEvents.some(event =>
    event.actorSide === "enemy" && event.actorName === "行動前撃破対象"
  ), false);
});

test("battle presentation skips queued hits after their target has vanished", async () => {
  const battleUi = fs.readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");
  assert.match(battleUi, /defeatedTargetHasQueuedHit[\s\S]*?Number\(enemyHpBefore\) <= 0/);
  assert.match(battleUi, /if \(defeatedTargetHasQueuedHit\) continue/);
});
