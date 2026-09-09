import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  applyCancerDoubleReturn,
  createBattleState,
  resolveBattleRound
} from "../combat/battle-engine.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { applyCardVitalMultipliers, getCardById } from "../data/cards.js";
import { grantCard } from "../data/deck.js";
import { getExperienceForLevel } from "../data/growth.js";
import { applyBossVictory, getBossById, isBossDefeated } from "../data/bosses.js";
import { resolveInnStay } from "../js/character-services.js";

const storage = new Map();
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  clear() { storage.clear(); }
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type; }
};

const { loadGame, writeGame } = await import("../js/save-data.js");

function heroWithCancer({ level = 80, hp = null, maxHp = null } = {}) {
  let character = normalizeCharacter({
    ...createInitialCharacter({ name: "CANCER", job: "warrior" }),
    level,
    experience: getExperienceForLevel(level)
  });
  character.cards = grantCard(character.cards, "zodiac_cancer", 1, character.deckCost).cards;
  character.cards.deckSlots[0] = "zodiac_cancer";
  character = normalizeCharacter(character);
  if (maxHp != null) character.maxHp = maxHp;
  character.hp = hp == null ? character.maxHp : hp;
  return character;
}

function enemyWithAction({
  id = "cancer_target",
  name = "攻撃者",
  hp = 999,
  attack = 20,
  hitCount = 1,
  powerPerHit = 1,
  actionType = "physicalAttack",
  spellPower = 40,
  isBoss = false
} = {}) {
  const action = actionType === "spell"
    ? {
      id: id + "_spell",
      name: "攻撃呪文",
      actionType: "spell",
      category: "attackSpell",
      element: "arcane",
      spellPower,
      intelligenceMultiplier: 0,
      unavoidable: true,
      effects: []
    }
    : {
      id: id + "_attack",
      name: "連続攻撃",
      actionType: "physicalAttack",
      hitCount,
      powerPerHit,
      ignoresDefense: true,
      unavoidable: true,
      criticalBonus: -1,
      effects: []
    };
  return {
    id,
    name,
    hp,
    maxHp: hp,
    sp: 0,
    maxSp: 0,
    attack,
    def: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    equipment: {},
    statuses: [],
    elementMultipliers: {},
    statusResistances: {},
    actions: [{ weight: 1, action }],
    experienceReward: 10,
    dropGold: 0,
    noDrop: true,
    isBoss,
    alive: true
  };
}

function createCounterContext({
  active = true,
  playerAlive = true,
  enemyAlive = true,
  playerHp = 100,
  enemyHp = 100
} = {}) {
  return {
    battle: { cancerActiveAtStart: active, log: [], presentationEvents: [] },
    action: { actionType: "physicalAttack" },
    attacker: { id: "enemy", name: "攻撃者", hp: enemyHp, maxHp: enemyHp, alive: enemyAlive },
    defender: { id: "player", name: "CANCER", hp: playerHp, maxHp: 100, alive: playerAlive }
  };
}

function makeSaveSnapshot(character) {
  return {
    character,
    player: { gridX: 1, gridY: 1, dir: 0 },
    dungeon: { cells: [[{ type: "floor" }]], explored: [[true]] }
  };
}

test.beforeEach(() => storage.clear());

