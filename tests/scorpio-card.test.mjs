import test from "node:test";
import assert from "node:assert/strict";

import { createBattleState, getScorpioDeathPoisonRate, resolveBattleRound } from "../combat/battle-engine.js";
import { applyStatus, resolveEndOfAction } from "../combat/status-lifecycle.js";
import { getCardById } from "../data/cards.js";
import { createInitialCharacter } from "../data/classes.js";

function makeEnemy({ isBoss = false, action = null } = {}) {
  return {
    id: isBoss ? "scorpio_test_boss" : "scorpio_test_enemy",
    name: isBoss ? "TEST BOSS" : "TEST ENEMY",
    hp: 1000, maxHp: 1000, sp: 0, maxSp: 0,
    attack: 1, def: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    statuses: [], equipment: {}, elementMultipliers: {}, statusResistances: {
      death_poison: { resistancePoints: 100, immune: true }
    },
    ...(action ? { actions: [{ weight: 1, action }] } : {}),
    isBoss,
    alive: true
  };
}

test("Scorpio exposes the complete overpowered Zodiac effect", () => {
  const card = getCardById("zodiac_scorpio");
  assert.deepEqual([card.rarity, card.cost, card.maxOwned, card.maxCopies], ["Z", 8, 1, 1]);
  assert.equal(card.poisonImmunity, true);
  assert.equal(card.deadlyPoisonImmunity, true);
  assert.equal(card.deathPoisonImmunity, true);
  assert.equal(card.deathPoisonApplicationRate, 0.2);
  assert.equal(card.bossDeathPoisonApplicationMultiplier, 0.5);
  assert.equal(card.deathPoisonDamageMaxHpRate, 0.05);
  assert.match(card.descriptionJa, /毒・猛毒・死毒を完全に防ぐ/);
});

test("Scorpio death-poison rate is twenty percent and halves against bosses", () => {
  assert.equal(getScorpioDeathPoisonRate({ isBoss: false }), 0.2);
  assert.equal(getScorpioDeathPoisonRate({ isBoss: true }), 0.1);
});

test("Scorpio inflicts five-percent death poison on a landed attack even through boss immunity", () => {
  const character = createInitialCharacter({ name: "SCORPIO", job: "warrior" });
  character.baseStats.agi = 30;
  character.baseStats.dex = 30;
  character.cards.deckSlots[0] = "zodiac_scorpio";
  const battle = resolveBattleRound({
    battle: createBattleState({ character, enemy: makeEnemy({ isBoss: true }) }),
    playerCommand: { type: "attack" },
    rng: () => 0
  }).battle;
  const status = battle.enemy.statuses.find(entry => (entry.statusId || entry.id) === "death_poison");
  assert.ok(status);
  assert.equal(status.damageMaxHpRate, 0.05);
  assert.match(battle.log.join("\n"), /スコルピオの死毒に侵された/);
  const ticking = resolveEndOfAction({ statuses: battle.enemy.statuses, maxHp: battle.enemy.maxHp });
  assert.equal(ticking.deathPoisonDamage, 50);
});

test("Scorpio completely blocks poison, deadly poison, and death poison", () => {
  const character = createInitialCharacter({ name: "SCORPIO", job: "warrior" });
  character.cards.deckSlots[0] = "zodiac_scorpio";
  const venom = {
    id: "all_venom", name: "ALL VENOM", actionType: "spell", spellPower: 0,
    unavoidable: true,
    effects: ["poison", "deadly_poison", "death_poison"].map(statusId => ({
      statusId, trigger: "perAction", statusKind: "magical", baseRate: 1
    }))
  };
  const battle = resolveBattleRound({
    battle: createBattleState({ character, enemy: makeEnemy({ action: venom }) }),
    playerCommand: { type: "guard" },
    rng: () => 0
  }).battle;
  assert.equal(battle.player.statuses.some(status => ["poison", "deadly_poison", "death_poison"].includes(status.statusId || status.id)), false);
});

test("custom Scorpio death poison does not change the original ten-percent death poison", () => {
  const ordinary = applyStatus([], { statusId: "death_poison", success: true });
  const scorpio = applyStatus([], { statusId: "death_poison", success: true, damageMaxHpRate: 0.05 });
  assert.equal(resolveEndOfAction({ statuses: ordinary, maxHp: 1000 }).deathPoisonDamage, 100);
  assert.equal(resolveEndOfAction({ statuses: scorpio, maxHp: 1000 }).deathPoisonDamage, 50);
});
