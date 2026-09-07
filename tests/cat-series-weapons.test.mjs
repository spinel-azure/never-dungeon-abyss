import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import {
  CAT_GOLD_CHEST_WEAPONS_BY_JOB,
  getGoldChestWeaponId,
  hasGoldChestWeapon,
  isGoldChestWeaponEligible,
  rollBlackChestLoot,
  rollGoldChestLoot
} from "../data/loot.js";
import { getWeapon } from "../data/weapons.js";
import {
  equipInstance,
  getEquipmentInstanceDefinition,
  grantEquipmentInstance
} from "../data/equipment-inventory.js";
import { addLootEquipment, settleLootBag } from "../data/inventory.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { collectStats } from "../combat/collect-stats.js";
import { createNormalAttack, createSkillAttack } from "../combat/create-attack.js";
import { resolvePhysicalAttack } from "../combat/resolve-physical-attack.js";
import { resolveHealing } from "../combat/resolve-healing.js";
import { getSkill } from "../data/skills.js";
import { getEffectiveSpCost } from "../combat/sp-cost.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { getLotEquipmentHighlightClass } from "../js/loot-identification.js";

function equipWeapon(job, equipmentId, level = 100) {
  let character = createInitialCharacter({ name: job.toUpperCase(), job });
  character.level = level;
  character = normalizeCharacter(character);
  const granted = grantEquipmentInstance(character, equipmentId, "rightArmId", { enhancement: 3 });
  assert.equal(granted.accepted, true);
  const equipped = equipInstance(granted.character, "rightArmId", granted.instance.instanceId);
  assert.equal(equipped.accepted, true);
  character = normalizeCharacter(equipped.character);
  character.hp = character.maxHp;
  character.sp = character.maxSp;
  return character;
}

function dummyEnemy(hp = 99999) {
  return {
    id: "cat_weapon_dummy", name: "DUMMY", hp, maxHp: hp, sp: 0, maxSp: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    def: 20, attack: 1, statuses: [], alive: true,
    actions: [{ weight: 1, action: {
      id: "dummy_wait", name: "待機", actionType: "wait", speedModifier: -99,
      waitMessage: "DUMMYは待機している。"
    } }]
  };
}

function playerAttackEvents(battle) {
  return battle.presentationEvents.filter(event =>
    event.type === "attackHit" && event.actorSide === "player" && event.targetSide === "enemy"
  );
}

test("B90F cat gold chests map every job to one unique unenhanced weapon", () => {
  for (const [job, equipmentId] of Object.entries(CAT_GOLD_CHEST_WEAPONS_BY_JOB)) {
    const character = createInitialCharacter({ name: "TEST", job });
    assert.equal(getGoldChestWeaponId(job, 90), equipmentId);
    assert.deepEqual(rollGoldChestLoot(character, 90), {
      kind: "equipment", equipmentId, slot: "rightArmId", enhancement: 0,
      unidentifiedName: equipmentId === "katzenstab" ? "？両手杖" : "？武器"
    });
  }
  assert.equal(getGoldChestWeaponId("warrior", 89), null);
  assert.equal(getGoldChestWeaponId("warrior", 99), null);
  assert.equal(getGoldChestWeaponId("warrior", 50), "musashi_blade");
});

test("B90F to B98F use the five-percent boundary without affecting B50F gold chests", () => {
  for (const depth of [90, 94, 98]) {
    buildBoundaryWallMap(depth, () => 0.049999999, { blackChestsUnlocked: true, goldWeaponEligible: true });
    assert.equal(cells.flat().filter(cell => cell.treasure === "gold").length, 1, `B${depth}F below boundary`);
    assert.equal(cells.flat().some(cell => cell.treasure === "black"), false);
    buildBoundaryWallMap(depth, () => 0.05, { blackChestsUnlocked: true, goldWeaponEligible: true });
    assert.equal(cells.flat().filter(cell => cell.treasure === "black").length, 1, `B${depth}F boundary`);
    assert.equal(cells.flat().some(cell => cell.treasure === "gold"), false);
  }
  for (const depth of [89, 99]) {
    buildBoundaryWallMap(depth, () => 0, { blackChestsUnlocked: true, goldWeaponEligible: true });
    assert.equal(cells.flat().some(cell => cell.treasure === "gold" && !cell.eventTreasureId), false);
    assert.equal(cells.flat().some(cell => cell.treasure === "black"), false);
  }
  buildBoundaryWallMap(90, () => 0, { blackChestsUnlocked: false, goldWeaponEligible: true });
  assert.equal(cells.flat().some(cell => ["black", "gold"].includes(cell.treasure)), false);
  buildBoundaryWallMap(50, () => 0.009999, { blackChestsUnlocked: true, goldWeaponEligible: true });
  assert.equal(cells.flat().filter(cell => cell.treasure === "gold").length, 1);
  buildBoundaryWallMap(50, () => 0.01, { blackChestsUnlocked: true, goldWeaponEligible: true });
  assert.equal(cells.flat().filter(cell => cell.treasure === "black").length, 1);
});