test("Cancer keeps the existing Z identity and exposes the confirmed public and detailed descriptions", () => {
  const card = getCardById("zodiac_cancer");
  assert.deepEqual(
    [card.id, card.name, card.nameJa, card.rarity, card.cost, card.maxOwned, card.maxCopies],
    ["zodiac_cancer", "CANCER", "キャンサー", "Z", 8, 1, 1]
  );
  assert.equal(card.concept, "最大HP＋25％／倍返し");
  assert.equal(card.maxHpMultiplier, 1.25);
  assert.equal(card.doubleReturnRate, 0.3);
  assert.equal(card.doubleReturnMultiplier, 2);
  assert.equal(
    card.descriptionJa,
    "最大HPが25％上昇する。敵の攻撃を受けて生き残ると、30％の確率で、実際に受けたダメージの2倍を攻撃者に与える。"
  );
  assert.match(card.detailDescriptionJa, /最大HP＋25％。被攻撃後、生存時30％で実HP減少の2倍を返す/);
  assert.match(card.detailDescriptionJa, /複数ヒットは合計で1回判定/);
  assert.match(card.detailDescriptionJa, /継続ダメージ・罠・自傷・反射・反撃は対象外/);
  assert.match(
    readFileSync(new URL("../card/renderers/card-renderer.js", import.meta.url), "utf8"),
    /detailDescriptionJa/
  );
});

test("Cancer raises maximum HP by 25 percent after additive bonuses without healing or duplicate recalculation", () => {
  let base = normalizeCharacter({
    ...createInitialCharacter({ name: "BASE", job: "warrior" }),
    level: 80,
    experience: getExperienceForLevel(80)
  });
  const baseMaxHp = base.maxHp;
  base.hp = baseMaxHp - 17;
  base.cards = grantCard(base.cards, "zodiac_cancer", 1, base.deckCost).cards;
  base.cards.deckSlots[0] = "zodiac_cancer";
  const equipped = normalizeCharacter(base);
  assert.equal(equipped.maxHp, Math.ceil(baseMaxHp * 1.25));
  assert.equal(equipped.hp, baseMaxHp - 17);
  assert.equal(normalizeCharacter(equipped).maxHp, equipped.maxHp);
  assert.equal(normalizeCharacter(equipped).hp, equipped.hp);

  const combined = applyCardVitalMultipliers(
    ["zodiac_taurus", "zodiac_cancer", "legendary_life_booster", "zodiac_virgo"],
    "maxHp",
    101
  );
  assert.equal(combined, Math.ceil(Math.ceil(Math.ceil(Math.ceil(101 * 1.5) * 1.25) * 1.2) * 1.25));

  const stayed = resolveInnStay({ ...equipped, carriedExperience: 0 });
  assert.equal(stayed.changes.maxHp, equipped.maxHp);
  assert.equal(stayed.changes.hp, equipped.maxHp);

  const removed = structuredClone(equipped);
  removed.cards.deckSlots[0] = null;
  const unequipped = normalizeCharacter(removed);
  assert.equal(unequipped.maxHp, baseMaxHp);
  assert.equal(unequipped.hp, Math.min(equipped.hp, baseMaxHp));
});

test("Cancer maximum HP survives protected save and load without multiplying again", () => {
  const character = heroWithCancer({ level: 80 });
  character.hp -= 23;
  assert.equal(writeGame(makeSaveSnapshot(character), "auto"), true);
  const loaded = normalizeCharacter(loadGame("auto").character);
  assert.equal(loaded.maxHp, character.maxHp);
  assert.equal(loaded.hp, character.hp);
  assert.equal(normalizeCharacter(loaded).maxHp, character.maxHp);
});

test("Cancer does nothing while unequipped and succeeds below but not at the 30 percent boundary", () => {
  const unequipped = createCounterContext({ active: false });
  assert.equal(applyCancerDoubleReturn({ ...unequipped, actualHpLoss: 40, rng: () => 0 }), 0);
  assert.equal(unequipped.attacker.hp, 100);

  const success = createCounterContext();
  assert.equal(applyCancerDoubleReturn({ ...success, actualHpLoss: 40, rng: () => 0.299999999 }), 80);
  assert.equal(success.attacker.hp, 20);
  assert.deepEqual(success.battle.presentationEvents.map(event => event.damage), [80]);
  assert.equal(success.battle.log[0], "キャンサーの加護！ 倍返しで攻撃者に80のダメージ！");

  const failure = createCounterContext();
  assert.equal(applyCancerDoubleReturn({ ...failure, actualHpLoss: 40, rng: () => 0.3 }), 0);
  assert.equal(failure.attacker.hp, 100);
  assert.equal(failure.battle.presentationEvents.length, 0);
});

