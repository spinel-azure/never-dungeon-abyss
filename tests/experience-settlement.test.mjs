import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDepthReturnSettlement,
  createDepthReturnSettlement,
  formatDepthReturnSettlement
} from "../data/experience-settlement.js";
import { DEEP_FLOOR_PROOF_CARD_ID, GODDESS_GRACE_CARD_ID } from "../data/cards.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { resolveInnStableStay, resolveInnStay, resolveTemplePoisonTreatment } from "../js/character-services.js";
import { loadGame, writeGame } from "../js/save-data.js";

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
    depthBonusPoints: 0,
    depthBonusRate: 0,
    depthBonusExp: 0,
    johannaBonusUnlocked: false,
    johannaBonusRate: 0,
    johannaBonusExp: 0,
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
  assert.match(goddess, /女神の恩寵セット中/);
  assert.doesNotMatch(goddess, /－250/);
});

test("Johanna bonus adds ten percent of base experience with floor rounding", () => {
  const zero = calculateDepthReturnSettlement({
    baseSettlementExp: 0,
    returnFloor: 80,
    johannaBonusUnlocked: true
  });
  assert.equal(zero.johannaBonusExp, 0);
  assert.equal(zero.finalSettlementExp, 0);

  const rounded = calculateDepthReturnSettlement({
    baseSettlementExp: 19,
    returnFloor: 0,
    johannaBonusUnlocked: true
  });
  assert.equal(rounded.johannaBonusRate, 0.1);
  assert.equal(rounded.johannaBonusExp, 1);
  assert.equal(rounded.finalSettlementExp, 20);

  const formatted = formatDepthReturnSettlement(rounded);
  assert.match(formatted, /ヨハンナボーナス　＋10％/);
  assert.match(formatted, /ヨハンナ加算経験値　1/);
  assert.match(formatted, /精算経験値　　　　20/);
});

test("Johanna bonus is independent of Deep Floor Proof and Goddess protection", () => {
  const initial = {
    ...createInitialCharacter({ name: "TEST", job: "priest" }),
    carriedExperience: 10_000,
    deckCost: 20,
    eventFlags: { johanna_bonus_unlocked: true }
  };
  const proofGrant = grantCard(initial.cards, DEEP_FLOOR_PROOF_CARD_ID, 1, initial.deckCost);
  const proofCharacter = {
    ...initial,
    cards: setDeckSlot(proofGrant.cards, 0, DEEP_FLOOR_PROOF_CARD_ID, initial.deckCost)
  };
  const proofSettlement = createDepthReturnSettlement(proofCharacter, 80);
  assert.equal(proofSettlement.depthBonusExp, 5_000);
  assert.equal(proofSettlement.johannaBonusExp, 1_000);
  assert.equal(proofSettlement.finalSettlementExp, 16_000);

  const graceGrant = grantCard(proofCharacter.cards, GODDESS_GRACE_CARD_ID, 1, proofCharacter.deckCost);
  const protectedCharacter = {
    ...proofCharacter,
    cards: setDeckSlot(graceGrant.cards, 1, GODDESS_GRACE_CARD_ID, proofCharacter.deckCost)
  };
  const protectedSettlement = createDepthReturnSettlement(protectedCharacter, 80);
  assert.equal(protectedSettlement.depthBonusExp, 0);
  assert.equal(protectedSettlement.johannaBonusExp, 1_000);
  assert.equal(protectedSettlement.finalSettlementExp, 11_000);
});

