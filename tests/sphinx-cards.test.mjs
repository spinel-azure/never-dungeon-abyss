import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInitialCharacter } from "../data/classes.js";
import {
  getCardById,
  SPHINX_MAJESTY_CARD_ID,
  SPHINX_WISDOM_CARD_ID
} from "../data/cards.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";

function equipCard(character, cardId) {
  character.deckCost = Math.max(6, Number(character.deckCost) || 0);
  character.cards = grantCard(character.cards, cardId, 1, character.deckCost).cards;
  character.cards = setDeckSlot(character.cards, 0, cardId, character.deckCost);
  return character;
}

function makeEnemy(overrides = {}) {
  return {
    id: "sphinx_card_test_enemy", name: "TEST", hp: 9999, maxHp: 9999,
    attack: 1, def: 0, stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    statuses: [], statusResistances: {}, elementMultipliers: { fire: 1.5, ice: 0.5 },
    alive: true, isBoss: false, actions: [{ id: "wait", name: "待機", actionType: "wait", weight: 1 }],
    ...overrides
  };
}

test("Sphinx route cards are unique L cards with the confirmed effects", () => {
  const wisdom = getCardById(SPHINX_WISDOM_CARD_ID);
  const majesty = getCardById(SPHINX_MAJESTY_CARD_ID);
  assert.deepEqual([wisdom.rarity, wisdom.cost, wisdom.maxOwned, wisdom.maxCopies], ["L", 6, 1, 1]);
  assert.deepEqual([majesty.rarity, majesty.cost, majesty.maxOwned, majesty.maxCopies], ["L", 6, 1, 1]);
  assert.equal(wisdom.effectId, "sphinx_weakness_insight");
  assert.equal(wisdom.effectValue, 0.15);
  assert.equal(majesty.effectId, "sphinx_battle_barrier");
  assert.equal(majesty.effectValue, 0.15);
});

test("Sphinx wisdom multiplies player damage by 1.15 only when the resolved element is weak", () => {
  const makeMage = (cardId = null) => {
    const mage = createInitialCharacter({ name: "TEST", job: "mage" });
    mage.level = 30;
    mage.baseStats.int = 20;
    mage.sp = mage.maxSp = 99;
    return cardId ? equipCard(mage, cardId) : mage;
  };
  const cast = (character, elementMultipliers) => resolveBattleRound({
    battle: createBattleState({ character, enemy: makeEnemy({ elementMultipliers }) }),
    playerCommand: { type: "skill", skillId: "fireball" },
    rng: () => 0.5
  }).battle.presentationEvents.find(event => event.actorSide === "player" && event.type === "attackHit")?.damage;
  const normalWeak = cast(makeMage(), { fire: 1.5, ice: 0.5 });
  const wisdomWeak = cast(makeMage(SPHINX_WISDOM_CARD_ID), { fire: 1.5, ice: 0.5 });
  const normalNeutral = cast(makeMage(), { fire: 1, ice: 1 });
  const wisdomNeutral = cast(makeMage(SPHINX_WISDOM_CARD_ID), { fire: 1, ice: 1 });
  assert.equal(wisdomWeak, Math.floor(normalWeak * 1.15));
  assert.equal(wisdomNeutral, normalNeutral);
});

test("Sphinx majesty creates a ceil 15 percent barrier and absorbs direct damage before HP", () => {
  const warrior = equipCard(createInitialCharacter({ name: "TEST", job: "warrior" }), SPHINX_MAJESTY_CARD_ID);
  warrior.maxHp = warrior.hp = 101;
  const started = createBattleState({ character: warrior, enemy: makeEnemy({
    attack: 100, stats: { str: 100, int: 1, agi: 99, dex: 99, luc: 1 },
    actions: [{ id: "strike", name: "強打", actionType: "physicalAttack", powerPerHit: 1, weight: 1 }]
  }) });
  assert.equal(started.sphinxBarrier, 16);
  const result = resolveBattleRound({ battle: started, playerCommand: { type: "wait" }, rng: () => 0.5 }).battle;
  assert.equal(result.sphinxBarrier, 0);
  assert.ok(result.player.hp < 101);
  assert.ok(result.presentationEvents.some(event => event.type === "barrierDamage" && event.amount === 16));
  assert.match(result.log.join("\n"), /障壁が砕け散った/);
});

test("battle UI exposes weakness icons and the effect_06 barrier indicator", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="battleEnemyWeakness"/);
  assert.match(html, /id="sphinxBarrierStatus"[\s\S]*effect_06\.webp/);
  for (let index = 1; index <= 5; index += 1) assert.match(source, new RegExp(`effect_0${index}\\.webp`));
  assert.match(source, /Number\(multiplier\) > 1/);
});
