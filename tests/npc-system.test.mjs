import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { NPC_DEFINITIONS } from "../data/npc-definitions.js";
import { applyNpcExplorationPassives, beginNpcRenewal, getNpcHireFee, hireNpc, normalizeNpcSystem, recordNpcExpeditionDepth, registerNpc, resolveNpcRenewal } from "../data/npc-party.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import {
  advanceNpcChargeState,
  applyNpcAfterPlayerAttack,
  applyNpcBattleStart,
  applyNpcChargeSkills,
  applyNpcGuardSupport,
  applyNpcLethalProtection,
  applyNpcTurnEnd,
  applyNpcTurnStart,
  getNpcSupportStatus,
  NPC_CHARGE_SKILLS,
  NPC_SUPPORT_BALANCE
} from "../combat/npc-support.js";

function hero(job = "warrior") {
  return { ...createInitialCharacter({ name: "NPC TEST", job }), gold: 10000, level: 40 };
}

test("four initial NPC definitions use stable IDs, jobs and existing image paths", () => {
  assert.deepEqual(NPC_DEFINITIONS.map(npc => npc.id), ["alec", "rebecca", "erika", "johan"]);
  assert.equal(new Set(NPC_DEFINITIONS.map(npc => npc.job)).size, 4);
  assert.ok(NPC_DEFINITIONS.every(npc => npc.image.startsWith("images/npc/NPC_adventurer_")));
});

test("legacy saves normalize to an empty independent NPC system", () => {
  const character = normalizeCharacter({ ...hero(), npcSystem: undefined });
  assert.deepEqual(character.npcSystem.activeIds, []);
  assert.deepEqual(character.npcSystem.registeredIds, []);
});

test("NPC charge state is backward compatible, clamped and independently persisted", () => {
  const state = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca"],
    activeIds: ["alec", "rebecca"],
    records: { alec: { maxDepth: 40 }, rebecca: { maxDepth: 40, charge: 140, chargeCooldown: 9 } }
  });
  assert.deepEqual(
    { charge: state.records.alec.charge, cooldown: state.records.alec.chargeCooldown },
    { charge: 0, cooldown: 0 }
  );
  assert.deepEqual(
    { charge: state.records.rebecca.charge, cooldown: state.records.rebecca.chargeCooldown },
    { charge: 100, cooldown: 2 }
  );
});

test("stage six Erika and Johan passives recover one point every five successful steps", () => {
  let character = hero();
  character.hp = character.maxHp - 3;
  character.sp = character.maxSp - 3;
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["erika", "johan"], activeIds: ["erika", "johan"],
    records: { erika: { maxDepth: 60 }, johan: { maxDepth: 60 } }
  });
  for (let step = 0; step < 4; step += 1) character = applyNpcExplorationPassives(character);
  assert.deepEqual([character.hp, character.sp], [character.maxHp - 3, character.maxSp - 3]);
  character = applyNpcExplorationPassives(character);
  assert.deepEqual([character.hp, character.sp], [character.maxHp - 2, character.maxSp - 2]);
  assert.deepEqual(
    [character.npcSystem.records.erika.passiveStepCount, character.npcSystem.records.johan.passiveStepCount],
    [0, 0]
  );
});

test("exploration HP and SP passive recovery both have popup hooks", async () => {
  const source = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /showStepHpRecovery\(character\.hp - hpBeforePassives\)/);
  assert.match(source, /showStepSpRecovery\(character\.sp - spBeforePassives\)/);
  assert.match(source, /function showStepSpRecovery[\s\S]*?crystalStepSpDamage[\s\S]*?className = "is-healing"/);
});

test("stage five exploration NPCs do not receive stage six passives", () => {
  let character = hero();
  character.hp -= 3;
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["erika"], activeIds: ["erika"], records: { erika: { maxDepth: 50 } }
  });
  const hp = character.hp;
  for (let step = 0; step < 5; step += 1) character = applyNpcExplorationPassives(character);
  assert.equal(character.hp, hp);
});

