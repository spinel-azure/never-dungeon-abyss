import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("gamepad polling supports iOS wake and lifecycle recovery without OS sniffing", async () => {
  const source = await readFile(new URL("../js/gamepad-input.js", import.meta.url), "utf8");
  assert.match(source, /typeof navigator\.getGamepads !== "function"/);
  assert.doesNotMatch(source, /iPhone|iPad|iOS|userAgent/);
  assert.match(source, /navigator\.getGamepads\(\)/);
  for (const event of ["pointerdown", "touchstart", "visibilitychange", "pageshow", "focus"]) {
    assert.match(source, new RegExp(`addEventListener\\(\\"${event}\\"`));
  }
  assert.match(source, /suppressUntilNeutral: true/);
});

test("connection notification is nonblocking, timed, and separate from battle messages", async () => {
  const [html, css, main] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../css/game-menu.css", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="gamepadNotification"[^>]+role="status"/);
  assert.match(css, /\.gamepad-notification\{[^}]*position:fixed[^}]*pointer-events:none/);
  assert.match(main, /GAMEPAD CONNECTED/);
  assert.match(main, /GAMEPAD DISCONNECTED/);
  assert.match(main, /}, 3400\)/);
  assert.match(main, /onConnectionChange: showGamepadConnectionNotification/);
});

test("options include the iPhone and iPad reconnection hint", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /iPhone／iPadで反応しない場合は、Bluetooth接続後にゲーム画面を一度タップ/);
});

test("options put press-to-bind gamepad config first and persist four shortcuts", async () => {
  const [html, menu, main] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  for (const action of ["Confirm", "Cancel", "Minimap", "Items"]) assert.match(html, new RegExp(`data-option="gamepad${action}"`));
  assert.ok(html.indexOf('class="option-page gamepad-config" data-option-page="0"') < html.indexOf('data-option="language"'));
  assert.match(html, /項目を決定後、割り当てたいボタンを押してください/);
  assert.match(html, /ミニマップ（ダンジョン内のみ）/);
  assert.match(html, /アイテム（ダンジョン内／戦闘中のみ）/);
  assert.match(html, /data-gamepad-preview[^>]+buttons_config\.avif/);
  assert.match(menu, /PRESS BUTTON\.\.\./);
  assert.match(menu, /function drawGamepadPreview\(\)/);
  assert.match(menu, /globalCompositeOperation = "screen"/);
  assert.match(menu, /gamepadBindings: menu\.gamepadBindings/);
  assert.match(menu, /new Set\(values\)\.size === values\.length/);
  assert.match(main, /getBindings: getGamepadBindings/);
  assert.match(main, /onBindingCaptured: completeGamepadBinding/);
  assert.match(main, /onButtonPreviewChange: setGamepadPressedButtons/);
  assert.match(main, /openBattleItems\(\)/);
  assert.match(main, /openItemInventory\(\)/);
});
