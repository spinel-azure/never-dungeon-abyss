import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const textures = Object.freeze([
  ["dungeon_door_normal.webp", /loadDoorTexture\(\["normal", "locked"\]/],
  ["dungeon_door_red.webp", /loadDoorTexture\(\["boss", "bossUnlocked"\]/],
  ["dungeon_door_purple.webp", /loadDoorTexture\(\["specialLocked", "specialUnlocked"\]/]
]);

test("normal, red and purple dungeon doors load their dedicated WebP textures", async () => {
  const renderer = await readFile(new URL("../js/renderer.js", import.meta.url), "utf8");
  for (const [filename, assignment] of textures) {
    await access(new URL(`../images/dungeon_effects/${filename}`, import.meta.url));
    assert.match(renderer, new RegExp(`images/dungeon_effects/${filename.replace(".", "\\.")}`));
    assert.match(renderer, assignment);
  }
});

test("door images keep generated Canvas textures as a load-failure fallback", async () => {
  const renderer = await readFile(new URL("../js/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /normal: makeDoorTexture\("normal"\)/);
  assert.match(renderer, /boss: makeDoorTexture\("boss"\)/);
  assert.match(renderer, /specialLocked: makeDoorTexture\("special"\)/);
  assert.match(renderer, /image\.onload[\s\S]*?renderer\.doorTextures\[kind\] = image/);
  assert.match(renderer, /image\.onerror[\s\S]*?Door texture failed to load/);
});
