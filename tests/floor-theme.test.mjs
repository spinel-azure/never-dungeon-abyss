import test from "node:test";
import assert from "node:assert/strict";
import { resolveFloorTheme } from "../js/floorTheme.js";

test("starter, dark, desert, fire, cold, and forest areas use their fixed wall and floor colors", () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    const expected = depth >= 1 && depth <= 9
      ? { wall: "stone", floor: "default", source: "floor" }
      : depth >= 10 && depth <= 19
        ? { wall: "black", floor: "black", source: "floor" }
      : depth >= 20 && depth <= 29
        ? { wall: "yellow", floor: "yellow", source: "floor" }
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

test("starter, dark, desert, fire, cold, and forest areas load their dedicated WebP wall textures and mist", async () => {
  const { readFile } = await import("node:fs/promises");
  const [renderer, main, menu] = await Promise.all([
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/menu.js", import.meta.url), "utf8")
  ]);
  assert.match(renderer, /images\/dungeon_effects\/forest_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/forest_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dungeon_wall_03\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dungeon_wall_04\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/fire_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/fire_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/ice_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/ice_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dark_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dark_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/desert_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/desert_wall_02\.webp/);
  assert.match(renderer, /yellow: \{ main: \[206, 209, 21\]/);
  assert.match(renderer, /color === "red".*fireWallTextures/s);
  assert.match(renderer, /color === "blue".*iceWallTextures/s);
  assert.match(renderer, /color === "stone".*starterWallTextures/s);
  assert.match(renderer, /color === "black".*darkWallTextures/s);
  assert.match(renderer, /color === "yellow".*desertWallTextures/s);
  assert.match(menu, /\["default", "stone", "red", "blue", "green", "yellow", "white", "black"\]\.includes\(wall\)/);
  assert.match(main, /currentDepth >= 50 && currentDepth <= 59 \? "green"/);
  assert.match(main, /currentDepth >= 10 && currentDepth <= 19 \? "black"/);
  assert.match(main, /currentDepth >= 20 && currentDepth <= 29 \? "yellow"/);
});
