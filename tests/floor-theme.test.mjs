import test from "node:test";
import assert from "node:assert/strict";
import { resolveFloorTheme } from "../js/floorTheme.js";

test("fire and cold areas use their fixed wall and floor colors", () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    const expected = depth >= 30 && depth <= 39
      ? { wall: "red", floor: "red", source: "floor" }
      : depth >= 40 && depth <= 49
        ? { wall: "blue", floor: "blue", source: "floor" }
      : { wall: "default", floor: "default", source: "fixed" };
    assert.deepEqual(resolveFloorTheme(depth, { wall: "red", floor: "purple" }), expected);
  }
});
