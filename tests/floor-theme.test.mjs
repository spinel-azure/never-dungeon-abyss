import test from "node:test";
import assert from "node:assert/strict";
import { resolveFloorTheme } from "../js/floorTheme.js";

test("dungeon floors remain on the fixed default wall and floor palette", () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    assert.deepEqual(resolveFloorTheme(depth, { wall: "red", floor: "purple" }), {
      wall: "default", floor: "default", source: "fixed"
    });
  }
});
