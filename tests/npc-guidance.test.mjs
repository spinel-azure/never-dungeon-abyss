import test from "node:test";
import assert from "node:assert/strict";

import { getNpcById, getNpcEncounter } from "../data/npcs.js";
import { buildBoundaryWallMap, cells, randomizeStartPosition } from "../js/dungeon.js";

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
