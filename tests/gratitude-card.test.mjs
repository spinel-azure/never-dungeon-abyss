import test from "node:test";
import assert from "node:assert/strict";

import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import {
  calculateHealingItemSpReturn,
  isHealingItemSpReturnEligible,
  resolveFieldItemUse
} from "../combat/resolve-item-use.js";
import { getCardById, RETURN_FAVOR_CARD_ID } from "../data/cards.js";
import { createInitialCharacter } from "../data/classes.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { getItem } from "../data/items.js";
import { getItemCount, grantItem } from "../data/inventory.js";

function equipReturnFavor(character) {
  const granted = grantCard(character.cards, RETURN_FAVOR_CARD_ID, 1, 99);
  character.cards = setDeckSlot(granted.cards, 0, RETURN_FAVOR_CARD_ID, 99);
  return character;
}

function characterWithItem(itemId, { card = true } = {}) {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.maxHp = 100;
  character.hp = 50;
  character.maxSp = 100;
  character.sp = 0;
  character.inventory = grantItem(character.inventory, itemId, 1).inventory;
  return card ? equipReturnFavor(character) : character;
}

function waitingEnemy() {
  return {
    id: "gratitude_test_enemy",
    name: "DUMMY",
    level: 1,
    race: "beast",
    hp: 9999,
    maxHp: 9999,
    sp: 0,
    maxSp: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 0,
    attack: 0,
    actions: [{
      weight: 1,
      action: {
        id: "gratitude_test_wait",
        name: "待機",
        actionType: "wait",
        speedModifier: 1000,
        waitMessage: "DUMMYは動かない。"
      }
    }],
    experienceReward: 0,
    statuses: [],
    equipment: {},
    elementMultipliers: {},
    statusResistances: {},
    noDrop: true,
    isBoss: false,
    alive: true
  };
}

test("Return the Favor uses a configurable ten-percent effect and excludes HP/SP items", () => {
  const card = getCardById(RETURN_FAVOR_CARD_ID);
  assert.equal(RETURN_FAVOR_CARD_ID, "legendary_return_favor");
  assert.equal(card.effectId, "healing_item_sp_return");
  assert.equal(card.effectValue, 0.1);
  assert.equal(isHealingItemSpReturnEligible(getItem("healing_potion")), true);
  assert.equal(isHealingItemSpReturnEligible(getItem("strong_antidote")), true);
  assert.equal(isHealingItemSpReturnEligible(getItem("active_healing_potion_small")), true);
  assert.equal(isHealingItemSpReturnEligible(getItem("allheilmittel")), false);
  assert.equal(isHealingItemSpReturnEligible(getItem("zaubertrank")), false);

  assert.equal(calculateHealingItemSpReturn({
    item: getItem("healing_potion"),
    actualHpHealing: 30,
    currentSp: 0,
    maxSp: 100,
    rate: 0.1
  }), 3);
  assert.equal(calculateHealingItemSpReturn({
    item: getItem("healing_potion"),
    actualHpHealing: 9,
    currentSp: 0,
    maxSp: 100,
    rate: 0.1
  }), 0);
  assert.equal(calculateHealingItemSpReturn({
    item: getItem("healing_potion"),
    actualHpHealing: 30,
    currentSp: 99,
    maxSp: 100,
    rate: 0.1
  }), 1);
  assert.equal(calculateHealingItemSpReturn({
    item: getItem("allheilmittel"),
    actualHpHealing: 99,
    currentSp: 0,
    maxSp: 100,
    rate: 0.1
  }), 0);
});

test("field healing items restore SP from actual HP recovery in town and dungeon", () => {
  for (const context of ["town", "dungeon"]) {
    const character = characterWithItem("healing_potion");
    const result = resolveFieldItemUse({
      character,
      itemId: "healing_potion",
      context
    });
    assert.equal(result.accepted, true);
    assert.equal(result.healing, 30);
    assert.equal(result.spHealing, 3);
    assert.equal(result.character.hp, 80);
    assert.equal(result.character.sp, 3);
    assert.equal(getItemCount(result.character.inventory, "healing_potion"), 0);
    assert.match(result.message, /恩返しによりSPが3回復した/);
  }
});