test("Rebecca stage six charge skill checks assassination on every hit", () => {
  const character = hero();
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["rebecca"], activeIds: ["rebecca"], records: { rebecca: { maxDepth: 60, charge: 100 } }
  });
  const battle = createBattleState({
    character,
    enemy: { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 1, def: 0, agi: 1, alive: true, statuses: [] }
  });
  const rolls = [0.5, 0.5, 0.5, 0];
  applyNpcChargeSkills(battle, () => rolls.shift() ?? 0.5);
  const hits = battle.presentationEvents.filter(event => event.npcId === "rebecca" && event.type === "attackHit");
  assert.equal(hits.length, 4);
  assert.equal(hits[3].passiveExecutionId, "npc_assassination");
  assert.equal(battle.outcome, "victory");
});

test("registration is unique and hiring charges level times five at growth stage zero", () => {
  let character = hero();
  const registered = registerNpc(character.npcSystem, "alec");
  assert.equal(registered.accepted, true);
  assert.equal(registerNpc(registered.system, "alec").accepted, false);
  character = { ...character, npcSystem: registered.system };
  const hired = hireNpc(character, "alec");
  assert.equal(hired.accepted, true);
  assert.equal(hired.fee, 200);
  assert.equal(hired.character.gold, 9800);
  assert.equal(hireNpc(hired.character, "alec").character.gold, 9800);
});

test("NPC hiring fee scales with that NPC's growth stage through stage ten", () => {
  const character = hero();
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "erika"],
    records: { alec: { maxDepth: 40 }, erika: { maxDepth: 100 } }
  });
  assert.equal(getNpcHireFee(character, "alec"), 40 * 5 * 5);
  assert.equal(getNpcHireFee(character, "erika"), 40 * 5 * 11);
});

test("party normalization enforces three slots, unique NPCs and unique NPC jobs", () => {
  const state = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika", "johan"],
    activeIds: ["alec", "alec", "rebecca", "erika", "johan"],
    records: {}
  });
  assert.deepEqual(state.activeIds, ["alec", "rebecca", "erika"]);
});

test("expedition growth is confirmed on return and renewal preserves the roster", () => {
  let character = hero();
  let system = character.npcSystem;
  for (const id of ["alec", "erika"]) system = registerNpc(system, id).system;
  character = { ...character, npcSystem: system };
  character = hireNpc(character, "alec").character;
  character = hireNpc(character, "erika").character;
  character = recordNpcExpeditionDepth(character, 41);
  character = beginNpcRenewal(character, "return-1");
  assert.equal(character.npcSystem.records.alec.growthStage, 4);
  const continued = resolveNpcRenewal(character, "alec", true);
  assert.equal(continued.fee, 40 * 5 * 5);
  assert.equal(continued.continued, true);
  const dismissed = resolveNpcRenewal(continued.character, "erika", false);
  assert.deepEqual(dismissed.character.npcSystem.activeIds, ["alec"]);
  assert.deepEqual(dismissed.character.npcSystem.registeredIds, ["alec", "erika"]);
});

test("NPC-free battle remains unchanged and active supports create presentation events", () => {
  const enemy = { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 1, def: 0, agi: 1, alive: true, statuses: [] };
  const empty = resolveBattleRound({ battle: createBattleState({ character: hero(), enemy }), playerCommand: { type: "wait" }, rng: () => 0.99 });
  assert.equal(empty.battle.presentationEvents.some(event => event.npcId), false);

  const character = hero();
  character.npcSystem = normalizeNpcSystem({ registeredIds: ["rebecca", "erika", "johan"], activeIds: ["rebecca", "erika", "johan"], records: {} });
  character.hp = character.maxHp - 10;
  const supported = resolveBattleRound({ battle: createBattleState({ character, enemy }), playerCommand: { type: "wait" }, rng: () => 0.99 });
  assert.ok(supported.battle.presentationEvents.some(event => event.npcId === "rebecca"));
  assert.ok(supported.battle.presentationEvents.some(event => event.npcId === "johan"));
  assert.ok(supported.battle.presentationEvents.some(event => event.npcId === "erika"));
});

