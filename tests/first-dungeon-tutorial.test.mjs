import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

test("only new characters are eligible for the first dungeon tutorial", () => {
  const newcomer = createInitialCharacter({ name: "NEW", job: "warrior" });
  assert.equal(newcomer.firstDungeonTutorialSeen, false);

  const legacy = structuredClone(newcomer);
  delete legacy.firstDungeonTutorialSeen;
  assert.equal(normalizeCharacter(legacy).firstDungeonTutorialSeen, true);
});

test("the tutorial exposes the minimap and torch meter through labeled windows", () => {
  assert.match(html, /id="firstDungeonTutorial"[\s\S]*?first-dungeon-tutorial-map-window/);
  assert.match(html, /first-dungeon-tutorial-torch-window[\s\S]*?>ミニマップ</);
  assert.match(html, />たいまつゲージ</);
  assert.match(css, /first-dungeon-tutorial-shade[\s\S]*?mask-composite: xor/);
  assert.match(css, /first-dungeon-tutorial-map-window[\s\S]*?width: 14\.3%/);
  assert.match(css, /first-dungeon-tutorial-torch-window[\s\S]*?width: 20\.7%/);
});

test("the first dungeon tutorial locks input and enables confirmation after three seconds", () => {
  assert.match(main, /function showFirstDungeonTutorial\(\)[\s\S]*?setPlayerInputEnabled\(false\)/);
  assert.match(main, /firstDungeonTutorialTimer = window\.setTimeout\([\s\S]*?firstDungeonTutorialReady = true;[\s\S]*?say\("＊Aボタンで次へ"\);[\s\S]*?3000\)/);
  assert.match(main, /function handleFirstDungeonTutorialInput\(action\)[\s\S]*?action === "confirm"/);
  assert.match(main, /if \(!character\.firstDungeonTutorialSeen\) await showFirstDungeonTutorial\(\)/);
  assert.match(main, /character\.firstDungeonTutorialSeen = true;[\s\S]*?setPlayerInputEnabled\(true\)/);
  assert.doesNotMatch(html, /firstDungeonTutorialPrompt/);
  assert.match(css, /first-dungeon-tutorial-content[\s\S]*?left: 50%;[\s\S]*?transform: translateX\(-50%\)/);
});
