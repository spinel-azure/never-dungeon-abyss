import test from "node:test";
import assert from "node:assert/strict";

import { getNpcById, getNpcEncounter } from "../data/npcs.js";
import { buildBoundaryWallMap, cells, getStartPosition, makeDistanceMap, randomizeStartPosition } from "../js/dungeon.js";

function assertPlacedWithinThreeSteps(npcId) {
  const placed = cells.flat().find(cell => cell.npc === npcId);
  assert.ok(placed);
  const start = getStartPosition();
  const distances = makeDistanceMap(start.x, start.y);
  assert.ok(distances[placed.y][placed.x] >= 1 && distances[placed.y][placed.x] <= 3);
}

test("B4F Mikan Nyanko warns the player away from the superboss room", () => {
  const npc = getNpcById("NPC_01_b4");
  const encounter = getNpcEncounter(npc, 0);
  assert.deepEqual(encounter.dialogue, [
    "怖いにゃ…。この階にはとても恐ろしい何かの気配を感じるにゃ…。近づいちゃダメにゃあ…！"
  ]);
  assert.equal(encounter.leaveAfterTalk, true);
  randomizeStartPosition();
  buildBoundaryWallMap(4, () => .5, {});
  assertPlacedWithinThreeSteps(npc.id);
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
  assertPlacedWithinThreeSteps(npc.id);
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
  assertPlacedWithinThreeSteps(npc.id);
});