test("three NPC supports target roughly one and a half heroes of combined contribution", () => {
  assert.equal(NPC_SUPPORT_BALANCE.alec.attackRate, 0.8);
  assert.equal(NPC_SUPPORT_BALANCE.rebecca.hitRate * 2, 1);
  assert.equal(NPC_SUPPORT_BALANCE.johan.spellRate, 0.85);
  assert.equal(NPC_SUPPORT_BALANCE.erika.healRate, 0.08);
  assert.equal(NPC_SUPPORT_BALANCE.erika.healRate + NPC_SUPPORT_BALANCE.erika.healPerStage * 10, 0.14);

  const character = hero();
  character.hp = 50;
  character.maxHp = 100;
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika", "johan"],
    activeIds: ["alec", "rebecca", "erika"],
    records: {
      alec: { maxDepth: 100, growthStage: 10 },
      rebecca: { maxDepth: 100, growthStage: 10 },
      erika: { maxDepth: 100, growthStage: 10 }
    }
  });
  const battle = createBattleState({
    character,
    enemy: { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 1, def: 0, agi: 1, alive: true, statuses: [] }
  });
  applyNpcTurnStart(battle, () => 0.99);
  applyNpcAfterPlayerAttack(battle, () => 0.99);
  applyNpcGuardSupport(battle);
  applyNpcTurnEnd(battle);
  assert.equal(battle.enemy.hp, 923);
  assert.equal(battle.player.hp, 64);
  assert.equal(battle.player.statuses.find(status => status.id === "npc_alec_guard")?.physicalDamageReduction, 0.35);
});

test("NPC stages seven and eight upgrade support, charge attacks and Erika recovery", () => {
  const character = hero();
  character.maxHp = 200;
  character.hp = 80;
  character.statuses = [{ id: "deadly_poison", statusId: "deadly_poison", active: true }];
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika"], activeIds: ["alec", "rebecca", "erika"],
    records: {
      alec: { maxDepth: 80, charge: 100 }, rebecca: { maxDepth: 80, charge: 100 },
      erika: { maxDepth: 80, charge: 100 }
    }
  });
  const battle = createBattleState({ character,
    enemy: { id: "dummy", name: "DUMMY", hp: 2000, maxHp: 2000, attack: 1, def: 999, agi: 1, alive: true, statuses: [] } });
  applyNpcChargeSkills(battle, () => 0.99);
  assert.ok(battle.presentationEvents.some(event => event.actionName === "強撃・改" && event.damage === 66));
  assert.equal(battle.enemy.statuses.find(status => status.id === "npc_alec_defense_down")?.defenseMultiplier, 0.85);
  assert.equal(battle.presentationEvents.filter(event => event.actionName === "双連斬・改").length, 4);
  assert.equal(battle.player.hp, 140);
  assert.equal(battle.player.statuses.some(status => status.id === "deadly_poison"), false);

  const stage7 = hero();
  stage7.maxHp = 100;
  stage7.hp = 50;
  stage7.statuses = [{ id: "bleeding", statusId: "bleeding", active: true }];
  stage7.npcSystem = normalizeNpcSystem({ registeredIds: ["erika"], activeIds: ["erika"], records: { erika: { maxDepth: 70 } } });
  const prayer = createBattleState({ character: stage7,
    enemy: { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 1, def: 0, agi: 1, alive: true, statuses: [] } });
  applyNpcTurnEnd(prayer, () => 0);
  assert.equal(prayer.player.statuses.some(status => status.id === "bleeding"), false);
});

test("stage nine advanced passives damage instant-death-immune bosses and improve Goddess Breath", () => {
  const alec = hero();
  alec.npcSystem = normalizeNpcSystem({ registeredIds: ["alec"], activeIds: ["alec"], records: { alec: { maxDepth: 90 } } });
  const alecBattle = createBattleState({ character: alec,
    enemy: { id: "boss", name: "BOSS", isBoss: true, hp: 20000, maxHp: 20000, attack: 1, def: 0, agi: 1, alive: true, statuses: [] } });
  applyNpcAfterPlayerAttack(alecBattle, () => 0);
  assert.equal(alecBattle.presentationEvents.at(-1).damage, 52);
  assert.equal(alecBattle.presentationEvents.at(-1).passiveExecutionId, "npc_flash_slash_advanced");

  const rebecca = hero();
  rebecca.npcSystem = normalizeNpcSystem({ registeredIds: ["rebecca"], activeIds: ["rebecca"], records: { rebecca: { maxDepth: 90 } } });
  const rebeccaBattle = createBattleState({ character: rebecca,
    enemy: { id: "boss", name: "BOSS", isBoss: true, hp: 20000, maxHp: 20000, attack: 1, def: 0, agi: 1, alive: true, statuses: [] } });
  const rolls = [0, 0.99, 0.99];
  applyNpcTurnStart(rebeccaBattle, () => rolls.shift() ?? 0.99);
  assert.equal(rebeccaBattle.presentationEvents[0].damage, 517);
  assert.equal(rebeccaBattle.presentationEvents[0].passiveExecutionId, "npc_assassination_advanced");

  let erika = hero();
  erika.hp -= 5;
  erika.npcSystem = normalizeNpcSystem({ registeredIds: ["erika"], activeIds: ["erika"], records: { erika: { maxDepth: 90 } } });
  for (let step = 0; step < 5; step += 1) erika = applyNpcExplorationPassives(erika);
  assert.equal(erika.hp, erika.maxHp - 3);
});

