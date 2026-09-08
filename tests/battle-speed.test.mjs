import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  BATTLE_SPEED_FAST,
  BATTLE_SPEED_NORMAL,
  BATTLE_SPEED_SETTINGS_VERSION,
  BATTLE_SPEED_SLOW,
  DEFAULT_BATTLE_SPEED_MODE,
  getBattleDedicatedPresentationDwell,
  getBattlePresentationDelay,
  normalizeBattleSpeedMode,
  normalizeStoredBattleSpeedMode,
  toggleBattleSpeedMode
} from "../js/battle-speed.js";

test("battle speed defaults to the existing fast pace and normalizes all three modes", () => {
  assert.equal(DEFAULT_BATTLE_SPEED_MODE, BATTLE_SPEED_FAST);
  assert.equal(normalizeBattleSpeedMode(undefined), BATTLE_SPEED_FAST);
  assert.equal(normalizeBattleSpeedMode("unexpected"), BATTLE_SPEED_FAST);
  assert.equal(normalizeBattleSpeedMode(BATTLE_SPEED_FAST), BATTLE_SPEED_FAST);
  assert.equal(normalizeBattleSpeedMode(BATTLE_SPEED_NORMAL), BATTLE_SPEED_NORMAL);
  assert.equal(normalizeBattleSpeedMode(BATTLE_SPEED_SLOW), BATTLE_SPEED_SLOW);
});

test("battle speed cycles from fast to normal to slow", () => {
  assert.equal(toggleBattleSpeedMode(BATTLE_SPEED_FAST), BATTLE_SPEED_NORMAL);
  assert.equal(toggleBattleSpeedMode(BATTLE_SPEED_NORMAL), BATTLE_SPEED_SLOW);
  assert.equal(toggleBattleSpeedMode(BATTLE_SPEED_SLOW), BATTLE_SPEED_FAST);
});

test("legacy slow settings migrate to the renamed normal pace", () => {
  assert.equal(normalizeStoredBattleSpeedMode(BATTLE_SPEED_SLOW), BATTLE_SPEED_NORMAL);
  assert.equal(
    normalizeStoredBattleSpeedMode(BATTLE_SPEED_SLOW, BATTLE_SPEED_SETTINGS_VERSION),
    BATTLE_SPEED_SLOW
  );
  assert.equal(normalizeStoredBattleSpeedMode(BATTLE_SPEED_NORMAL, 1), BATTLE_SPEED_NORMAL);
  assert.equal(normalizeStoredBattleSpeedMode(BATTLE_SPEED_FAST, 1), BATTLE_SPEED_FAST);
});

test("fast mode preserves every existing standard presentation delay", () => {
  assert.equal(getBattlePresentationDelay(280, BATTLE_SPEED_FAST), 280);
  assert.equal(getBattlePresentationDelay(360, BATTLE_SPEED_FAST), 360);
  assert.equal(getBattlePresentationDelay(520, BATTLE_SPEED_FAST), 520);
  assert.equal(getBattlePresentationDelay(450, BATTLE_SPEED_FAST), 450);
});

test("normal mode preserves the former slow pace at 1.8 times", () => {
  assert.equal(getBattlePresentationDelay(280, BATTLE_SPEED_NORMAL), 504);
  assert.equal(getBattlePresentationDelay(360, BATTLE_SPEED_NORMAL), 648);
  assert.equal(getBattlePresentationDelay(520, BATTLE_SPEED_NORMAL), 936);
  assert.equal(getBattlePresentationDelay(450, BATTLE_SPEED_NORMAL), 810);
});

test("slow mode lengthens presentation and auto-battle pacing by 2.6 times", () => {
  assert.equal(getBattlePresentationDelay(280, BATTLE_SPEED_SLOW), 728);
  assert.equal(getBattlePresentationDelay(360, BATTLE_SPEED_SLOW), 936);
  assert.equal(getBattlePresentationDelay(520, BATTLE_SPEED_SLOW), 1352);
  assert.equal(getBattlePresentationDelay(450, BATTLE_SPEED_SLOW), 1170);
});

test("three speeds add distinct readable pauses after dedicated effects", () => {
  assert.equal(getBattleDedicatedPresentationDwell(BATTLE_SPEED_FAST), 0);
  assert.equal(getBattleDedicatedPresentationDwell(BATTLE_SPEED_NORMAL), 450);
  assert.equal(getBattleDedicatedPresentationDwell(BATTLE_SPEED_SLOW), 900);
});

test("battle timing is applied only to presentation and automatic action spacing", async () => {
  const battleSource = await readFile(new URL("../js/battle.js", import.meta.url), "utf8");
  assert.match(battleSource, /getBattlePresentationDelay\(delayMs, battleUi\.speedMode\)/);
  assert.match(battleSource, /getBattlePresentationDelay\(450, battleUi\.speedMode\)/);
  assert.match(battleSource, /getBattleDedicatedPresentationDwell\(battleUi\.speedMode\)/);
  assert.match(battleSource, /await delay\(1250\)/);
  assert.match(battleSource, /await delay\(reduced \? 450 : 2500\)/);
});

test("battle speed uses versioned device-wide settings", async () => {
  const [menuSource, mainSource] = await Promise.all([
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  assert.match(menuSource, /battleSpeedMode: DEFAULT_BATTLE_SPEED_MODE/);
  assert.match(menuSource, /menu\.battleSpeedMode = normalizeStoredBattleSpeedMode\(/);
  assert.match(menuSource, /battleSpeedSettingsVersion: BATTLE_SPEED_SETTINGS_VERSION/);
  assert.match(menuSource, /battleSpeedMode: menu\.battleSpeedMode/);
  assert.match(mainSource, /configureBattle\(\{[\s\S]*getBattleSpeedMode,[\s\S]*setBattleSpeedMode,/);
});

test("battle speed control exposes all labels through an accessible touch-sized button", async () => {
  const [html, css, battleSource] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../css/battle.css", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="battleSpeedToggle"[^>]*aria-label="戦闘速度：倍速[^>]*>⏩<\/button>/);
  assert.match(battleSource, /normal: \{ icon: "▶", label: "等速"/);
  assert.match(battleSource, /slow: \{ icon: "⏯", label: "低速"/);
  assert.match(css, /\.battle-speed-toggle\s*\{[\s\S]*width: 46px;[\s\S]*height: 46px;/);
  assert.match(css, /touch-action: manipulation/);
});
