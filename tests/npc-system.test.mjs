import assert from "node:assert/strict";
import test from "node:test";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { NPC_DEFINITIONS } from "../data/npc-definitions.js";
import { beginNpcRenewal, hireNpc, normalizeNpcSystem, recordNpcExpeditionDepth, registerNpc, resolveNpcRenewal } from "../data/npc-party.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";

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