test("stage ten capstones provide Vandervalke, Siegfried and Golden Wheat once per battle", () => {
  const rebecca = hero();
  rebecca.npcSystem = normalizeNpcSystem({ registeredIds: ["rebecca"], activeIds: ["rebecca"], records: { rebecca: { maxDepth: 100 } } });
  const enemies = [0, 1, 2].map(index => ({ id: `enemy_${index}`, name: `ENEMY ${index}`, hp: 100, maxHp: 100,
    attack: 1, def: 0, agi: 1, alive: true, statuses: [] }));
  const opening = createBattleState({ character: rebecca, enemy: enemies[0], enemies });
  applyNpcBattleStart(opening, () => 0.99);
  assert.deepEqual(opening.enemies.map(enemy => enemy.hp), [81, 81, 81]);
  assert.equal(opening.presentationEvents.filter(event => event.actionName === "ヴァンダーファルケ").length, 4);
  applyNpcBattleStart(opening, () => 0.99);
  assert.deepEqual(opening.enemies.map(enemy => enemy.hp), [81, 81, 81]);

  const alec = hero();
  alec.hp = 0;
  alec.alive = false;
  alec.npcSystem = normalizeNpcSystem({ registeredIds: ["alec"], activeIds: ["alec"], records: { alec: { maxDepth: 100 } } });
  const shield = createBattleState({ character: { ...alec, hp: 1, alive: true }, enemy: enemies[0] });
  shield.player.hp = 0;
  shield.player.alive = false;
  assert.equal(applyNpcLethalProtection(shield), true);
  assert.equal(shield.player.hp, 1);
  assert.ok(shield.presentationEvents.some(event => event.actionName === "ジークフリート" && event.type === "healing"));
  shield.player.hp = 0;
  assert.equal(applyNpcLethalProtection(shield), false);

  const lethalRound = createBattleState({ character: { ...alec, hp: 10, alive: true },
    enemy: { id: "lethal", name: "LETHAL", hp: 999, maxHp: 999, attack: 999, def: 0, agi: 999, alive: true, statuses: [] } });
  const protectedRound = resolveBattleRound({ battle: lethalRound, playerCommand: { type: "wait" }, rng: () => 0.5 }).battle;
  assert.equal(protectedRound.player.hp, 1);
  assert.equal(protectedRound.outcome, null);
  assert.equal(protectedRound.npcSiegfriedUsed, true);

  const erika = hero();
  erika.maxHp = 200;
  erika.hp = 40;
  erika.statuses = ["poison", "deadly_poison", "bleeding", "action_skip"].map(id => ({ id, statusId: id, active: true }));
  erika.npcSystem = normalizeNpcSystem({ registeredIds: ["erika"], activeIds: ["erika"], records: { erika: { maxDepth: 100 } } });
  const wheat = createBattleState({ character: erika, enemy: enemies[0] });
  applyNpcTurnEnd(wheat);
  assert.equal(wheat.player.hp, 200);
  assert.deepEqual(wheat.player.statuses, []);
  assert.equal(wheat.npcGoldenWheatUsed, true);
});