test("Cancer aggregates a multi-hit enemy action and rolls one 120-damage counter after all three hits", () => {
  const character = heroWithCancer({ hp: 500, maxHp: 500 });
  const enemy = enemyWithAction({ hp: 300, attack: 20, hitCount: 3 });
  const sequence = [
    ...Array(11).fill(0.5),
    0
  ];
  let index = 0;
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy }),
    playerCommand: { type: "wait" },
    rng: () => sequence[Math.min(index++, sequence.length - 1)]
  }).battle;
  const received = result.presentationEvents.filter(event => (
    event.type === "attackHit" && event.targetSide === "player"
  ));
  const returned = result.presentationEvents.filter(event => event.type === "cancerCounterDamage");
  assert.deepEqual(received.map(event => event.damage), [20, 20, 20]);
  assert.equal(received.reduce((sum, event) => sum + event.damage, 0), 60);
  assert.equal(returned.length, 1);
  assert.equal(returned[0].damage, 120);
  assert.equal(result.player.hp, 440);
  assert.equal(result.enemy.hp, 180);
  assert.ok(result.presentationEvents.indexOf(returned[0]) > result.presentationEvents.indexOf(received.at(-1)));
});

test("Cancer uses HP loss after barrier absorption and does not count barrier damage", () => {
  const character = heroWithCancer({ hp: 500, maxHp: 500 });
  const enemy = enemyWithAction({ hp: 300, attack: 40 });
  const battle = createBattleState({ character, enemy });
  battle.sphinxBarrier = 15;
  battle.sphinxBarrierMax = 15;
  const result = resolveBattleRound({
    battle,
    playerCommand: { type: "wait" },
    rng: () => 0
  }).battle;
  const counter = result.presentationEvents.find(event => event.type === "cancerCounterDamage");
  const received = result.presentationEvents.find(event => (
    event.type === "attackHit" && event.targetSide === "player"
  )).damage;
  assert.equal(result.player.hp, 500 - received);
  assert.equal(counter.damage, received * 2);
  assert.equal(result.enemy.hp, 300 - received * 2);

  const blocked = createBattleState({ character, enemy });
  blocked.sphinxBarrier = 100;
  blocked.sphinxBarrierMax = 100;
  const fullyBlocked = resolveBattleRound({
    battle: blocked,
    playerCommand: { type: "wait" },
    rng: () => 0
  }).battle;
  assert.equal(fullyBlocked.player.hp, 500);
  assert.equal(fullyBlocked.presentationEvents.some(event => event.type === "cancerCounterDamage"), false);
});

test("Cancer excludes zero damage, player death, damage-over-time, traps, self damage, reflection, and counters", () => {
  for (const actionType of ["poisonDamage", "bleedingDamage", "trap", "selfDamage", "reflectDamage", "counterDamage"]) {
    const context = createCounterContext();
    context.action.actionType = actionType;
    assert.equal(applyCancerDoubleReturn({ ...context, actualHpLoss: 40, rng: () => 0 }), 0, actionType);
  }
  const zero = createCounterContext();
  assert.equal(applyCancerDoubleReturn({ ...zero, actualHpLoss: 0, rng: () => 0 }), 0);
  const dead = createCounterContext({ playerAlive: false, playerHp: 0 });
  assert.equal(applyCancerDoubleReturn({ ...dead, actualHpLoss: 40, rng: () => 0 }), 0);
});

test("Cancer keeps the recorded loss when the player is healed during the same action", () => {
  const context = createCounterContext({ playerHp: 100 });
  context.defender.hp = context.defender.maxHp;
  assert.equal(applyCancerDoubleReturn({ ...context, actualHpLoss: 40, rng: () => 0 }), 80);
  assert.equal(context.attacker.hp, 20);
});

