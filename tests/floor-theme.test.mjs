import test from "node:test";
import assert from "node:assert/strict";
import { resolveFloorTheme } from "../js/floorTheme.js";

test("B30F to B39F use red walls and floors while other floors remain default", () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    const expected = depth >= 30 && depth <= 39
      ? { wall: "red", floor: "red", source: "floor" }
      : { wall: "default", floor: "default", source: "fixed" };
    assert.deepEqual(resolveFloorTheme(depth, { wall: "red", floor: "purple" }), expected);
  }
});
