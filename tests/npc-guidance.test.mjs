import test from "node:test";
import assert from "node:assert/strict";

import {
  MIKAN_GENERIC_NPC_IDS,
  getMikanGenericNpcId,
  getMikanRegionalNpcId,
  getNpcById,
  getNpcEncounter
} from "../data/npcs.js";
import { MAIKAEFER_ENCOUNTER_RATE } from "../data/enemies.js";
import { MAIKAEFER_NEST_RATE } from "../data/special-rooms.js";
import { buildBoundaryWallMap, cells, randomizeStartPosition } from "../js/dungeon.js";
import { loadGame, writeGame } from "../js/save-data.js";

function placedNpcId() {
  return cells.flat().find(cell => cell.npc)?.npc || null;
}

test("generic Mikan candidates contain the existing line and all four new lines", () => {
  const expectedDialogues = [
    "素数は孤独な数字にゃん…。でも1だけは寄り添ってくれるにゃん。",
    "たいまつが消えると、何も見えないにゃん。襲われても誰だか分からないにゃあ…！怖いにゃ、怖いにゃあ…！",
    "紫の箱には、カードが入っているみたいにゃん。みんなカードを集めるのが好きにゃあ…。",
    "誰にも会いたくない時は、護符を使うといいにゃあ。寺院でお布施すると、もらえるにゃん。",
    "とっても逃げ足の速い虫がいるにゃん。石でもぶつけてみるといいかもにゃあ…？もしかしたら、当たるかもしれにゃいにゃん。"
  ];
  assert.equal(MIKAN_GENERIC_NPC_IDS.length, 5);
  assert.deepEqual(MIKAN_GENERIC_NPC_IDS.map(id => getNpcEncounter(getNpcById(id), 0).dialogue[0]), expectedDialogues);
  assert.deepEqual([0.01, 0.21, 0.41, 0.61, 0.81].map(getMikanGenericNpcId), MIKAN_GENERIC_NPC_IDS);
  for (const [index, id] of MIKAN_GENERIC_NPC_IDS.entries()) {
    buildBoundaryWallMap(1, () => index / 5 + 0.01, {});
    assert.equal(placedNpcId(), id);
    const npc = getNpcById(id);
    assert.equal(getNpcEncounter(npc, 99), getNpcEncounter(npc, 0));
    assert.equal(getNpcEncounter(npc, 0).leaveAfterTalk, true);
  }
});

test("B4F Mikan Nyanko warns the player away from the superboss room", () => {
  const npc = getNpcById("NPC_01_b4");
  const encounter = getNpcEncounter(npc, 0);
  assert.deepEqual(encounter.dialogue, [
    "怖いにゃ…。この階にはとても恐ろしい何かの気配を感じるにゃ…。近づいちゃダメにゃあ…！"
  ]);
  assert.equal(encounter.leaveAfterTalk, true);
  randomizeStartPosition();
  buildBoundaryWallMap(4, () => .5, {});
  assert.equal(cells.flat().filter(cell => cell.npc === npc.id).length, 1);
  buildBoundaryWallMap(4, () => .5, { bossDefeatedById: { otherworldly_wisdom_b4f: true } });
  assert.equal(cells.flat().filter(cell => cell.npc === getMikanGenericNpcId(.5)).length, 1);
});

test("B2F and both B6F states keep their existing Mikan guidance", () => {
  const expectations = [
    [2, {}, "NPC_01_b2", "この階にはお化けが出る部屋があるらしいにゃ。しかも、何度も何度も出るらしいにゃん。怖いにゃあ…。"],
    [6, {}, "NPC_01_b6", "血が出たら痛いにゃん。とても痛いにゃん。いざという時のために、止血剤があるといいかもにゃあ…。"],
    [6, { bossDefeatedById: { quest_mimic_b6f: true } }, "NPC_01_b6_after", "不思議な剣を拾ったみたいにゃん？むかーし、おとぎ話で聞いた事ある気がするにゃん。…でも、忘れちゃったにゃあ…。"]
  ];
  for (const [depth, progress, npcId, dialogue] of expectations) {
    buildBoundaryWallMap(depth, () => .5, progress);
    assert.equal(placedNpcId(), npcId);
    assert.deepEqual(getNpcEncounter(getNpcById(npcId), 0).dialogue, [dialogue]);
  }
});

test("B5F Mikan Nyanko guides the player to the fountain", () => {
  const npc = getNpcById("NPC_01_b5");
  const encounter = getNpcEncounter(npc, 0);
  assert.deepEqual(encounter.dialogue, [
    "疲れてないかにゃ？噴水のある場所でひと休みするといいにゃん。"
  ]);
  assert.equal(encounter.leaveAfterTalk, true);
  randomizeStartPosition();
  buildBoundaryWallMap(5, () => .5, {});
  assert.equal(cells.flat().filter(cell => cell.npc === npc.id).length, 1);
});

