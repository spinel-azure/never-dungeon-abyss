import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeFloatingStickInput,
  resolveTouchControlsEnabled
} from "../js/floating-stick.js";

const root = new URL("../", import.meta.url);

test("touch control AUTO follows coarse touch capability while ON and OFF override it", () => {
  assert.equal(resolveTouchControlsEnabled("auto", { coarsePointer: true, maxTouchPoints: 5 }), true);
  assert.equal(resolveTouchControlsEnabled("auto", { coarsePointer: false, maxTouchPoints: 5 }), false);
  assert.equal(resolveTouchControlsEnabled("auto", { coarsePointer: true, maxTouchPoints: 0 }), false);
  assert.equal(resolveTouchControlsEnabled("on", { coarsePointer: false, maxTouchPoints: 0 }), true);
  assert.equal(resolveTouchControlsEnabled("off", { coarsePointer: true, maxTouchPoints: 5 }), false);
});

test("floating stick applies its dead zone, radius cap, and circular diagonal normalization", () => {
  assert.deepEqual(normalizeFloatingStickInput(5, 5), {
    x: 0,
    y: 0,
    distance: Math.hypot(5, 5),
    active: false
  });
  const capped = normalizeFloatingStickInput(100, 0);
  assert.equal(capped.x, 1);
  assert.equal(capped.y, 0);
  const diagonal = normalizeFloatingStickInput(100, 100);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
});

test("floating touch UI is data-driven, persisted, and restricted to the lower control zone", async () => {
  const [html, menu, main, css, source] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("js/menu.js", root), "utf8"),
    readFile(new URL("js/main.js", root), "utf8"),
    readFile(new URL("css/game-menu.css", root), "utf8"),
    readFile(new URL("js/floating-stick.js", root), "utf8")
  ]);
  assert.match(html, /id="floatingStickZone"/);
  assert.match(html, /data-option="touchControlsMode"/);
  assert.match(menu, /touchControlsMode:\s*"auto"/);
  assert.match(menu, /touchControlsMode:\s*menu\.touchControlsMode/);
  assert.match(main, /\(worldLocation === "dungeon" && isPlayerInputEnabled\(\)\) \|\| isTownOpen\(\)/);
  assert.match(main, /manualMove: amount => dispatchGamepadAction\(amount > 0 \? "up" : "down"\)/);
  assert.match(main, /manualTurn: amount => dispatchGamepadAction\(amount < 0 \? "left" : "right"\)/);
  assert.match(main, /!isBattleActive\(\)/);
  assert.match(main, /!state\.autoWalkerActive/);
  assert.match(css, /\.floating-stick-zone\{[^}]*position:fixed/);
  assert.doesNotMatch(css, /body\.town-active \.floating-stick-zone/);
  for (const eventName of ["pointercancel", "lostpointercapture", "visibilitychange", "orientationchange", "pageshow", "blur", "resize"]) {
    assert.match(source, new RegExp(eventName));
  }
});