test("field SP return uses capped actual healing and does not activate without the card", () => {
  const capped = characterWithItem("healing_potion");
  capped.hp = 90;
  const cappedResult = resolveFieldItemUse({
    character: capped,
    itemId: "healing_potion",
    context: "dungeon"
  });
  assert.equal(cappedResult.healing, 10);
  assert.equal(cappedResult.spHealing, 1);
  assert.equal(cappedResult.character.sp, 1);

  const noCard = characterWithItem("healing_potion", { card: false });
  const noCardResult = resolveFieldItemUse({
    character: noCard,
    itemId: "healing_potion",
    context: "dungeon"
  });
  assert.equal(noCardResult.healing, 30);
  assert.equal(noCardResult.spHealing, 0);
  assert.equal(noCardResult.character.sp, 0);
});

test("full HP gives no free SP and simultaneous HP/SP medicine is excluded", () => {
  const fullHp = characterWithItem("healing_potion");
  fullHp.hp = fullHp.maxHp;
  const rejected = resolveFieldItemUse({
    character: fullHp,
    itemId: "healing_potion",
    context: "town"
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, "fullHp");
  assert.equal(fullHp.sp, 0);

  const allheilmittel = characterWithItem("allheilmittel");
  allheilmittel.hp = 1;
  allheilmittel.sp = 1;
  const restored = resolveFieldItemUse({
    character: allheilmittel,
    itemId: "allheilmittel",
    context: "dungeon"
  });
  assert.equal(restored.accepted, true);
  assert.equal(restored.character.hp, restored.character.maxHp);
  assert.equal(restored.character.sp, restored.character.maxSp);
  assert.doesNotMatch(restored.message, /恩返し/);
});

test("battle healing items apply Return the Favor once and use the SP cap", () => {
  const character = characterWithItem("healing_potion");
  character.sp = 98;
  const result = resolveBattleRound({
    battle: createBattleState({ character, enemy: waitingEnemy() }),
    playerCommand: { type: "item", itemId: "healing_potion" },
    rng: () => 0
  });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.player.hp, 80);
  assert.equal(result.battle.player.sp, 100);
  assert.equal(getItemCount(result.battle.player.inventory, "healing_potion"), 0);
  assert.equal(result.battle.log.filter(line => /恩返しによりSPが2回復した/.test(line)).length, 1);
  assert.deepEqual(
    result.battle.presentationEvents
      .filter(event => event.type === "spHealing")
      .map(event => event.amount),
    [2]
  );
});

test("battle overheal counts its actual HP gain, while no-card use does not restore SP", () => {
  const withCard = characterWithItem("active_healing_potion_small");
  withCard.hp = withCard.maxHp;
  const activated = resolveBattleRound({
    battle: createBattleState({ character: withCard, enemy: waitingEnemy() }),
    playerCommand: { type: "item", itemId: "active_healing_potion_small" },
    rng: () => 0
  });
  assert.equal(activated.accepted, true);
  assert.equal(activated.battle.player.hp, 200);
  assert.equal(activated.battle.player.sp, 10);
  assert.equal(activated.battle.log.filter(line => /恩返し/.test(line)).length, 1);

  const withoutCard = characterWithItem("healing_potion", { card: false });
  const ordinary = resolveBattleRound({
    battle: createBattleState({ character: withoutCard, enemy: waitingEnemy() }),
    playerCommand: { type: "item", itemId: "healing_potion" },
    rng: () => 0
  });
  assert.equal(ordinary.accepted, true);
  assert.equal(ordinary.battle.player.sp, 0);
  assert.equal(ordinary.battle.presentationEvents.some(event =>
    event.type === "spHealing"
  ), false);
});