test("Johan stages seven through nine strengthen magic support, the wall and Mana Activation", () => {
  const character = hero("mage");
  character.maxHp = 100;
  character.hp = 100;
  character.npcSystem = normalizeNpcSystem({ registeredIds: ["johan"], activeIds: ["johan"],
    records: { johan: { maxDepth: 80, charge: 100 } } });
  const battle = createBattleState({ character,
    enemy: { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 200, def: 0, agi: 999,
      alive: true, statuses: [] } });
  const rolls = [0.5, 0];
  applyNpcChargeSkills(battle, () => 0.99);
  applyNpcTurnStart(battle, () => rolls.shift() ?? 0.99);
  assert.ok(battle.presentationEvents.some(event => event.skillName === "壁よ、拒め！"));
  assert.equal(battle.player.statuses.find(status => status.id === "npc_johan_wall")?.npcWallDamageThresholdRate, 0.2);
  assert.equal(battle.player.statuses.find(status => status.id === "npc_johan_wall")?.npcWallStrongDamageReduction, 0.2);
  assert.equal(battle.enemy.statuses.find(status => status.id === "npc_johan_magic_exposure")?.magicDamageTakenBonus, 0.15);

  const protectedRound = resolveBattleRound({ battle, playerCommand: { type: "wait" }, rng: () => 0.5 }).battle;
  assert.ok(protectedRound.presentationEvents.some(event => event.targetSide === "player" && event.reducedByNpcWall));

  let explorer = hero("mage");
  explorer.sp -= 5;
  explorer.npcSystem = normalizeNpcSystem({ registeredIds: ["johan"], activeIds: ["johan"], records: { johan: { maxDepth: 90 } } });
  for (let step = 0; step < 5; step += 1) explorer = applyNpcExplorationPassives(explorer);
  assert.equal(explorer.sp, explorer.maxSp - 3);
  assert.ok(getNpcSupportStatus(explorer, "johan").rows.some(row => row[1] === "マナ活性化・極（5歩ごとにSP2回復）"));
});

test("Der Zauberschild reduces a large hit before Siegfried and restores ten percent SP", () => {
  const character = hero("mage");
  character.maxHp = 100;
  character.hp = 100;
  character.maxSp = 100;
  character.sp = 0;
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "johan"], activeIds: ["alec", "johan"],
    records: { alec: { maxDepth: 100 }, johan: { maxDepth: 100 } }
  });
  const battle = createBattleState({ character,
    enemy: { id: "lethal", name: "LETHAL", hp: 9999, maxHp: 9999, attack: 999, def: 0, agi: 999,
      alive: true, statuses: [] } });
  const resolved = resolveBattleRound({ battle, playerCommand: { type: "wait" }, rng: () => 0.5 }).battle;
  assert.equal(resolved.npcZauberschildUsed, true);
  assert.equal(resolved.npcSiegfriedUsed, true);
  assert.equal(resolved.player.hp, 1);
  assert.equal(resolved.player.sp, 10);
  const shieldLog = resolved.log.findIndex(line => line.includes("デア・ツァウバーシルト"));
  const siegfriedLog = resolved.log.findIndex(line => line.includes("ジークフリート"));
  assert.ok(shieldLog >= 0 && siegfriedLog > shieldLog);
  assert.ok(getNpcSupportStatus(character, "johan").rows.some(row => row[1] === "デア・ツァウバーシルト"));
});

test("charge rates follow thief, priest, warrior, mage and cooldown skips one full turn", () => {
  assert.deepEqual(
    ["rebecca", "erika", "alec", "johan"].map(id => NPC_CHARGE_SKILLS[id].chargePerTurn),
    [25, 20, 16, 12]
  );
  const character = hero();
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec"], activeIds: ["alec"],
    records: { alec: { maxDepth: 40, charge: 100 } }
  });
  const battle = createBattleState({
    character,
    enemy: { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 1, def: 0, agi: 1, alive: true, statuses: [] }
  });
  applyNpcChargeSkills(battle);
  assert.equal(battle.player.npcSystem.records.alec.charge, 0);
  assert.equal(battle.player.npcSystem.records.alec.chargeCooldown, 2);
  advanceNpcChargeState(battle);
  assert.deepEqual(
    { charge: battle.player.npcSystem.records.alec.charge, cooldown: battle.player.npcSystem.records.alec.chargeCooldown },
    { charge: 0, cooldown: 1 }
  );
  advanceNpcChargeState(battle);
  assert.deepEqual(
    { charge: battle.player.npcSystem.records.alec.charge, cooldown: battle.player.npcSystem.records.alec.chargeCooldown },
    { charge: 0, cooldown: 0 }
  );
  advanceNpcChargeState(battle);
  assert.equal(battle.player.npcSystem.records.alec.charge, 16);
});

