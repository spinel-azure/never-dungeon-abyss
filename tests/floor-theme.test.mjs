import test from "node:test";
import assert from "node:assert/strict";
import { isForcedTorchZeroFloor, resolveFloorTheme } from "../js/floorTheme.js";

test("only B90F to B99F force the torch gauge to zero", () => {
  assert.equal(isForcedTorchZeroFloor(89), false);
  assert.equal(isForcedTorchZeroFloor(90), true);
  assert.equal(isForcedTorchZeroFloor(99), true);
  assert.equal(isForcedTorchZeroFloor(100), false);
});

test("all themed dungeon areas use their fixed wall and floor colors", () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    const expected = depth >= 1 && depth <= 9
      ? { wall: "slate", floor: "slate", source: "floor" }
      : depth >= 10 && depth <= 19
        ? { wall: "magic", floor: "magic", source: "floor" }
      : depth >= 20 && depth <= 29
        ? { wall: "torture", floor: "torture", source: "floor" }
      : depth >= 30 && depth <= 39
      ? { wall: "red", floor: "red", source: "floor" }
      : depth >= 40 && depth <= 49
        ? { wall: "blue", floor: "blue", source: "floor" }
        : depth >= 50 && depth <= 59
          ? { wall: "green", floor: "green", source: "floor" }
        : depth >= 60 && depth <= 69
          ? { wall: "yellow", floor: "yellow", source: "floor" }
        : depth >= 70 && depth <= 79
          ? { wall: "water", floor: "water", source: "floor" }
        : depth >= 80 && depth <= 89
          ? { wall: "crystal", floor: "crystal", source: "floor" }
        : depth >= 90 && depth <= 99
          ? { wall: "black", floor: "black", source: "floor" }
        : depth === 100
          ? { wall: "acacia", floor: "acacia", source: "floor" }
      : { wall: "default", floor: "default", source: "fixed" };
    assert.deepEqual(resolveFloorTheme(depth, { wall: "red", floor: "purple" }), expected);
  }
});

test("all themed dungeon areas load their dedicated WebP wall textures and mist", async () => {
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
  assert.match(renderer, /images\/dungeon_effects\/dungeon_wall_05\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/dungeon_wall_06\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/torture_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/torture_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/magic_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/magic_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/watar_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/watar_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/crystal_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/crystal_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/acacia_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/acacia_wall_02\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/marble_wall_01\.webp/);
  assert.match(renderer, /images\/dungeon_effects\/marble_wall_02\.webp/);
  assert.match(renderer, /yellow: \{ main: \[206, 209, 21\]/);
  assert.match(renderer, /slate: \{ main: \[90, 108, 104\]/);
  assert.match(renderer, /magic: \{ main: \[61, 49, 112\]/);
  assert.match(renderer, /torture: \{ main: \[69, 66, 52\]/);
  assert.match(renderer, /water: \{ main: \[62, 123, 204\]/);
  assert.match(renderer, /crystal: \{ main: \[116, 24, 114\]/);
  assert.match(renderer, /acacia: \{ main: \[169, 163, 51\]/);
  assert.match(renderer, /white: \{ main: \[235, 235, 235\]/);
  assert.match(renderer, /renderer\.floorColor === "white"[\s\S]*?rgb\(185, 185, 185\)[\s\S]*?rgb\(125, 125, 125\)/);
  assert.match(renderer, /renderer\.floorColor === "crystal"[\s\S]*?rgb\(63, 20, 77\)[\s\S]*?rgb\(23, 7, 32\)/);
  assert.match(renderer, /renderer\.floorColor === "acacia"[\s\S]*?rgb\(123, 118, 31\)[\s\S]*?rgb\(61, 58, 15\)/);
  assert.match(renderer, /renderer\.floorColor === "torture"[\s\S]*?rgb\(21, 20, 14\)[\s\S]*?rgb\(10, 10, 7\)/);
  assert.match(renderer, /renderer\.floorColor === "magic"[\s\S]*?rgb\(25, 17, 54\)[\s\S]*?rgb\(7, 4, 20\)/);
  assert.match(renderer, /torture: \{ near: "rgb\(18, 17, 13\)", mid: "rgb\(36, 35, 27\)", far: "rgb\(54, 52, 41\)"/);
  assert.match(renderer, /acacia: \{ near: "rgb\(92, 87, 25\)", mid: "rgb\(158, 151, 45\)", far: "rgb\(215, 207, 71\)"/);
  assert.match(renderer, /renderer\.floorColor === "yellow"[\s\S]*?rgb\(38, 111, 176\)/);
  assert.match(renderer, /color === "red".*fireWallTextures/s);
  assert.match(renderer, /color === "blue".*iceWallTextures/s);
  assert.match(renderer, /color === "stone".*starterWallTextures/s);
  assert.match(renderer, /color === "black".*darkWallTextures/s);
  assert.match(renderer, /color === "yellow".*desertWallTextures/s);
  assert.match(renderer, /color === "slate".*midDungeonWallTextures.*color === "magic".*magicWallTextures.*color === "torture".*tortureWallTextures/s);
  assert.match(renderer, /color === "water".*waterWallTextures/s);
  assert.match(renderer, /color === "crystal".*crystalWallTextures/s);
  assert.match(renderer, /color === "acacia".*acaciaWallTextures/s);
  assert.match(renderer, /color === "white".*marbleWallTextures/s);
  assert.match(menu, /\["default", "stone", "red", "blue", "green", "yellow", "slate", "magic", "torture", "water", "crystal", "acacia", "white", "black"\]\.includes\(wall\)/);
  assert.match(main, /currentDepth >= 50 && currentDepth <= 59 \? "green"/);
  assert.match(main, /currentDepth >= 10 && currentDepth <= 19 \? "magic"/);
  assert.match(main, /currentDepth >= 1 && currentDepth <= 9 \? "slate"/);
  assert.match(main, /currentDepth >= 20 && currentDepth <= 29 \? "torture"/);
  assert.match(main, /currentDepth >= 60 && currentDepth <= 69 \? "yellow"/);
  assert.match(main, /currentDepth >= 70 && currentDepth <= 79 \? "water"/);
  assert.match(main, /currentDepth >= 80 && currentDepth <= 89 \? "crystal"/);
  assert.match(main, /currentDepth >= 90 && currentDepth <= 99 \? "black"/);
  assert.match(main, /currentDepth === 100 \? "acacia"/);
});
