import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getCardById } from "../data/cards.js";
import {
  calculateDeckCost,
  grantCard,
  normalizeCardState,
  setDeckSlot
} from "../data/deck.js";
import { addLootCard, settleLootBag } from "../data/inventory.js";
import {
  getPurpleChestLootTable,
  hasPurpleChestLootTable,
  rollPurpleChestLoot
} from "../data/loot.js";
import { getOwnedGalleryCards } from "../js/card-gallery.js";
import { buildBoundaryWallMap, cells, setStartPosition } from "../js/dungeon.js";
import { applyStatus } from "../combat/status-lifecycle.js";
import { applyNpcAfterPlayerAttack } from "../combat/npc-support.js";
import {
  applyBattleVictoryCardEffects,
  createBattleState,
  resolveBattleRound
} from "../combat/battle-engine.js";
import { createPersistentBattlePlayerChanges } from "../js/battle.js";

const CARD_IDS = Object.freeze(["common_follow_up", "common_guard_stone", "rare_mana_recovery"]);

function equipCards(character, cardIds) {
  character.deckCost = 20;
  cardIds.forEach((cardId, index) => {
    character.cards = grantCard(character.cards, cardId, 1, character.deckCost).cards;
    character.cards = setDeckSlot(character.cards, index, cardId, character.deckCost);
  });
  return character;
}

function makeCharacter(job = "warrior", cardIds = []) {
  const source = createInitialCharacter({ name: "TEST", job });
  source.level = 40;
  const character = normalizeCharacter(source);
  character.baseStats = { ...character.baseStats, str: 30, int: 30, agi: 100, dex: 30, luc: 10 };
  character.hp = character.maxHp = 200;
  character.sp = character.maxSp = 100;
  return equipCards(character, cardIds);
}

function makeEnemy(index = 0, overrides = {}) {
  return {
    id: `magic_purple_test_${index}`,
    name: `DUMMY ${index}`,
    level: 1,
    race: "beast",
    hp: 999,
    maxHp: 999,
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
    experienceReward: 10,
    actions: [{ id: "wait", name: "待機", actionType: "wait", weight: 1 }],
    ...overrides
  };
}

function resolve(character, enemy, command = { type: "attack" }, rng = () => 0.5) {
  return resolveBattleRound({ battle: createBattleState({ character, enemy }), playerCommand: command, rng }).battle;
}

function playerHitDamage(battle) {
  return battle.presentationEvents
    .filter(event => event.type === "attackHit" && event.actorSide === "player")
    .reduce((total, event) => total + event.damage, 0);
}

function followUps(battle) {
  return battle.presentationEvents.filter(event => event.type === "followUpDamage");
}

test("B10F-B19F purple chest table uses the exact 33/33/33/1 boundaries", () => {
  assert.equal(hasPurpleChestLootTable(10), true);
  assert.equal(hasPurpleChestLootTable(19), true);
  assert.equal(hasPurpleChestLootTable(9), true);
  assert.equal(hasPurpleChestLootTable(20), false);
  for (const [roll, cardId] of [
    [0, "common_follow_up"],
    [0.329999, "common_follow_up"],
    [0.33, "common_guard_stone"],
    [0.659999, "common_guard_stone"],
    [0.66, "rare_mana_recovery"],
    [0.989999, "rare_mana_recovery"],
    [0.99, "sr_ability_boost"],
    [0.999999, "sr_ability_boost"]
  ]) {
    assert.equal(rollPurpleChestLoot(() => roll, 10).cardId, cardId, String(roll));
  }
  const table = getPurpleChestLootTable(10);
  assert.deepEqual(table.entries.map(entry => entry.upperBound), [0.33, 0.66, 0.99, 1]);
  assert.equal(table.entries.at(-1).upperBound, 1);
  assert.equal(rollPurpleChestLoot(() => 0, 20).kind, "none");
});

test("the original B1F-B9F purple table remains 30/30/30/9/1", () => {
  const table = getPurpleChestLootTable(1);
  assert.deepEqual(table.entries.map(entry => entry.upperBound), [0.3, 0.6, 0.9, 0.99, 1]);
  assert.deepEqual(
    [0, 0.3, 0.6, 0.9, 0.99].map(roll => rollPurpleChestLoot(() => roll, 9).cardId),
    ["common_stairs_detection", "common_person_detection", "common_treasure_detection", "rare_search_and_destroy", "sr_silent_steps"]
  );
});