test("cat weapons are detected in equipment, inventory, warehouse, and the loot bag", () => {
  for (const location of ["equipment", "equipmentInventory", "warehouse", "lootBag"]) {
    const character = createInitialCharacter({ name: "TEST", job: "mage" });
    const instance = { equipmentId: "katzenstab", slot: "rightArmId", enhancement: 0 };
    if (location === "equipment") character.equipment.rightArmId = "katzenstab";
    if (location === "equipmentInventory") character.equipmentInventory.instances.push(instance);
    if (location === "warehouse") character.warehouse.equipmentInstances.push(instance);
    if (location === "lootBag") character.lootBag.equipmentInstances.push(instance);
    assert.equal(hasGoldChestWeapon(character, 90), true, location);
    assert.equal(isGoldChestWeaponEligible(character, 90), false, location);
    assert.equal(rollGoldChestLoot(character, 90).reason, "alreadyOwned", location);
  }
});

test("cat weapons remain unique and unenhanced through loot settlement and save normalization", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.lootBag = addLootEquipment(character.lootBag, {
    equipmentId: "katzbalger", slot: "rightArmId", enhancement: 3
  }).lootBag;
  character = settleLootBag(character).character;
  const instance = character.equipmentInventory.instances.find(entry => entry.equipmentId === "katzbalger");
  assert.equal(instance.enhancement, 0);
  assert.equal(getEquipmentInstanceDefinition(instance).sellPrice, 0);
  assert.equal(getLotEquipmentHighlightClass(instance, getEquipmentInstanceDefinition(instance)), "is-special-unique");
  assert.equal(grantEquipmentInstance(character, "katzbalger", "rightArmId").reason, "alreadyOwned");
  const loaded = normalizeCharacter(structuredClone(character));
  assert.equal(loaded.equipmentInventory.instances.filter(entry => entry.equipmentId === "katzbalger").length, 1);
});

