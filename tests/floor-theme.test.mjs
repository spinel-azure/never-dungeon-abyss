import test from "node:test";
import assert from "node:assert/strict";
import { resolveFloorTheme } from "../js/floorTheme.js";

test("fire, cold, and forest areas use their fixed wall and floor colors", () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    const expected = depth >= 1 && depth <= 10
      ? { wall: "stone", floor: "default", source: "floor" }
      : depth >= 30 && depth <= 39
      ? { wall: "red", floor: "red", source: "floor" }
      : depth >= 40 && depth <= 49
        ? { wall: "blue", floor: "blue", source: "floor" }
        : depth >= 50 && depth <= 59
          ? { wall: "green", floor: "green", source: "floor" }
      : { wall: "default", floor: "default", source: "fixed" };
    assert.deepEqual(resolveFloorTheme(depth, { wall: "red", floor: "purple" }), expected);
  }
});

test("fire, cold, and forest areas load their dedicated WebP wall textures and mist", async () => {
  const { readFile } = await import("node:fs/promises");
  const [renderer, main] = await Promise.all([
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  assert.match(renderer, /images\/dungeon_effects\/forest_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/forest_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dungeon_wall_03\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dungeon_wall_04\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/fire_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/fire_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/ice_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/ice_wall_02\.webp/);
  assert.match(renderer, /color === "red".*fireWallTextures/s);
  assert.match(renderer, /color === "blue".*iceWallTextures/s);
  assert.match(renderer, /color === "stone".*starterWallTextures/s);
  assert.match(main, /currentDepth >= 50 && currentDepth <= 59 \? "green"/);
});
