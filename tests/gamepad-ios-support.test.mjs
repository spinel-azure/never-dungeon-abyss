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

test("options provide persistent gamepad bindings for confirm, cancel, and minimap", async () => {
  const [html, menu, main] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  for (const action of ["Confirm", "Cancel", "Minimap"]) assert.match(html, new RegExp(`data-option="gamepad${action}"`));
  assert.match(menu, /gamepadBindings: menu\.gamepadBindings/);
  assert.match(menu, /new Set\(values\)\.size === values\.length/);
  assert.match(main, /getBindings: getGamepadBindings/);
});