test("cat weapon bonuses and active effects disappear when the weapon is unequipped", () => {
  const mage = equipWeapon("mage", "katzenstab");
  const removedMage = normalizeCharacter(equipInstance(mage, "rightArmId", null).character);
  assert.equal(removedMage.equipment.rightArmId, null);
  assert.equal(removedMage.maxSp, mage.maxSp - 150);
  assert.equal(collectStats(removedMage).attackSpellDamageBonus, 0);
  assert.equal(getEffectiveSpCost({ spCost: 5, category: "attackSpell" }, removedMage), 5);
  const mageAttack = resolveBattleRound({
    battle: createBattleState({ character: removedMage, enemy: dummyEnemy() }),
    playerCommand: { type: "skill", skillId: "fireball" }, rng: () => 0
  }).battle;
  assert.equal(playerAttackEvents(mageAttack).length, 1);

  const warrior = equipWeapon("warrior", "katzbalger");
  const removedWarrior = normalizeCharacter(equipInstance(warrior, "rightArmId", null).character);
  removedWarrior.hp = Math.floor(removedWarrior.maxHp * 0.5);
  const warriorAttack = resolveBattleRound({
    battle: createBattleState({ character: removedWarrior, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(playerAttackEvents(warriorAttack).length, 1);

  const priest = equipWeapon("priest", "katzenkolben");
  const removedPriest = normalizeCharacter(equipInstance(priest, "rightArmId", null).character);
  removedPriest.hp = removedPriest.maxHp - 50;
  removedPriest.sp = removedPriest.maxSp - 20;
  const priestAttack = resolveBattleRound({
    battle: createBattleState({ character: removedPriest, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(priestAttack.player.hp, removedPriest.hp);
  assert.equal(priestAttack.player.sp, removedPriest.sp);
});

test("B90F ordinary black chests retain the existing generic fallback", () => {
  const gold = rollBlackChestLoot(() => 0, 90, "warrior");
  const potion = rollBlackChestLoot(() => 0.5, 90, "warrior");
  const stiletto = rollBlackChestLoot(() => 0.99, 90, "warrior");
  assert.deepEqual(gold, { kind: "gold", amount: 180 });
  assert.deepEqual(potion, { kind: "item", itemId: "healing_potion_large", amount: 1, unidentifiedName: "？薬" });
  assert.equal(stiletto.equipmentId, "stiletto");
});

test("Katzbalger is a one-handed DEF-piercing HP weapon and repeats only low-HP normal attacks", () => {
  const weapon = getWeapon("katzbalger");
  assert.deepEqual([weapon.attack, weapon.statBonuses.str, weapon.statBonuses.maxHp, weapon.defensePenetration], [42, 10, 100, 0.4]);
  assert.notEqual(weapon.twoHanded, true);
  let character = equipWeapon("warrior", weapon.id);
  assert.ok(character.equipment.leftArmId);

  const high = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(playerAttackEvents(high).length, 1);

  character.hp = Math.floor(character.maxHp * 0.5);
  const half = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(playerAttackEvents(half).length, 2);
  assert.match(half.log.join("\n"), /猛猫の追撃/);

  character.cards.deckSlots[0] = "zodiac_aries";
  const withAries = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  const ariesHits = playerAttackEvents(withAries);
  assert.equal(ariesHits.length, 2);
  assert.ok(ariesHits[0].damage > ariesHits[1].damage);
  assert.equal(ariesHits[1].damage, playerAttackEvents(half)[1].damage,
    "one-use Aries bonuses do not leak into the cat follow-up");
  character.cards.deckSlots[0] = null;

  const passiveImmuneEnemy = { ...dummyEnemy(), isBoss: true };
  const independentRolls = [
    0.5, 0.5, 0.5, 0.5, 0.5,
    0, 0, 0.5,
    0, 0.999999, 0.5
  ];
  let independentIndex = 0;
  const independent = resolveBattleRound({
    battle: createBattleState({ character, enemy: passiveImmuneEnemy }),
    playerCommand: { type: "attack" },
    rng: () => independentRolls[independentIndex++] ?? 0.5
  }).battle;
  assert.deepEqual(playerAttackEvents(independent).map(event => [event.hit, event.critical]),
    [[true, true], [true, false]], "the second attack rolls hit and critical independently");

  character.skillIds = [...new Set([...character.skillIds, "power_strike"])];
  const skill = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "skill", skillId: "power_strike" }, rng: () => 0.5
  }).battle;
  assert.equal(playerAttackEvents(skill).length, 1);

  const killed = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy(1) }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(playerAttackEvents(killed).length, 1);
  assert.equal(killed.outcome, "victory");
});

test("Katzendolch performs four independent half-power hits with capped critical and penetration", () => {
  const weapon = getWeapon("katzendolch");
  const attack = createNormalAttack({ weapon });
  assert.deepEqual([weapon.attack, attack.hitCount, attack.powerPerHit, attack.defensePenetration, attack.criticalBonus], [24, 4, 0.5, 0.75, 0.2]);
  const resolved = resolvePhysicalAttack({
    attacker: { str: 30, dex: 30, criticalBonus: 1, hitBonus: 1 },
    defender: { agi: 30, def: 100 }, attack,
    rng: () => 0
  });
  assert.equal(resolved.hits.length, 4);
  assert.equal(resolved.hits.every(hit => hit.hit && hit.critical), true);
  assert.equal(resolved.criticalRate, 0.4);
  assert.equal(resolved.defensePenetration, 0.75);
  const variedRolls = [0, 0, 0.5, 0.999999, 0, 0.999999, 0.5, 0, 0, 0.5];
  let variedIndex = 0;
  const varied = resolvePhysicalAttack({
    attacker: { str: 30, dex: 30, hitBonus: 0 },
    defender: { agi: 30, def: 100 }, attack,
    rng: () => variedRolls[variedIndex++] ?? 0.5
  });
  assert.deepEqual(varied.hits.map(hit => [hit.hit, hit.critical]),
    [[true, true], [false, false], [true, false], [true, true]]);
  const equippedStats = collectStats({
    ...equipWeapon("thief", weapon.id),
    baseStats: { str: 30, int: 30, agi: 30, dex: 30, luc: 30 }
  });
  assert.deepEqual([equippedStats.dex, equippedStats.agi, equippedStats.luc], [30, 30, 30]);
  assert.equal(createSkillAttack(getSkill("art_sealing_stab"), { weapon }).hitCount, 1);
  assert.equal(createSkillAttack(getSkill("quick_strike"), { weapon }).hitCount, 4);
});

test("Katzenkolben is one-handed, boosts miracles, and heals once after a landed normal command", () => {
  let character = equipWeapon("priest", "katzenkolben");
  const weapon = getWeapon("katzenkolben");
  assert.deepEqual([weapon.attack, weapon.statBonuses.int, weapon.statBonuses.luc, weapon.statBonuses.maxSp], [32, 10, 10, 100]);
  assert.notEqual(weapon.twoHanded, true);
  assert.ok(character.equipment.leftArmId);
  const stats = collectStats(character);
  assert.equal(stats.healingMiracleMultiplier, 1.5);
  assert.equal(resolveHealing({ caster: stats, target: character, healing: getSkill("healing_prayer") }).calculatedHealing,
    Math.floor((10 + stats.int) * 1.5));

  character.hp = character.maxHp - 100;
  character.sp = character.maxSp - 20;
  const resolved = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(resolved.player.hp, character.hp + Math.ceil(character.maxHp * 0.1));
  assert.equal(resolved.player.sp, character.sp + 10);
  assert.equal(resolved.presentationEvents.filter(event => event.type === "healing" && event.actorSide === "player").length, 1);
  assert.equal(resolved.presentationEvents.filter(event => event.type === "spHealing" && event.actorSide === "player").length, 1);

  const cappedCharacter = { ...character, hp: character.maxHp - 1, sp: character.maxSp - 1 };
  const capped = resolveBattleRound({
    battle: createBattleState({ character: cappedCharacter, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(capped.player.hp, character.maxHp);
  assert.equal(capped.player.sp, character.maxSp);

  const finishing = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy(1) }),
    playerCommand: { type: "attack" }, rng: () => 0.5
  }).battle;
  assert.equal(finishing.outcome, "victory");
  assert.ok(finishing.player.hp > character.hp);
  assert.ok(finishing.player.sp > character.sp);

  const missed = resolveBattleRound({
    battle: createBattleState({ character: { ...character, hitBonus: -100 }, enemy: dummyEnemy() }),
    playerCommand: { type: "attack" }, rng: () => 0.999999
  }).battle;
  assert.equal(missed.player.hp, character.hp);
  assert.equal(missed.player.sp, character.sp);

  const skill = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "skill", skillId: "holy_strike" }, rng: () => 0
  }).battle;
  assert.equal(skill.player.hp, character.hp);
  assert.equal(skill.player.sp, character.sp - getEffectiveSpCost(getSkill("holy_strike"), character));
});

test("Katzenstab applies spell power and multiplicative-before-fixed SP reduction in field and battle paths", () => {
  const character = equipWeapon("mage", "katzenstab");
  const weapon = getWeapon("katzenstab");
  assert.deepEqual([weapon.attack, weapon.statBonuses.int, weapon.statBonuses.maxSp, weapon.statBonuses.attackSpellDamageBonus], [1, 15, 150, 0.35]);
  assert.equal(weapon.twoHanded, true);
  assert.equal(character.equipment.leftArmId, null);
  assert.equal(collectStats(character).attackSpellDamageBonus, 0.35);
  const skill = { spCost: 5, category: "attackSpell" };
  assert.equal(getEffectiveSpCost(skill, character), 4);
  assert.equal(getEffectiveSpCost(skill, { ...character, cardStatBonuses: { ...character.cardStatBonuses, spCostReduction: 1 } }), 3);
  assert.equal(getEffectiveSpCost({ ...skill, ignoreSpCostReduction: true }, character), 5);
  const action = resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "skill", skillId: "fireball" }, rng: () => 0.3
  }).battle;
  assert.equal(character.sp - action.player.sp, getEffectiveSpCost(getSkill("fireball"), character));
});

