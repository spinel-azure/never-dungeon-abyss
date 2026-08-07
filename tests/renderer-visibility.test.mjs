import test from "node:test";
import assert from "node:assert/strict";

import { hasGridLineOfSight, isSpriteEventCell } from "../js/renderer.js";

const openGrid = () => false;

test("sprite centers remain visible directly ahead for NPCs, treasure, fountains and bosses", () => {
  const visible = hasGridLineOfSight({
    viewerX: 0.5, viewerY: 1.5,
    targetX: 3.5, targetY: 1.5,
    targetCellX: 3, targetCellY: 1,
    wallOnCell: openGrid
  });
  assert.equal(visible, true);
  for (const cell of [
    { npc: "NPC_01" }, { treasure: "red" }, { fountain: true },
    { bossId: "strange_knight_statue_b9f" },
    { bossRemainsId: "strange_knight_statue_b9f" }
  ]) assert.equal(isSpriteEventCell(cell), true);
});

test("a sprite behind a corner wall is not visible", () => {
  const visible = hasGridLineOfSight({
    viewerX: 0.5, viewerY: 1.5,
    targetX: 1.5, targetY: 0.5,
    targetCellX: 1, targetCellY: 0,
    wallOnCell: (x, y, dirKey) => x === 0 && y === 1 && dirKey === "E"
  });
  assert.equal(visible, false);
});

test("a visible sprite center is retained when only a cell edge is occluded", () => {
  const wallOnCell = (x, y, dirKey) => x === 1 && y === 1 && dirKey === "E";
  const centerVisible = hasGridLineOfSight({
    viewerX: 0.5, viewerY: 2.5,
    targetX: 3.5, targetY: 1.5,
    targetCellX: 3, targetCellY: 1,
    wallOnCell
  });
  const upperEdgeVisible = hasGridLineOfSight({
    viewerX: 0.5, viewerY: 2.5,
    targetX: 3.18, targetY: 1.18,
    targetCellX: 3, targetCellY: 1,
    wallOnCell
  });
  assert.equal(centerVisible, true);
  assert.equal(upperEdgeVisible, false);
});