test("Cancer supports attack spells and never applies critical, defense, resistance, or player damage multipliers", () => {
  const context = createCounterContext({ enemyHp: 100 });
  context.action.actionType = "spell";
  context.attacker.def = 999;
  context.attacker.elementMultipliers = { fire: 0 };
  context.defender.damageMultiplier = 99;
  assert.equal(applyCancerDoubleReturn({ ...context, actualHpLoss: 40, rng: () => 0 }), 80);
  assert.equal(context.attacker.hp, 20);
});

test("Cancer never answers player attacks or other non-enemy attack sources", () => {
  for (const [actorSide, targetSide] of [["player", "enemy"], ["npc", "enemy"], ["enemy", "npc"]]) {
    const context = createCounterContext();
    assert.equal(applyCancerDoubleReturn({
      ...context,
      actorSide,
      targetSide,
      actualHpLoss: 40,
      rng: () => 0
    }), 0);
    assert.equal(context.attacker.hp, 100);
  }
});

test("Cancer counters each enemy action against its original attacker in multi-enemy battles", () => {
  const character = heroWithCancer({ hp: 500, maxHp: 500 });
  const enemies = [
    enemyWithAction({ id: "left", name: "左の敵", hp: 500, attack: 20 }),
    enemyWithAction({ id: "right", name: "右の敵", hp: 500, attack: 30 })
  ];
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: enemies[0], enemies }),
    playerCommand: { type: "wait" },
    rng: () => 0
  }).battle;
  const counters = result.presentationEvents.filter(event => event.type === "cancerCounterDamage");
  assert.equal(counters.length, 2);
  assert.deepEqual(new Set(counters.map(event => event.targetIndex)), new Set([0, 1]));
  for (const event of counters) {
    const target = result.enemies[event.targetIndex];
    assert.match(event.message, new RegExp(target.name));
    assert.equal(target.hp, 500 - event.damage);
  }
});

test("Cancer counter can defeat a normal enemy or boss and boss rewards retain duplicate protection", () => {
  for (const isBoss of [false, true]) {
    const character = heroWithCancer({ hp: 500, maxHp: 500 });
    const enemy = enemyWithAction({ id: isBoss ? "counter_boss" : "counter_enemy", hp: 30, attack: 20, isBoss });
    const result = resolveBattleRound({
      battle: createBattleState({ character, enemy }),
      playerCommand: { type: "wait" },
      rng: () => 0
    }).battle;
    assert.equal(result.outcome, "victory");
    assert.equal(result.enemy.hp, 0);
    assert.equal(result.enemy.alive, false);
    assert.equal(result.presentationEvents.at(-1).type, "cancerCounterDamage");
  }

  const boss = getBossById("otherworldly_wisdom_b4f");
  const first = applyBossVictory(createInitialCharacter({ name: "REWARD", job: "warrior" }), boss);
  assert.equal(first.accepted, true);
  assert.equal(isBossDefeated(first.character, boss), true);

  const rewardBoss = getBossById("todes_scorpio_b64f");
  const once = grantCard(null, rewardBoss.reward.cardId, rewardBoss.reward.amount, 99);
  const twice = grantCard(once.cards, rewardBoss.reward.cardId, rewardBoss.reward.amount, 99);
  assert.equal(once.gained, 1);
  assert.equal(twice.gained, 0);
});

test("Cancer counter is a fixed presentation event and cannot recursively trigger hit effects", () => {
  const context = createCounterContext({ enemyHp: 200 });
  const damage = applyCancerDoubleReturn({ ...context, actualHpLoss: 40, rng: () => 0 });
  const event = context.battle.presentationEvents[0];
  assert.equal(damage, 80);
  assert.equal(event.type, "cancerCounterDamage");
  assert.equal(event.cancerDoubleReturn, true);
  assert.equal(event.critical, undefined);
  assert.equal(event.effects, undefined);
  assert.equal(context.battle.presentationEvents.length, 1);
});