test("Cat Whim recasts below thirty percent, stops at the boundary, and never charges extra SP", () => {
  const character = equipWeapon("mage", "katzenstab");
  const cast = roll => resolveBattleRound({
    battle: createBattleState({ character, enemy: dummyEnemy() }),
    playerCommand: { type: "skill", skillId: "fireball" }, rng: () => roll
  }).battle;
  const recast = cast(0);
  assert.equal(playerAttackEvents(recast).length, 2);
  assert.equal(character.sp - recast.player.sp, getEffectiveSpCost(getSkill("fireball"), character));
  assert.match(recast.log.join("\n"), /猫の気まぐれでもう一度詠唱/);
  const boundary = cast(0.3);
  assert.equal(playerAttackEvents(boundary).length, 1);
  assert.doesNotMatch(boundary.log.join("\n"), /猫の気まぐれ/);
});

test("Gemini duplicates first target attacks before Cat Whim without recursive copies", () => {
  const character = equipWeapon("mage", "katzenstab");
  character.cards.deckSlots[0] = "zodiac_gemini";
  const battle = createBattleState({ character, enemy: dummyEnemy() });
  const first = resolveBattleRound({
    battle, playerCommand: { type: "skill", skillId: "fireball" }, rng: () => 0
  }).battle;
  assert.equal(playerAttackEvents(first).length, 3);
  assert.equal(first.geminiDuplicationAvailable, false);
  assert.equal(character.sp - first.player.sp, getEffectiveSpCost(getSkill("fireball"), character));
  assert.ok(first.log.indexOf("ジェミニが行動を複製した！") < first.log.indexOf("猫の気まぐれでもう一度詠唱した！"));

  const second = resolveBattleRound({
    battle: first, playerCommand: { type: "skill", skillId: "fireball" }, rng: () => 0.3
  }).battle;
  assert.equal(playerAttackEvents(second).length, 1);
  assert.equal(second.geminiDuplicationAvailable, false);
});

