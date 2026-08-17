import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { NPC_DEFINITIONS } from "../data/npc-definitions.js";
import { beginNpcRenewal, hireNpc, normalizeNpcSystem, recordNpcExpeditionDepth, registerNpc, resolveNpcRenewal } from "../data/npc-party.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { applyNpcAfterPlayerAttack, applyNpcGuardSupport, applyNpcTurnEnd, applyNpcTurnStart, getNpcSupportStatus, NPC_SUPPORT_BALANCE } from "../combat/npc-support.js";

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

test("registration is unique and hiring charges level times ten once", () => {
  let character = hero();
  const registered = registerNpc(character.npcSystem, "alec");
  assert.equal(registered.accepted, true);
  assert.equal(registerNpc(registered.system, "alec").accepted, false);
  character = { ...character, npcSystem: registered.system };
  const hired = hireNpc(character, "alec");
  assert.equal(hired.accepted, true);
  assert.equal(hired.fee, 400);
  assert.equal(hired.character.gold, 9600);
  assert.equal(hireNpc(hired.character, "alec").character.gold, 9600);
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
  assert.equal(NPC_SUPPORT_BALANCE.alec.attackRate, 0.55);
  assert.equal(NPC_SUPPORT_BALANCE.rebecca.hitRate * 2, 0.6);
  assert.equal(NPC_SUPPORT_BALANCE.johan.spellRate, 0.55);
  assert.equal(NPC_SUPPORT_BALANCE.erika.healRate, 0.06);
  assert.equal(NPC_SUPPORT_BALANCE.erika.healRate + NPC_SUPPORT_BALANCE.erika.healPerStage * 10, 0.1);

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
  applyNpcAfterPlayerAttack(battle);
  applyNpcGuardSupport(battle);
  applyNpcTurnEnd(battle);
  assert.equal(battle.enemy.hp, 966);
  assert.equal(battle.player.hp, 60);
  assert.equal(battle.player.statuses.find(status => status.id === "npc_alec_guard")?.physicalDamageReduction, 0.25);
});

test("status page three derives each active NPC display from current support balance", () => {
  const character = hero();
  character.npcSystem = normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika"],
    activeIds: ["alec", "rebecca", "erika"],
    records: {
      alec: { maxDepth: 40, growthStage: 4 },
      rebecca: { maxDepth: 40, growthStage: 4 },
      erika: { maxDepth: 40, growthStage: 4 }
    }
  });
  const alec = getNpcSupportStatus(character, "alec");
  const rebecca = getNpcSupportStatus(character, "rebecca");
  const erika = getNpcSupportStatus(character, "erika");
  assert.equal(alec.growth, "■■■■□□□□□□");
  assert.deepEqual(alec.rows, [["追撃威力", "11"], ["防御援護", "16％"], ["援護特性", "攻撃後に追撃／防御時に物理軽減"]]);
  assert.deepEqual(rebecca.rows, [["連撃威力", "4×2"], ["弱体成功", "20％"], ["弱体効果", "DEF－20％／2ターン"]]);
  assert.deepEqual(erika.rows, [["回復量", "最大HPの7.6％"], ["発動条件", "ターン終了時／HP減少中"]]);
  assert.equal(erika.maxDepth, 40);

  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const menuSource = readFileSync(new URL("../js/menu.js", import.meta.url), "utf8");
  assert.match(html, /data-status-page="2"[\s\S]*data-npc-status-list[\s\S]*data-status-indicator>1\/3/);
  assert.match(menuSource, /menu\.statusPage < 2[\s\S]*\$\{menu\.statusPage \+ 1\}\/3/);
});

test("NPC renewal hides background commands and restores its originating town screen", () => {
  const source = readFileSync(new URL("../js/town.js", import.meta.url), "utf8");
  assert.match(source, /npcManagementReturn = \{ mode: town\.mode, subFacilityId: town\.subFacilityId, selectedIndex: town\.selectedIndex \}/);
  assert.match(source, /town\.commandRoot\.hidden = true;[\s\S]*town\.commerceTitle\.textContent = "雇用更新"/);
  assert.match(source, /function closeNpcManagement\(\)[\s\S]*town\.commandRoot\.hidden = false;/);
  assert.match(source, /destination\?\.mode === "dungeonEntrance"[\s\S]*renderDungeonEntrance\(\)/);
  assert.match(source, /destination\?\.mode === "selection" \|\| destination\?\.mode === "arrival"[\s\S]*showTownArrival\(\)/);
});