test("Alec and Rebecca charge skills use the intended physical hit profiles", () => {
  const enemy = { id: "dummy", name: "DUMMY", hp: 999, maxHp: 999, attack: 1, def: 999, agi: 1, alive: true, statuses: [] };
  for (const [npcId, expectedHits, expectedDamage] of [["alec", 1, 28], ["rebecca", 4, 9]]) {
    const character = hero();
    character.npcSystem = normalizeNpcSystem({
      registeredIds: [npcId], activeIds: [npcId], records: { [npcId]: { maxDepth: 40, charge: 100 } }
    });
    const battle = createBattleState({ character, enemy });
    applyNpcChargeSkills(battle);
    const cutIn = battle.presentationEvents.find(event => event.type === "npcChargeSkill");
    const hits = battle.presentationEvents.filter(event => event.type === "attackHit");
    assert.equal(cutIn?.quote, npcId === "alec" ? "強撃！" : "双連斬！");
    assert.equal(hits.length, expectedHits);
    assert.ok(hits.every(event => event.damage === expectedDamage));
  }
});

test("Erika charge skill executes normal undead, preserves EXP and only deals triple damage to undead bosses", () => {
  const createErikaBattle = isBoss => {
    const character = hero();
    character.npcSystem = normalizeNpcSystem({
      registeredIds: ["erika"], activeIds: ["erika"], records: { erika: { maxDepth: 40, charge: 100 } }
    });
    return createBattleState({
      character,
      enemy: { id: "undead", name: "UNDEAD", race: "undead", isBoss, hp: 500, maxHp: 500,
        attack: 1, def: 999, agi: 1, alive: true, statuses: [], experienceReward: 777 }
    });
  };
  const normal = createErikaBattle(false);
  applyNpcChargeSkills(normal);
  assert.equal(normal.outcome, "victory");
  assert.equal(normal.enemy.experienceReward, 777);
  const boss = createErikaBattle(true);
  applyNpcChargeSkills(boss);
  assert.equal(boss.enemy.hp, 410);
  assert.equal(boss.outcome, null);
});

test("Johan charge wall blocks low per-hit damage for three turns but lets strong hits through", () => {
  const character = hero();
  character.maxHp = 100;
  character.hp = 100;
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["johan"], activeIds: ["johan"], records: { johan: { maxDepth: 40, charge: 100 } }
  });
  const weakEnemy = { id: "weak", name: "WEAK", hp: 999, maxHp: 999, attack: 1, def: 0, agi: 1, alive: true, statuses: [] };
  const first = resolveBattleRound({ battle: createBattleState({ character, enemy: weakEnemy }), playerCommand: { type: "wait" }, rng: () => 0.5 });
  assert.equal(first.battle.player.hp, 100);
  assert.ok(first.battle.presentationEvents.some(event => event.blockedByNpcWall));
  assert.equal(first.battle.player.statuses.find(status => status.id === "npc_johan_wall")?.npcWallTurns, 2);

  const strongBattle = createBattleState({ character, enemy: { ...weakEnemy, attack: 200 } });
  applyNpcChargeSkills(strongBattle);
  const strong = resolveBattleRound({ battle: strongBattle, playerCommand: { type: "wait" }, rng: () => 0.5 });
  assert.ok(strong.battle.player.hp < 100);
});

