import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDepthReturnSettlement,
  createDepthReturnSettlement,
  formatDepthReturnSettlement
} from "../data/experience-settlement.js";
import { GODDESS_GRACE_CARD_ID } from "../data/cards.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { resolveInnStableStay, resolveInnStay, resolveTemplePoisonTreatment } from "../js/character-services.js";

test("depth return bonus uses integer floor division for specified examples", () => {
  const examples = [
    [1000, 1, 5, 1005],
    [1000, 10, 50, 1050],
    [1000, 50, 250, 1250],
    [1000, 100, 500, 1500],
    [1000, 200, 1000, 2000],
    [101, 1, 0, 101],
    [333, 25, 41, 374],
    [0, 200, 0, 0]
  ];
  examples.forEach(([baseSettlementExp, returnFloor, depthBonusExp, finalSettlementExp]) => {
    const result = calculateDepthReturnSettlement({ baseSettlementExp, returnFloor });
    assert.equal(result.depthBonusExp, depthBonusExp);
    assert.equal(result.finalSettlementExp, finalSettlementExp);
    assert.equal(result.depthBonusRate, returnFloor / 200);
  });
});

test("Goddess's Grace disables only the depth bonus when equipped", () => {
  const result = calculateDepthReturnSettlement({
    baseSettlementExp: 1000,
    returnFloor: 100,
    isGoddessGraceEquipped: true
  });
  assert.deepEqual(result, {
    baseSettlementExp: 1000,
    returnFloor: 100,
    depthBonusRate: 0,
    depthBonusExp: 0,
    finalSettlementExp: 1000,
    isGoddessGraceEquipped: true
  });
});

test("settlement breakdown distinguishes normal bonus from Goddess suppression", () => {
  const normal = formatDepthReturnSettlement(calculateDepthReturnSettlement({
    baseSettlementExp: 1000,
    returnFloor: 50
  }));
  assert.match(normal, /深層帰還ボーナス　＋25％/);
  assert.match(normal, /ボーナス経験値　　250/);
  assert.match(normal, /精算経験値　　　　1,250/);

  const goddess = formatDepthReturnSettlement(calculateDepthReturnSettlement({
    baseSettlementExp: 1000,
    returnFloor: 50,
    isGoddessGraceEquipped: true
  }));
  assert.match(goddess, /深層帰還ボーナス　適用なし/);
  assert.match(goddess, /女神の恩寵　　　　装備中/);
  assert.doesNotMatch(goddess, /－250/);
});

test("owning Goddess's Grace does not disable the bonus unless it is in the deck", () => {
  const initial = createInitialCharacter({ name: "TEST", job: "priest" });
  const granted = grantCard(initial.cards, GODDESS_GRACE_CARD_ID, 1, initial.deckCost);
  const ownedOnly = {
    ...initial,
    carriedExperience: 1000,
    cards: granted.cards
  };
  assert.equal(createDepthReturnSettlement(ownedOnly, 100).finalSettlementExp, 1500);

  const equipped = {
    ...ownedOnly,
    cards: setDeckSlot(granted.cards, 0, GODDESS_GRACE_CARD_ID, initial.deckCost)
  };
  assert.equal(createDepthReturnSettlement(equipped, 100).finalSettlementExp, 1000);
  assert.equal(createDepthReturnSettlement(equipped, 100).isGoddessGraceEquipped, true);
});

test("Goddess's Grace settlement effect is locked when returning from the dungeon", () => {
  const initial = createInitialCharacter({ name: "TEST", job: "priest" });
  const granted = grantCard(initial.cards, GODDESS_GRACE_CARD_ID, 1, initial.deckCost);
  const equippedCards = setDeckSlot(granted.cards, 0, GODDESS_GRACE_CARD_ID, initial.deckCost);
  const returned = {
    ...initial,
    carriedExperience: 1000,
    cards: equippedCards
  };
  returned.pendingExperienceSettlement = createDepthReturnSettlement(returned, 100);

  const removedBeforeInn = {
    ...returned,
    cards: setDeckSlot(equippedCards, 0, null, initial.deckCost)
  };
  const result = resolveInnStay(removedBeforeInn);

  assert.equal(result.settlement.isGoddessGraceEquipped, true);
  assert.equal(result.settlement.depthBonusExp, 0);
  assert.equal(result.gainedExperience, 1000);
});

test("return floor survives save normalization and is settled exactly once at the inn", () => {
  const character = {
    ...createInitialCharacter({ name: "TEST", job: "warrior" }),
    carriedExperience: 1000
  };
  character.pendingExperienceSettlement = createDepthReturnSettlement(character, 50);
  const restored = normalizeCharacter(structuredClone(character));
  assert.equal(restored.pendingExperienceSettlement.returnFloor, 50);

  const first = resolveInnStay(restored);
  assert.equal(first.settlement.baseSettlementExp, 1000);
  assert.equal(first.settlement.returnFloor, 50);
  assert.equal(first.settlement.depthBonusExp, 250);
  assert.equal(first.gainedExperience, 1250);
  assert.equal(first.changes.carriedExperience, 0);
  assert.equal(first.changes.pendingExperienceSettlement, null);

  const settledCharacter = { ...restored, ...first.changes };
  const second = resolveInnStay(settledCharacter);
  assert.equal(second.gainedExperience, 0);
  assert.equal(second.settlement.depthBonusExp, 0);
});

test("stable lodging settles experience but only restores thirty percent of HP and SP", () => {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.hp = 1;
  character.sp = 0;
  character.statuses = [{ statusId: "poison", remainingTurns: 3 }];
  character.condition = "POISON";
  character.carriedExperience = 10;
  const result = resolveInnStableStay(character);
  assert.equal(result.changes.eventFlags.inn_stable_stayed, true);
  assert.equal(result.gainedExperience, 10);
  assert.equal(result.changes.carriedExperience, 0);
  assert.ok(result.changes.hp < result.changes.maxHp);
  assert.ok(result.changes.sp < result.changes.maxSp);
  assert.deepEqual(result.changes.statuses, character.statuses);
  assert.equal(result.changes.condition, "POISON");
});

test("normal lodging restores HP and SP without curing poison", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.hp = 1;
  character.statuses = [{ statusId: "poison", remainingTurns: 3 }];
  character.condition = "POISON";
  const result = resolveInnStay(character);
  assert.equal(result.changes.hp, result.changes.maxHp);
  assert.deepEqual(result.changes.statuses, character.statuses);
  assert.equal(result.changes.condition, "POISON");
});

test("temple poison treatment costs 15G and changes neither HP nor SP", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.gold = 15;
  character.hp = 7;
  character.sp = 2;
  character.statuses = [{ statusId: "poison" }];
  character.condition = "POISON";
  const result = resolveTemplePoisonTreatment(character);
  assert.equal(result.success, true);
  assert.equal(result.character.gold, 0);
  assert.equal(result.character.hp, 7);
  assert.equal(result.character.sp, 2);
  assert.deepEqual(result.character.statuses, []);
  assert.equal(result.character.condition, "GOOD");
  const insufficient = resolveTemplePoisonTreatment({ ...character, gold: 14 });
  assert.equal(insufficient.success, false);
  assert.equal(insufficient.reason, "insufficientGold");
});