test("B9F Mikan Nyanko guides the player to the red-door key", () => {
  const npc = getNpcById("NPC_01_b9");
  const encounter = getNpcEncounter(npc, 0);
  assert.deepEqual(encounter.dialogue, [
    "赤い扉が気になるにゃ？カギが必要みたいにゃん。",
    "この階のどこかにあるかもしれないにゃあ…？"
  ]);
  assert.equal(encounter.leaveAfterTalk, true);
  randomizeStartPosition();
  buildBoundaryWallMap(9, () => .5, {});
  assert.equal(cells.flat().filter(cell => cell.npc === npc.id).length, 1);
});

test("Mikan Nyanko gives floor-specific guidance throughout the desert region", () => {
  const expectations = [
    [60, "NPC_01_b60_desert", "砂に足を取られると、どこかに流されるにゃあ…！何度も何度も、流されるにゃあ…！"],
    [64, "NPC_01_b64_todes", "怖いにゃ…。ここ、なにか恐ろしいものがいるにゃあ…。近寄っちゃダメにゃ…。"],
    [65, "NPC_01_b65_oasis", "オアシスでお昼寝したいのに、消えちゃうにゃん。どうなっているにゃあ…？"],
    [66, "NPC_01_desert_hot", "暑いにゃあ…。暑いにゃあ…。涼しい所に行きたいにゃん…。"],
    [68, "NPC_01_desert_hot", "暑いにゃあ…。暑いにゃあ…。涼しい所に行きたいにゃん…。"],
    [69, "NPC_01_b69_riddle", "なくしたものをみっけ…みつけるのが得意…にゃあ？よく、分からないにゃん…。"]
  ];
  for (const [depth, npcId, dialogue] of expectations) {
    const npc = getNpcById(npcId);
    assert.deepEqual(getNpcEncounter(npc, 0).dialogue, [dialogue]);
    buildBoundaryWallMap(depth, () => .5, {});
    assert.equal(cells.flat().filter(cell => cell.npc === npcId).length, 1, `B${depth}F`);
  }
  buildBoundaryWallMap(64, () => .5, { bossDefeatedById: { todes_scorpio_b64f: true } });
  assert.equal(cells.flat().filter(cell => cell.npc === "NPC_01_b60_desert").length, 1);
});

test("new regional Mikan guidance follows the existing floor-zone definitions", () => {
  const expectations = [
    [30, "NPC_01_glut", "あっつ…！足が熱いにゃあ…！歩くと足がヒリヒリするにゃあ…！にゃんこも靴を履きたいにゃあ…。耐火ブーツ、履きたいにゃあ…！"],
    [39, "NPC_01_glut", "あっつ…！足が熱いにゃあ…！歩くと足がヒリヒリするにゃあ…！にゃんこも靴を履きたいにゃあ…。耐火ブーツ、履きたいにゃあ…！"],
    [40, "NPC_01_frost", "ひゃあ…！足が冷たいにゃあ…！歩くと足が凍えそうだにゃあ…！にゃんこも靴を履きたいにゃあ…。防寒ブーツ、履きたいにゃあ…！"],
    [49, "NPC_01_frost", "ひゃあ…！足が冷たいにゃあ…！歩くと足が凍えそうだにゃあ…！にゃんこも靴を履きたいにゃあ…。防寒ブーツ、履きたいにゃあ…！"],
    [50, "NPC_01_jungle_vines", "にゃあ…！あちこちに、大きな大きな蔓が生えてるにゃあ…！通れないにゃあ…！"],
    [51, "NPC_01_jungle_herbicide", "除草剤、便利にゃあ…！あのトゲトゲの怖いお花にも効くのかにゃあ…？"],
    [70, "NPC_01_rapid_current", "にゃあ！流されるにゃ…！流されるにゃあ…！"],
    [79, "NPC_01_rapid_current", "にゃあ！流されるにゃ…！流されるにゃあ…！"],
    [80, "NPC_01_crystal", "にゃあ…！歩いているだけで力が抜けていくにゃあ…！フラフラにゃあ…。"],
    [89, "NPC_01_crystal", "にゃあ…！歩いているだけで力が抜けていくにゃあ…！フラフラにゃあ…。"]
  ];
  for (const [depth, npcId, dialogue] of expectations) {
    assert.equal(getMikanRegionalNpcId(depth), npcId);
    buildBoundaryWallMap(depth, () => .5, {});
    assert.equal(placedNpcId(), npcId, `B${depth}F`);
    assert.deepEqual(getNpcEncounter(getNpcById(npcId), 0).dialogue, [dialogue]);
  }
  for (let depth = 30; depth <= 39; depth += 1) {
    assert.equal(getMikanRegionalNpcId(depth), "NPC_01_glut", `B${depth}F`);
  }
  for (let depth = 40; depth <= 49; depth += 1) {
    assert.equal(getMikanRegionalNpcId(depth), "NPC_01_frost", `B${depth}F`);
  }
  for (let depth = 50; depth <= 59; depth += 1) {
    const expected = depth % 2 === 0 ? "NPC_01_jungle_vines" : "NPC_01_jungle_herbicide";
    assert.equal(getMikanRegionalNpcId(depth), expected, `B${depth}F`);
  }
  for (let depth = 70; depth <= 79; depth += 1) {
    assert.equal(getMikanRegionalNpcId(depth), "NPC_01_rapid_current", `B${depth}F`);
  }
  for (let depth = 80; depth <= 89; depth += 1) {
    assert.equal(getMikanRegionalNpcId(depth), "NPC_01_crystal", `B${depth}F`);
  }
});