test("status page three derives each active NPC display from current support balance", () => {
  const character = hero();
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika", "johan"],
    activeIds: ["alec", "rebecca", "erika"],
    records: {
      alec: { maxDepth: 40, growthStage: 4 },
      rebecca: { maxDepth: 40, growthStage: 4 },
      erika: { maxDepth: 40, growthStage: 4 },
      johan: { maxDepth: 40, growthStage: 4 }
    }
  });
  const alec = getNpcSupportStatus(character, "alec");
  const rebecca = getNpcSupportStatus(character, "rebecca");
  const erika = getNpcSupportStatus(character, "erika");
  const johan = getNpcSupportStatus(character, "johan");
  assert.equal(alec.growth, "■■■■□□□□□□");
  assert.deepEqual(alec.rows, [["追撃威力", "19"], ["防御援護", "23％"], ["援護特性", "攻撃後に追撃／防御時に物理軽減"]]);
  assert.deepEqual(rebecca.rows, [["連撃威力", "10×2"], ["弱体成功", "25％"], ["弱体効果", "DEF－25％／2ターン"]]);
  assert.deepEqual(erika.rows, [["回復量", "最大HPの10.4％"], ["発動条件", "ターン終了時／HP減少中"]]);
  assert.deepEqual(johan.rows, [["呪文威力", "約20～24"], ["属性", "無属性"], ["発動条件", "ターン開始時"]]);
  assert.equal(erika.maxDepth, 40);

  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika", "johan"],
    activeIds: ["alec", "rebecca", "erika"],
    records: {
      alec: { maxDepth: 60 }, rebecca: { maxDepth: 60 },
      erika: { maxDepth: 60 }, johan: { maxDepth: 60 }
    }
  });
  assert.deepEqual(
    ["alec", "rebecca", "erika", "johan"].map(id => getNpcSupportStatus(character, id).rows.at(-1)),
    [["パッシブ", "一閃（追撃時8％で一撃死）"], ["パッシブ", "暗殺術（連撃時各Hit4％で一撃死）"],
      ["パッシブ", "女神の息吹（5歩ごとにHP1回復）"], ["パッシブ", "マナ活性化（5歩ごとにSP1回復）"]]
  );

  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika", "johan"], activeIds: ["alec", "rebecca", "erika"],
    records: { alec: { maxDepth: 90 }, rebecca: { maxDepth: 90 }, erika: { maxDepth: 90 }, johan: { maxDepth: 90 } }
  });
  assert.deepEqual(
    ["alec", "rebecca", "erika", "johan"].map(id => getNpcSupportStatus(character, id).rows.find(row => row[0] === "パッシブ")?.[1]),
    ["一閃・極（一撃死無効時に追撃威力1.5倍）", "暗殺術・極（一撃死無効時に現HP5％ダメージ／ボス上限500）",
      "女神の息吹・極（5歩ごとにHP2回復）", "マナ活性化・極（5歩ごとにSP2回復）"]
  );

  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika"], activeIds: ["alec", "rebecca", "erika"],
    records: { alec: { maxDepth: 100 }, rebecca: { maxDepth: 100 }, erika: { maxDepth: 100 } }
  });
  assert.ok(getNpcSupportStatus(character, "alec").rows.some(row => row[1] === "ジークフリート"));
  assert.ok(getNpcSupportStatus(character, "rebecca").rows.some(row => row[1] === "ヴァンダーファルケ"));
  assert.ok(getNpcSupportStatus(character, "erika").rows.some(row => row[1] === "黄金の稲穂"));

  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const menuSource = readFileSync(new URL("../js/menu.js", import.meta.url), "utf8");
  const menuCss = readFileSync(new URL("../css/game-menu.css", import.meta.url), "utf8");
  assert.match(html, /data-status-page="2"[\s\S]*data-npc-status-list[\s\S]*data-status-indicator>1\/3/);
  assert.match(menuSource, /menu\.statusPage < 2[\s\S]*\$\{menu\.statusPage \+ 1\}\/3/);
  assert.match(menuCss, /\.nde-stat-row output\{font-size:14px\}/);
});

test("NPC renewal hides background commands and restores its originating town screen", () => {
  const source = readFileSync(new URL("../js/town.js", import.meta.url), "utf8");
  assert.match(source, /npcManagementReturn = \{ mode: town\.mode, subFacilityId: town\.subFacilityId, selectedIndex: town\.selectedIndex \}/);
  assert.match(source, /town\.commandRoot\.hidden = true;[\s\S]*town\.commerceTitle\.textContent = "雇用更新"/);
  assert.match(source, /function closeNpcManagement\(\)[\s\S]*town\.commandRoot\.hidden = false;/);
  assert.match(source, /destination\?\.mode === "dungeonEntrance"[\s\S]*renderDungeonEntrance\(\)/);
  assert.match(source, /destination\?\.mode === "selection" \|\| destination\?\.mode === "arrival"[\s\S]*showTownArrival\(\)/);
});