test("unlocking Johanna bonus after return updates pending settlement and settles once", () => {
  const returned = {
    ...createInitialCharacter({ name: "TEST", job: "warrior" }),
    carriedExperience: 10_000
  };
  returned.pendingExperienceSettlement = createDepthReturnSettlement(returned, 80);
  assert.equal(returned.pendingExperienceSettlement.finalSettlementExp, 14_000);

  const unlocked = {
    ...returned,
    eventFlags: {
      ...(returned.eventFlags || {}),
      johanna_bonus_unlocked: true
    }
  };
  const first = resolveInnStay(unlocked);
  assert.equal(first.settlement.depthBonusExp, 4_000);
  assert.equal(first.settlement.johannaBonusExp, 1_000);
  assert.equal(first.gainedExperience, 15_000);

  const settled = { ...unlocked, ...first.changes };
  const second = resolveInnStay(settled);
  assert.equal(second.gainedExperience, 0);
  assert.equal(second.settlement.johannaBonusExp, 0);
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

test("Deep Floor Proof adds ten points unless Goddess protection suppresses the depth bonus", () => {
  const initial = { ...createInitialCharacter({ name: "TEST", job: "priest" }), deckCost: 20 };
  const granted = grantCard(initial.cards, DEEP_FLOOR_PROOF_CARD_ID, 1, initial.deckCost);
  const equipped = {
    ...initial,
    carriedExperience: 1000,
    cards: setDeckSlot(granted.cards, 0, DEEP_FLOOR_PROOF_CARD_ID, initial.deckCost)
  };
  const boosted = createDepthReturnSettlement(equipped, 70);
  assert.equal(boosted.depthBonusPoints, 0.1);
  assert.equal(boosted.depthBonusRate, 0.45);
  assert.equal(boosted.finalSettlementExp, 1450);

  const grace = grantCard(equipped.cards, GODDESS_GRACE_CARD_ID, 1, equipped.deckCost);
  const protectedCharacter = {
    ...equipped,
    cards: setDeckSlot(grace.cards, 1, GODDESS_GRACE_CARD_ID, equipped.deckCost)
  };
  assert.equal(createDepthReturnSettlement(protectedCharacter, 70).depthBonusRate, 0);
});

test("Deep Floor Proof bonus remains fixed through normalization and later deck changes", () => {
  const initial = { ...createInitialCharacter({ name: "TEST", job: "priest" }), deckCost: 20 };
  const granted = grantCard(initial.cards, DEEP_FLOOR_PROOF_CARD_ID, 1, initial.deckCost);
  const equippedCards = setDeckSlot(granted.cards, 0, DEEP_FLOOR_PROOF_CARD_ID, initial.deckCost);
  const returned = {
    ...initial,
    carriedExperience: 10_000,
    cards: equippedCards
  };
  returned.pendingExperienceSettlement = createDepthReturnSettlement(returned, 80);

  assert.equal(returned.pendingExperienceSettlement.depthBonusPoints, 0.1);
  assert.equal(returned.pendingExperienceSettlement.finalSettlementExp, 15_000);
  const restored = normalizeCharacter(structuredClone(returned));
  assert.equal(restored.pendingExperienceSettlement.depthBonusPoints, 0.1);
  assert.equal(restored.pendingExperienceSettlement.finalSettlementExp, 15_000);

  const removed = {
    ...restored,
    cards: setDeckSlot(restored.cards, 0, null, restored.deckCost)
  };
  assert.equal(resolveInnStay(removed).gainedExperience, 15_000);

  const returnedWithoutProof = {
    ...initial,
    carriedExperience: 10_000
  };
  returnedWithoutProof.pendingExperienceSettlement = createDepthReturnSettlement(returnedWithoutProof, 80);
  const proofAddedAfterReturn = {
    ...returnedWithoutProof,
    cards: equippedCards
  };
  assert.equal(resolveInnStay(proofAddedAfterReturn).gainedExperience, 14_000);

  const legacy = structuredClone(returned);
  delete legacy.pendingExperienceSettlement.depthBonusPoints;
  const normalizedLegacy = normalizeCharacter(legacy);
  assert.equal(normalizedLegacy.pendingExperienceSettlement.depthBonusPoints, 0.1);
  assert.equal(resolveInnStay(normalizedLegacy).gainedExperience, 15_000);
});

test("Deep Floor Proof settlement survives the protected save and load path", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  globalThis.window = { dispatchEvent() {} };
  globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

  const initial = { ...createInitialCharacter({ name: "SAVE", job: "priest" }), deckCost: 20 };
  const granted = grantCard(initial.cards, DEEP_FLOOR_PROOF_CARD_ID, 1, initial.deckCost);
  const returned = {
    ...initial,
    carriedExperience: 10_000,
    cards: setDeckSlot(granted.cards, 0, DEEP_FLOOR_PROOF_CARD_ID, initial.deckCost)
  };
  returned.pendingExperienceSettlement = createDepthReturnSettlement(returned, 80);
  const snapshot = {
    character: returned,
    player: { gridX: 0, gridY: 0, dir: 0 },
    dungeon: { cells: [[{ type: "floor" }]], explored: [[true]] }
  };

  assert.equal(writeGame(snapshot, "auto"), true);
  const loaded = normalizeCharacter(loadGame("auto").character);
  assert.equal(loaded.pendingExperienceSettlement.depthBonusPoints, 0.1);
  assert.equal(resolveInnStay(loaded).gainedExperience, 15_000);
});

test("Johanna bonus is restored without duplication through save normalization", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  globalThis.window = { dispatchEvent() {} };
  globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

  const returned = {
    ...createInitialCharacter({ name: "SAVE", job: "priest" }),
    carriedExperience: 10_000
  };
  returned.pendingExperienceSettlement = createDepthReturnSettlement(returned, 80);
  returned.eventFlags = {
    ...(returned.eventFlags || {}),
    johanna_bonus_unlocked: true
  };
  const snapshot = {
    character: returned,
    player: { gridX: 0, gridY: 0, dir: 0 },
    dungeon: { cells: [[{ type: "floor" }]], explored: [[true]] }
  };

  assert.equal(writeGame(snapshot, "auto"), true);
  const loaded = normalizeCharacter(loadGame("auto").character);
  assert.equal(loaded.pendingExperienceSettlement.depthBonusExp, 4_000);
  assert.equal(loaded.pendingExperienceSettlement.johannaBonusExp, 1_000);
  assert.equal(loaded.pendingExperienceSettlement.finalSettlementExp, 15_000);

  const normalizedAgain = normalizeCharacter(structuredClone(loaded));
  assert.equal(normalizedAgain.pendingExperienceSettlement.finalSettlementExp, 15_000);
  assert.equal(resolveInnStay(normalizedAgain).gainedExperience, 15_000);
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

test("temple treatment costs level times two and cures persistent ailments without changing HP or SP", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.level = 10;
  character.gold = 20;
  character.hp = 7;
  character.sp = 2;
  character.statuses = [{ statusId: "poison" }, { statusId: "deadly_poison" }, { statusId: "bleeding" }];
  character.condition = "POISON";
  const result = resolveTemplePoisonTreatment(character);
  assert.equal(result.success, true);
  assert.equal(result.character.gold, 0);
  assert.equal(result.character.hp, 7);
  assert.equal(result.character.sp, 2);
  assert.deepEqual(result.character.statuses, []);
  assert.equal(result.character.condition, "GOOD");
  const insufficient = resolveTemplePoisonTreatment({ ...character, gold: 19 });
  assert.equal(insufficient.success, false);
  assert.equal(insufficient.reason, "insufficientGold");
});