test("Cat Whim excludes support, healing, charge, and ultimate actions", () => {
  const character = equipWeapon("mage", "katzenstab");
  character.playerCharge.value = 100;
  for (const [skillId, expectedHits] of [["magic_wall", 0], ["tunguska", 1]]) {
    const battle = resolveBattleRound({
      battle: createBattleState({ character, enemy: dummyEnemy() }),
      playerCommand: { type: "skill", skillId }, rng: () => 0
    }).battle;
    assert.equal(playerAttackEvents(battle).length, expectedHits);
    assert.doesNotMatch(battle.log.join("\n"), /猫の気まぐれ/);
  }

  const apocalypse = resolveBattleRound({
    battle: createBattleState({ character, enemies: [dummyEnemy(), dummyEnemy()] }),
    playerCommand: { type: "skill", skillId: "apocalypse" }, rng: () => 0
  }).battle;
  assert.equal(playerAttackEvents(apocalypse).length, 2);
  assert.doesNotMatch(apocalypse.log.join("\n"), /猫の気まぐれ/);
});

test("Cat Whim repeats all-target attack spells against only living enemies and stops after a wipe", () => {
  const character = equipWeapon("mage", "katzenstab");
  const surviving = resolveBattleRound({
    battle: createBattleState({ character, enemies: [dummyEnemy(), dummyEnemy()] }),
    playerCommand: { type: "skill", skillId: "flame_sweep" }, rng: () => 0
  }).battle;
  assert.equal(playerAttackEvents(surviving).length, 4);
  assert.deepEqual(playerAttackEvents(surviving).map(event => event.targetIndex), [0, 1, 0, 1]);

  const wiped = resolveBattleRound({
    battle: createBattleState({ character, enemies: [dummyEnemy(1), dummyEnemy(1)] }),
    playerCommand: { type: "skill", skillId: "flame_sweep" }, rng: () => 0
  }).battle;
  assert.equal(playerAttackEvents(wiped).length, 2);
  assert.equal(wiped.outcome, "victory");
  assert.doesNotMatch(wiped.log.join("\n"), /猫の気まぐれ/);
});
