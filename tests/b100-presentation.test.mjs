import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const audio = readFileSync(new URL("../js/audio.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const player = readFileSync(new URL("../js/player.js", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../js/renderer.js", import.meta.url), "utf8");
const battle = readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");
const battleCss = readFileSync(new URL("../css/battle.css", import.meta.url), "utf8");

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

test("B100F blocks minimap only and keeps the entrance portal canvas-rendered", () => {
  assert.match(main, /state\.minimapBlocked = currentDepth === 100/);
  assert.match(renderer, /if \(state\?\.minimapBlocked\) return false/);
  assert.doesNotMatch(renderer, /event\.portal === "transfer_b100f"[\s\S]*?warp_portal_b100f/);
});

test("B100F warp and guardian prompts use large overlay imagery and phantom silhouettes", () => {
  assert.match(player, /type: "fixedFloorWarp"[\s\S]*?showOverlay: true[\s\S]*?imageId: "warp_portal_b100f"/);
  assert.match(player, /type: "bossPrompt"[\s\S]*?silhouette: isRematch/);
  assert.match(main, /\$\{boss\.name\}の幻影が行く手に立ちはだかっている/);
  assert.match(main, /phantom: isB100GauntletBossId\(boss\.id\)/);
  assert.match(battle, /classList\.toggle\("is-phantom", battleUi\.phantom\)/);
  assert.match(battleCss, /\.battle-enemy-image\.is-phantom[\s\S]*?brightness\(0\)/);
});

test("Amayenak receives a dedicated enlarged battle image without consuming the vital area", () => {
  assert.match(battle, /is-amayenak"[^\n]*amayenak_b100f/);
  assert.match(battleCss, /\.battle-enemy-image\.is-amayenak[\s\S]*?max-height: calc\(100% - 64px\)/);
});
