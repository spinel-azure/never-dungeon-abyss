import test from "node:test";
import assert from "node:assert/strict";

import { getNpcById, getNpcEncounter } from "../data/npcs.js";
import { buildBoundaryWallMap, cells, randomizeStartPosition } from "../js/dungeon.js";

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
