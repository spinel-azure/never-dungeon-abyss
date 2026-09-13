import test from "node:test";
import assert from "node:assert/strict";

import { createNormalAttack } from "../combat/create-attack.js";
import { resolvePhysicalAttack } from "../combat/resolve-physical-attack.js";
import { getWeapon } from "../data/weapons.js";

const RELICS = Object.freeze({
  warrior: "musashi_blade",
  thief: "the_five_star",
  priest: "sylvan_emera",
  mage: "comet_booster"
});

test("the four romance relics remain unique, unenhanced, unsellable job weapons", () => {
  for (const [job, id] of Object.entries(RELICS)) {
    const weapon = getWeapon(id, 3);
    assert.deepEqual(weapon.allowedJobs, [job]);
    assert.equal(weapon.unique, true);
    assert.equal(weapon.sellPrice, 0);
    assert.equal(weapon.lotBagHighlight, "orange");
    assert.equal(weapon.attackByEnhancement, undefined);
  }
});

test("Musashi Blade is B80-ready while Katzbalger remains the safer final weapon", () => {
  const musashi = getWeapon("musashi_blade");
  const cat = getWeapon("katzbalger");
  assert.equal(musashi.attack, 40);
  assert.deepEqual(musashi.statBonuses, { str: 8 });
  assert.equal(musashi.defensePenetration, 0.4);
  assert.equal(musashi.twoHanded, true);
  assert.equal(cat.twoHanded, undefined);
  assert.ok(cat.attack > musashi.attack);
  assert.ok(cat.statBonuses.str > musashi.statBonuses.str);
  assert.equal(cat.statBonuses.maxHp, 100);

  const result = resolvePhysicalAttack({
    attacker: { str: 30, dex: 20, agi: 25, luc: 15 },
    defender: { def: 55, agi: 1, elementMultipliers: { physical: 1 } },
    attack: createNormalAttack({ weapon: musashi }),
    rng: () => 0.5
  });
  assert.equal(result.hits.length, 2);
  assert.ok(result.totalDamage >= 35, `expected practical B80 damage, got ${result.totalDamage}`);
});

test("The Five Star keeps five-hit identity below Katzendolch's final-region ceiling", () => {
  const relic = getWeapon("the_five_star");
  const cat = getWeapon("katzendolch");
  const attack = createNormalAttack({ weapon: relic });
  assert.equal(relic.attack, 18);
  assert.deepEqual(relic.statBonuses, { dex: 8, agi: 5, luc: 4 });
  assert.equal(relic.defensePenetration, 0.75);
  assert.equal(relic.criticalBonus, 0.1);
  assert.deepEqual([attack.hitCount, attack.powerPerHit], [5, 0.25]);
  assert.ok(cat.attack > relic.attack);
  assert.ok(cat.criticalBonus > relic.criticalBonus);
  assert.ok(cat.statBonuses.dex > relic.statBonuses.dex);
});

test("Sylvan Emera keeps its defensive identity and Katzenkolben remains the final hybrid", () => {
  const relic = getWeapon("sylvan_emera");
  const cat = getWeapon("katzenkolben");
  assert.equal(relic.attack, 28);
  assert.deepEqual(relic.statBonuses, {
    int: 8,
    luc: 8,
    maxSp: 60,
    healingMiracleMultiplier: 1.5,
    defenseMultiplier: 1.5
  });
  assert.equal(relic.twoHanded, true);
  assert.equal(cat.twoHanded, undefined);
  assert.ok(cat.attack > relic.attack);
  assert.ok(cat.statBonuses.maxSp > relic.statBonuses.maxSp);
  assert.ok(cat.normalAttackRecovery);
});

test("Comet Booster supports late magic while Katzenstab remains the general spellcasting apex", () => {
  const relic = getWeapon("comet_booster");
  const cat = getWeapon("katzenstab");
  assert.deepEqual(relic.statBonuses, { int: 14, maxSp: 80, attackSpellDamageBonus: 0.2 });
  assert.deepEqual(relic.grantedSkillIds, ["fall_the_meteor"]);
  assert.ok(cat.statBonuses.int > relic.statBonuses.int);
  assert.ok(cat.statBonuses.maxSp > relic.statBonuses.maxSp);
  assert.ok(cat.statBonuses.attackSpellDamageBonus > relic.statBonuses.attackSpellDamageBonus);
  assert.equal(cat.statBonuses.spCostMultiplier, 0.75);
  assert.equal(cat.attackSpellRecastChance, 0.3);
});