test("new card definitions expose the requested costs, limits, prices and gallery data", () => {
  const expected = {
    common_follow_up: ["C", 1, 1, 1, 100, 1000, 100],
    common_guard_stone: ["C", 1, 1, 1, 100, 1000, 100],
    rare_mana_recovery: ["R", 2, 1, 1, 1000, 10000, 1000]
  };
  for (const [cardId, values] of Object.entries(expected)) {
    const card = getCardById(cardId);
    assert.deepEqual(
      [card.rarity, card.cost, card.maxOwned, card.maxCopies, card.sellPrice, card.buybackPrice, card.overflowGold],
      values
    );
    assert.equal(card.category, "battle");
    assert.ok(card.iconId);
  }
  const ability = getCardById("sr_ability_boost");
  assert.deepEqual([ability.cost, ability.maxCopies, ability.effectValue], [4, 3, 5]);
  assert.deepEqual(ability.statBonus, { str: 5, int: 5, agi: 5, dex: 5, luc: 5 });

  const ownedCardCounts = Object.fromEntries(CARD_IDS.map(cardId => [cardId, 1]));
  assert.deepEqual(getOwnedGalleryCards({ ownedCardCounts }).map(card => card.id), CARD_IDS);
});

test("new cards use generic grant, duplicate conversion, deck and save normalization", () => {
  let character = makeCharacter("warrior");
  character.cards = normalizeCardState(null, character.deckCost);
  const startingGold = character.gold;
  CARD_IDS.forEach((cardId, index) => {
    character.lootBag = addLootCard(character.lootBag, cardId, 1).lootBag;
    character = settleLootBag(character).character;
    assert.equal(character.cards.ownedCardCounts[cardId], 1);
    character.cards = setDeckSlot(character.cards, index, cardId, character.deckCost);
  });
  assert.equal(calculateDeckCost(character.cards.deckSlots), 4);
  const savedCards = structuredClone(character.cards);
  assert.deepEqual(normalizeCardState(savedCards, character.deckCost), savedCards);
  character.cards = setDeckSlot(character.cards, 0, null, character.deckCost);
  assert.equal(character.cards.deckSlots[0], null);

  for (const cardId of CARD_IDS) character.lootBag = addLootCard(character.lootBag, cardId, 1).lootBag;
  const duplicate = settleLootBag(character);
  assert.equal(duplicate.gold, 1200);
  assert.equal(duplicate.character.gold, startingGold + 1200);
  assert.ok(duplicate.cardResults.every(result => result.gained === 0 && result.discarded === 1));

  const legacy = normalizeCardState({ ownedCardCounts: {}, deckSlots: CARD_IDS }, 20);
  assert.deepEqual(legacy.ownedCardIds, []);
  assert.ok(legacy.deckSlots.every(cardId => cardId === null));
});

test("Follow-Up triggers once after normal, physical-skill and spell direct damage", () => {
  const cases = [
    [makeCharacter("warrior", ["common_follow_up"]), { type: "attack" }],
    [makeCharacter("warrior", ["common_follow_up"]), { type: "skill", skillId: "wide_swing" }],
    [makeCharacter("mage", ["common_follow_up"]), { type: "skill", skillId: "fireball" }]
  ];
  for (const [character, command] of cases) {
    const battle = resolve(character, makeEnemy(), command);
    assert.ok(playerHitDamage(battle) > 0);
    assert.deepEqual(followUps(battle).map(event => event.damage), [10]);
    assert.match(battle.log.join("\n"), /追撃！ 10ダメージ！/);
  }
});

test("Follow-Up applies only once to a target after a multi-hit attack", () => {
  const thief = makeCharacter("thief", ["common_follow_up"]);
  const battle = resolve(thief, makeEnemy());
  assert.ok(battle.presentationEvents.filter(event => event.type === "attackHit" && event.actorSide === "player").length >= 2);
  assert.equal(followUps(battle).length, 1);
});

