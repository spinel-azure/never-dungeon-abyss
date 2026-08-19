import test from "node:test";
import assert from "node:assert/strict";

import { buildBoundaryWallMap, cells, setStartPosition } from "../js/dungeon.js";
import { getQuestEventForDepth } from "../data/quest-events.js";

test("quest 016 places one persistent ingredient event on every floor from B51F through B58F", () => {
  setStartPosition(0, 0);
  const progress = { activeQuestIds: ["guild_016"], eventFlags: {} };
  for (let depth = 51; depth <= 58; depth += 1) {
    const event = getQuestEventForDepth(depth, progress);
    assert.equal(event.keyItemId, "special_medicine_ingredient");
    buildBoundaryWallMap(depth, () => 0.5, progress);
    assert.equal(cells.flat().filter(cell => cell.questEvent?.id === event.id).length, 1);
    progress.eventFlags[event.flag] = true;
    assert.equal(getQuestEventForDepth(depth, progress), null);
  }
  assert.equal(getQuestEventForDepth(50, progress), null);
  assert.equal(getQuestEventForDepth(59, progress), null);
});
