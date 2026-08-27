import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const audio = readFileSync(new URL("../js/audio.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const player = readFileSync(new URL("../js/player.js", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../js/renderer.js", import.meta.url), "utf8");

test("new B100F, zone, reserved boss, and ending audio assets are registered", () => {
  for (const relativePath of [
    "../bgm/tozasareshi-seisen.mp3",
    "../bgm/manuke-kyoku.mp3",
    "../bgm/arabu-sabaku.mp3",
    "../bgm/taikutsu-mori.mp3",
    "../bgm/jo-jokyoku.mp3",
    "../se/warp.wav"
  ]) assert.equal(existsSync(new URL(relativePath, import.meta.url)), true, relativePath);
  assert.match(audio, /fixedWarp: "warp\.wav"/);
  assert.match(audio, /\["jungleZone", "bgm\/taikutsu-mori\.mp3"\]/);
  assert.match(audio, /\["desertZone", "bgm\/arabu-sabaku\.mp3"\]/);
  assert.match(audio, /\["finalBoss", "bgm\/tozasareshi-seisen\.mp3"\]/);
  assert.match(audio, /\["maerchentiereBoss", "bgm\/manuke-kyoku\.mp3"\]/);
  assert.match(audio, /\["ending", "bgm\/jo-jokyoku\.mp3"\]/);
});

test("zone and B100F final boss BGM selectors use their dedicated tracks", () => {
  assert.match(main, /currentDepth >= 50 && currentDepth <= 59[\s\S]*?return "jungleZone"/);
  assert.match(main, /currentDepth >= 60 && currentDepth <= 69[\s\S]*?return "desertZone"/);
  assert.match(main, /\["erzdaemonin_b100f", "amayenak_b100f"\][\s\S]*?return "finalBoss"/);
  assert.match(main, /enemyData\?\.battleBgmKey/);
});

test("B100F warp waits for A, starts warp SE, fades, and applies its destination while dark", () => {
  assert.match(player, /転送陣がまばゆい光に包まれる――――！\\n＊Aボタンで次へ/);
  assert.match(player, /type: "fixedFloorWarp"[\s\S]*?confirmFixedFloorWarpEvent/);
  assert.match(main, /runFixedWarpTransition: async[\s\S]*?await playSe\("fixedWarp"\)[\s\S]*?runSceneTransition/);
  assert.match(player, /runFixedWarpTransition\(\(\) => applyFixedFloorWarp\(event\.warp\)\)/);
});

test("B100F queen shadow overlay fades after its warning", () => {
  assert.match(player, /event\.fadeOut[\s\S]*?event\.fadeStartedAt = performance\.now\(\)/);
  assert.match(player, /removeFixedEventAt\(state\.gridX, state\.gridY\)/);
  assert.match(renderer, /event\.type === "fixedFloorEvent" && event\.phase === "fading"/);
});