test("Follow-Up applies to each damaged living target of an all-enemy attack", () => {
  const mage = makeCharacter("mage", ["common_follow_up"]);
  const enemies = [makeEnemy(0), makeEnemy(1), makeEnemy(2)];
  const battle = resolveBattleRound({
    battle: createBattleState({ character: mage, enemy: enemies[0], enemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  }).battle;
  assert.deepEqual(followUps(battle).map(event => event.targetIndex), [0, 1, 2]);
  assert.ok(followUps(battle).every(event => event.damage === 10));
});

test("Follow-Up excludes misses, zero damage, DOT, banishment and NPC attacks", () => {
  const warrior = makeCharacter("warrior", ["common_follow_up"]);
  const missed = resolve(warrior, makeEnemy(0, {
    stats: { str: 1, int: 1, agi: 999, dex: 999, luc: 1 },
    physicalHitFloor: 0,
    evasionBonus: 0.9
  }), { type: "attack" }, () => 0.999999);
  assert.equal(playerHitDamage(missed), 0);
  assert.equal(followUps(missed).length, 0);

  const mage = makeCharacter("mage", ["common_follow_up"]);
  const immune = resolve(mage, makeEnemy(1, { elementMultipliers: { fire: 0 } }), { type: "skill", skillId: "fireball" });
  assert.equal(playerHitDamage(immune), 0);
  assert.equal(followUps(immune).length, 0);

  const poisonedEnemy = makeEnemy(2, { statuses: applyStatus([], { statusId: "poison", success: true }) });
  const poisonRound = resolve(warrior, poisonedEnemy, { type: "wait" });
  assert.ok(poisonRound.presentationEvents.some(event => event.type === "poisonDamage"));
  assert.equal(followUps(poisonRound).length, 0);

  const priest = makeCharacter("priest", ["common_follow_up"]);
  const banished = resolve(priest, makeEnemy(3, { race: "undead" }), { type: "skill", skillId: "exorcism" });
  assert.equal(banished.outcome, "victory");
  assert.equal(followUps(banished).length, 0);

  warrior.npcSystem = {
    registeredIds: ["alec"], activeIds: ["alec"],
    records: { alec: { maxDepth: 10, growthStage: 1, charge: 0, chargeCooldown: 0 } },
    renewal: null, expeditionMaxDepth: 10
  };
  const npcBattle = createBattleState({ character: warrior, enemy: makeEnemy(4) });
  applyNpcAfterPlayerAttack(npcBattle, () => 0.5);
  assert.ok(npcBattle.presentationEvents.some(event => event.actorSide === "npc"));
  assert.equal(followUps(npcBattle).length, 0);
});

test("Follow-Up can defeat one or several enemies without duplicating victory", () => {
  const ordinary = makeCharacter("mage");
  const baseline = resolve(ordinary, makeEnemy(), { type: "skill", skillId: "fireball" });
  const directDamage = playerHitDamage(baseline);
  assert.ok(directDamage > 0);

  const mage = makeCharacter("mage", ["common_follow_up"]);
  const single = resolve(mage, makeEnemy(0, { hp: directDamage + 5, maxHp: directDamage + 5 }), { type: "skill", skillId: "fireball" });
  assert.equal(single.outcome, "victory");
  assert.equal(followUps(single).length, 1);
  assert.equal(single.enemy.hp, 0);

  const sweepBaselineEnemies = [makeEnemy(10), makeEnemy(11), makeEnemy(12)];
  const sweepBaseline = resolveBattleRound({
    battle: createBattleState({ character: ordinary, enemy: sweepBaselineEnemies[0], enemies: sweepBaselineEnemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  }).battle;
  const sweepDamage = sweepBaseline.presentationEvents.find(event => (
    event.type === "attackHit" && event.actorSide === "player"
  )).damage;
  const enemies = [0, 1, 2].map(index => makeEnemy(index, { hp: sweepDamage + 5, maxHp: sweepDamage + 5 }));
  const group = resolveBattleRound({
    battle: createBattleState({ character: mage, enemy: enemies[0], enemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  }).battle;
  assert.equal(group.outcome, "victory");
  assert.equal(followUps(group).length, 3);
  assert.equal(group.log.filter(line => line === "敵の一団を倒した！").length, 1);
  assert.equal(group.enemies.reduce((total, enemy) => total + enemy.experienceReward, 0), 30);
});

test("Guard Stone creates a fresh 15-point barrier and absorbs only enemy direct damage", () => {
  const character = makeCharacter("warrior", ["common_guard_stone"]);
  const low = createBattleState({ character, enemy: makeEnemy(0, {
    actions: [{ id: "tap", name: "小突く", actionType: "physicalAttack", powerPerHit: 0.1, weight: 1 }]
  }) });
  assert.equal(low.sphinxBarrier, 15);
  assert.equal(low.sphinxBarrierMax, 15);
  assert.match(low.log.join("\n"), /護りの魔石が障壁を展開した/);
  const lowRound = resolveBattleRound({ battle: low, playerCommand: { type: "wait" }, rng: () => 0.5 }).battle;
  assert.equal(lowRound.player.hp, character.hp);
  assert.ok(lowRound.sphinxBarrier < 15 && lowRound.sphinxBarrier >= 0);

  const strong = resolveBattleRound({
    battle: createBattleState({ character, enemy: makeEnemy(1, {
      attack: 200,
      stats: { str: 200, int: 1, agi: 1, dex: 100, luc: 1 },
      actions: [{ id: "smash", name: "強打", actionType: "physicalAttack", powerPerHit: 1, weight: 1 }]
    }) }),
    playerCommand: { type: "wait" },
    rng: () => 0.5
  }).battle;
  assert.equal(strong.sphinxBarrier, 0);
  assert.ok(strong.player.hp < character.hp);
  assert.ok(strong.presentationEvents.some(event => event.type === "barrierDamage" && event.amount === 15));

  const poisoned = makeCharacter("warrior", ["common_guard_stone"]);
  poisoned.statuses = applyStatus([], { statusId: "poison", success: true });
  const poisonRound = resolve(poisoned, makeEnemy(2), { type: "wait" });
  assert.ok(poisonRound.player.hp < poisoned.hp);
  assert.equal(poisonRound.sphinxBarrier, 15);

  assert.equal(createBattleState({ character, enemy: makeEnemy(3) }).sphinxBarrier, 15);
  assert.equal(createBattleState({ character: makeCharacter(), enemy: makeEnemy(4) }).sphinxBarrier, 0);
});

test("Guard Stone adds to the existing Sphinx Majesty barrier with existing rounding", () => {
  const character = makeCharacter("warrior", ["common_guard_stone", "legendary_sphinx_majesty"]);
  character.maxHp = character.hp = 101;
  const battle = createBattleState({ character, enemy: makeEnemy() });
  assert.equal(battle.sphinxBarrier, 31);
  assert.equal(battle.sphinxBarrierMax, 31);
  assert.ok(battle.log.includes("スピンクスの威容が障壁を展開した！"));
  assert.ok(battle.log.includes("護りの魔石が障壁を展開した！"));
});

test("Mana Recovery restores actual SP once on a real victory and persists on the battle player", () => {
  const character = makeCharacter("warrior", ["rare_mana_recovery"]);
  character.sp = 80;
  const battle = resolve(character, makeEnemy(0, { hp: 1, maxHp: 1 }));
  assert.equal(battle.outcome, "victory");
  assert.equal(battle.player.sp, 85);
  assert.equal(battle.presentationEvents.filter(event => event.type === "spHealing").length, 1);
  assert.ok(battle.log.includes("魔力回収によりSPが5回復した！"));
  assert.equal(applyBattleVictoryCardEffects(battle), 0);
  assert.equal(battle.player.sp, 85);
  assert.equal(normalizeCharacter(structuredClone(battle.player)).sp, 85);
});

test("Mana Recovery is included in the persistent character state at battle completion", () => {
  const character = makeCharacter("warrior", ["rare_mana_recovery"]);
  character.sp = 80;
  const battle = resolve(character, makeEnemy(0, { hp: 1, maxHp: 1 }));
  const changes = createPersistentBattlePlayerChanges(battle.player);
  assert.equal(changes.sp, 85);
  assert.equal(normalizeCharacter({ ...character, ...changes }).sp, 85);
  assert.notEqual(changes.inventory, battle.player.inventory);
});

test("Mana Recovery caps the actual amount and stays silent at full SP", () => {
  const nearFull = makeCharacter("warrior", ["rare_mana_recovery"]);
  nearFull.sp = 98;
  const capped = resolve(nearFull, makeEnemy(0, { hp: 1, maxHp: 1 }));
  assert.equal(capped.player.sp, 100);
  assert.ok(capped.log.includes("魔力回収によりSPが2回復した！"));

  const full = makeCharacter("warrior", ["rare_mana_recovery"]);
  const unchanged = resolve(full, makeEnemy(1, { hp: 1, maxHp: 1 }));
  assert.equal(unchanged.player.sp, 100);
  assert.equal(unchanged.presentationEvents.some(event => event.type === "spHealing"), false);
  assert.equal(unchanged.log.some(line => line.includes("魔力回収により")), false);
});

test("Mana Recovery also resolves once when NPC support defeats the last enemy", () => {
  const character = makeCharacter("warrior", ["rare_mana_recovery"]);
  character.sp = 50;
  character.npcSystem = {
    registeredIds: ["rebecca"], activeIds: ["rebecca"],
    records: { rebecca: { maxDepth: 100, growthStage: 10, charge: 0, chargeCooldown: 0 } },
    renewal: null, expeditionMaxDepth: 100
  };
  const battle = resolve(character, makeEnemy(0, { hp: 1, maxHp: 1 }), { type: "wait" });
  assert.equal(battle.outcome, "victory");
  assert.equal(battle.player.sp, 55);
  assert.equal(battle.presentationEvents.filter(event => event.type === "spHealing").length, 1);
});

test("Mana Recovery never activates for escape, defeat, forced defeat or interruption", () => {
  for (const outcome of ["escaped", "defeat", "jireneScriptedDefeat", null]) {
    const battle = createBattleState({
      character: makeCharacter("warrior", ["rare_mana_recovery"]),
      enemy: makeEnemy()
    });
    battle.player.sp = 50;
    battle.outcome = outcome;
    assert.equal(applyBattleVictoryCardEffects(battle), 0);
    assert.equal(battle.player.sp, 50);
  }
});

test("Mana Recovery runs once for a multi-enemy victory regardless of enemy count", () => {
  const mage = makeCharacter("mage", ["rare_mana_recovery"]);
  mage.sp = 50;
  const enemies = [0, 1, 2].map(index => makeEnemy(index, { hp: 1, maxHp: 1 }));
  const battle = resolveBattleRound({
    battle: createBattleState({ character: mage, enemy: enemies[0], enemies }),
    playerCommand: { type: "skill", skillId: "flame_sweep" },
    rng: () => 0.5
  }).battle;
  assert.equal(battle.outcome, "victory");
  assert.equal(battle.player.sp, 47);
  assert.equal(battle.presentationEvents.filter(event => event.type === "spHealing").length, 1);
  assert.equal(applyBattleVictoryCardEffects(battle), 0);
});

test("B10F-B19F purple chests use empty special rooms and never replace fixed contents", () => {
  setStartPosition(0, 0);
  for (const depth of [10, 11, 12, 13, 15, 17, 19]) {
    buildBoundaryWallMap(depth, () => 0.5, { maikaeferNestRoll: 1 });
    const room = cells.flat().find(cell => cell.specialRoom);
    assert.equal(room.specialRoom.content, null, `B${depth}F content`);
    assert.equal(room.treasure, "purple", `B${depth}F purple chest`);
    assert.ok(room.treasureTrapId === null || typeof room.treasureTrapId === "string");
    assert.equal(cells.flat().filter(cell => cell.treasure === "purple").length, 1);
  }
  for (const depth of [14, 16, 18]) {
    buildBoundaryWallMap(depth, () => 0.5, { maikaeferNestRoll: 1 });
    const room = cells.flat().find(cell => cell.specialRoom);
    assert.ok(room.specialRoom.content, `B${depth}F fixed content`);
    assert.equal(room.treasure, null);
  }
  buildBoundaryWallMap(20, () => 0.5, { maikaeferNestRoll: 1 });
  assert.equal(cells.flat().some(cell => cell.treasure === "purple"), false);
});

test("purple chest save restoration keeps unopened chests and does not revive opened ones", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /const unusedSpecialRoomPurple = savedCell\.treasure === "purple"/);
  assert.match(source, /&& !unusedSpecialRoomPurple\) savedCell\.treasure = null/);
  assert.match(source, /Object\.assign\(cells\[y\]\[x\], savedCell\)/);
  assert.doesNotMatch(source, /restoreGame[\s\S]*placePurpleSpecialRoomTreasure/);
});
