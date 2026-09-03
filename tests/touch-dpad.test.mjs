import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_TOUCH_MOVEMENT_MODE,
  getTouchDpadAction,
  normalizeTouchMovementMode,
  resolveTouchMovementUi
} from "../js/floating-stick.js";

const root = new URL("../", import.meta.url);

test("missing or invalid legacy touch movement settings fall back to the fixed d-pad", () => {
  assert.equal(DEFAULT_TOUCH_MOVEMENT_MODE, "dpad");
  assert.equal(normalizeTouchMovementMode(undefined), "dpad");
  assert.equal(normalizeTouchMovementMode("legacy-value"), "dpad");
});

test("mobile and tablet layouts switch exclusively between d-pad and floating stick", () => {
  for (const layout of ["mobile", "tablet"]) {
    assert.deepEqual(resolveTouchMovementUi({ touchControlsEnabled: true, requestedMode: "dpad", layout }), {
      movementMode: "dpad",
      dpadEnabled: true,
      stickEnabled: false
    });
    assert.deepEqual(resolveTouchMovementUi({ touchControlsEnabled: true, requestedMode: "stick", layout }), {
      movementMode: "stick",
      dpadEnabled: false,
      stickEnabled: true
    });
  }
});

test("desktop keeps the existing floating-stick behavior when touch controls are forced on", () => {
  assert.deepEqual(resolveTouchMovementUi({ touchControlsEnabled: true, requestedMode: "dpad", layout: "pc" }), {
    movementMode: "stick",
    dpadEnabled: false,
    stickEnabled: true
  });
  assert.equal(resolveTouchMovementUi({ touchControlsEnabled: false, requestedMode: "dpad", layout: "pc" }).stickEnabled, false);
});

test("d-pad directions map to the shared forward, back, and turn actions", () => {
  assert.equal(getTouchDpadAction("up"), "up");
  assert.equal(getTouchDpadAction("down"), "down");
  assert.equal(getTouchDpadAction("left"), "left");
  assert.equal(getTouchDpadAction("right"), "right");
  assert.equal(getTouchDpadAction("diagonal"), "");
});

test("touch movement selection is exposed, persisted, restored, and applied immediately", async () => {
  const [html, menuSource, mainSource] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("js/menu.js", root), "utf8"),
    readFile(new URL("js/main.js", root), "utf8")
  ]);

  assert.match(html, /id="touchDpad"/);
  for (const direction of ["up", "down", "left", "right"]) {
    assert.match(html, new RegExp(`data-touch-direction="${direction}"`));
  }
  assert.match(html, /data-option="touchMovementMode"[\s\S]*十字キー/);
  assert.match(menuSource, /touchMovementMode:\s*"dpad"/);
  assert.match(menuSource, /\["dpad", "stick"\]\.includes\(saved\.touchMovementMode\)/);
  assert.match(menuSource, /touchMovementMode:\s*menu\.touchMovementMode/);
  assert.match(menuSource, /menu\.setTouchMovementMode\(menu\.touchMovementMode\)/);
  assert.match(mainSource, /setTouchMovementMode:\s*mode => virtualStickController\?\.setMovementMode\(mode\)/);
});

test("both touch movement UIs use the existing dispatch path and common input lock", async () => {
  const [mainSource, controlSource] = await Promise.all([
    readFile(new URL("js/main.js", root), "utf8"),
    readFile(new URL("js/floating-stick.js", root), "utf8")
  ]);

  assert.match(mainSource, /manualMove:\s*amount => dispatchGamepadAction\(amount > 0 \? "up" : "down"\)/);
  assert.match(mainSource, /manualTurn:\s*amount => dispatchGamepadAction\(amount < 0 \? "left" : "right"\)/);
  assert.match(mainSource, /isInputAllowed:\s*\(\) => Boolean\([\s\S]*character[\s\S]*!sceneTransitionRunning[\s\S]*!document\.body\.classList\.contains\("title-active"\)/);
  assert.match(controlSource, /if \(!dpadEnabled \|\| !action \|\| activePointerId !== null \|\| !isInputAllowed\(\)\) return;/);
  assert.match(controlSource, /function dispatchDpadAction\(action\) \{\s*if \(!isInputAllowed\(\)\)/);
});

test("d-pad cancellation, mode changes, and long presses always clear active state", async () => {
  const source = await readFile(new URL("js/floating-stick.js", root), "utf8");
  assert.match(source, /DPAD_REPEAT_DELAY_MS = 300/);
  assert.match(source, /pointercancel/);
  assert.match(source, /lostpointercapture/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /orientationchange/);
  assert.match(source, /function setMovementMode[\s\S]*reset\(\);[\s\S]*refreshEnabled\(\);/);
  assert.match(source, /dpadButton\?\.classList\.remove\("is-pressed"\)/);
  assert.match(source, /activePointerId !== null/);
});

test("d-pad presentation preserves safe areas, minimum touch size, and beveled corners", async () => {
  const css = await readFile(new URL("css/game-menu.css", root), "utf8");
  assert.match(css, /\.touch-dpad\{[^}]*env\(safe-area-inset-left\)[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.touch-dpad-button\{[^}]*min-width:48px[^}]*min-height:48px/);
  assert.match(css, /clip-path:polygon\(/);
  assert.match(css, /@media\(max-width:420px\)[^{]*\{\.touch-dpad\{[\s\S]*min-width:44px/);
  assert.match(css, /\.touch-dpad-button\.is-pressed/);
});