test("queen-shadow quests keep priority over generic and regional Mikan", () => {
  const active = { active: true, completed: false, progress: 0 };
  buildBoundaryWallMap(10, () => .5, { queenShadowQuest: active });
  assert.equal(placedNpcId(), "queen_shadow");

  buildBoundaryWallMap(60, () => .5, { secondQueenShadowQuest: active, eventFlags: {} });
  assert.equal(placedNpcId(), "queen_shadow_desert");
  buildBoundaryWallMap(66, () => .5, {
    secondQueenShadowQuest: { ...active, progress: 6 },
    eventFlags: {}
  });
  assert.equal(placedNpcId(), null);
  assert.equal(cells.flat().find(cell => cell.specialRoom)?.specialRoom?.content?.type, "secondQueenShadowFinale");

  buildBoundaryWallMap(90, () => .5, { thirdQueenShadowQuest: active, eventFlags: {} });
  assert.equal(placedNpcId(), "queen_shadow_dark");
});

test("Maikaefer encounter and nest rates remain unchanged", () => {
  assert.equal(MAIKAEFER_ENCOUNTER_RATE, 0.015);
  assert.equal(MAIKAEFER_NEST_RATE, 0.02);
});

test("a generated Mikan dialogue ID survives save and load without changing the encounter", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  globalThis.window = { dispatchEvent() {} };
  globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

  buildBoundaryWallMap(1, () => .81, {});
  const placedId = placedNpcId();
  const dialogue = getNpcEncounter(getNpcById(placedId), 0).dialogue;
  const snapshot = {
    character: { name: "TEST", level: 1 },
    player: { gridX: 0, gridY: 0, dir: 0 },
    dungeon: {
      depth: 1,
      cells: structuredClone(cells),
      explored: cells.map(row => row.map(() => false))
    }
  };
  assert.equal(writeGame(snapshot), true);
  const loaded = loadGame();
  const loadedId = loaded.dungeon.cells.flat().find(cell => cell.npc)?.npc;
  assert.equal(loadedId, placedId);
  assert.deepEqual(getNpcEncounter(getNpcById(loadedId), 0).dialogue, dialogue);

  const legacy = structuredClone(snapshot);
  legacy.dungeon.cells.flat().find(cell => cell.npc).npc = "NPC_01";
  assert.equal(writeGame(legacy, "manual1"), true);
  assert.equal(loadGame("manual1").dungeon.cells.flat().find(cell => cell.npc)?.npc, "NPC_01");
  assert.ok(getNpcById("NPC_01"));
});

test("Mikan Nyanko no longer appears after all three queen regalia are collected", () => {
  buildBoundaryWallMap(5, () => .5, { queenRegaliaComplete: true });
  assert.equal(cells.flat().filter(cell => String(cell.npc || "").startsWith("NPC_01")).length, 0);

  const active = { active: true, completed: false, progress: 0 };
  buildBoundaryWallMap(10, () => .5, {
    queenRegaliaComplete: true,
    queenShadowQuest: active
  });
  assert.equal(cells.flat().filter(cell => cell.npc === "queen_shadow").length, 1);
});

test("quest 008 replaces Mikan with the queen shadow in strict floor order", () => {
  const active = { active: true, completed: false, progress: 0 };
  buildBoundaryWallMap(10, () => .5, { queenShadowQuest: active });
  assert.equal(cells.flat().filter(cell => cell.npc === "queen_shadow").length, 1);
  assert.equal(cells.flat().filter(cell => String(cell.npc || "").startsWith("NPC_01")).length, 0);

  buildBoundaryWallMap(11, () => .5, { queenShadowQuest: active });
  assert.equal(cells.flat().filter(cell => cell.npc).length, 0);

  buildBoundaryWallMap(11, () => .5, { queenShadowQuest: { ...active, progress: 1 } });
  assert.equal(cells.flat().filter(cell => cell.npc === "queen_shadow").length, 1);

  buildBoundaryWallMap(14, () => .5, { queenShadowQuest: { ...active, progress: 4 } });
  assert.equal(cells.flat().filter(cell => cell.npc).length, 0);
});
