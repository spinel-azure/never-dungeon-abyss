import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { MOBILE_FRAME_INTERVAL, getEffectiveFrameRate, resolveRenderFrame, setFrameRateMode } from "../js/renderer.js";

test("mobile rendering skips frames until the 30fps interval elapses", () => {
  const first = resolveRenderFrame(100, null, true);
  assert.deepEqual(first, { shouldRender: true, lastRenderTime: 100 });

  const early = resolveRenderFrame(116, first.lastRenderTime, true);
  assert.deepEqual(early, { shouldRender: false, lastRenderTime: 100 });

  const due = resolveRenderFrame(134, early.lastRenderTime, true);
  assert.equal(due.shouldRender, true);
  assert.ok(Math.abs(due.lastRenderTime - (100 + MOBILE_FRAME_INTERVAL)) < 0.001);
});

test("desktop rendering remains unrestricted", () => {
  assert.deepEqual(resolveRenderFrame(100, null, false), { shouldRender: true, lastRenderTime: null });
  assert.deepEqual(resolveRenderFrame(108, 100, false), { shouldRender: true, lastRenderTime: null });
});

test("renderer uses existing mobile and tablet layout detection without double scheduling", async () => {
  const [mainSource, rendererSource] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);

  assert.match(mainSource, /isMobileDevice:[\s\S]*layout-mobile[\s\S]*layout-tablet/);
  assert.match(rendererSource, /export function drawScene\(now\) \{\s*requestAnimationFrame\(drawScene\);/);
  assert.match(rendererSource, /getEffectiveFrameRate\(\) === 30/);
  assert.equal(rendererSource.match(/requestAnimationFrame\(drawScene\)/g)?.length, 2);
  assert.match(rendererSource, /if \(!frame\.shouldRender\) return;\s*const \{ ctx, W, H, state \} = renderer;\s*renderer\.updateAnimation\(now\);/);
});

test("saved frame-rate modes override the automatic device default", () => {
  setFrameRateMode("30");
  assert.equal(getEffectiveFrameRate(), 30);
  setFrameRateMode("60");
  assert.equal(getEffectiveFrameRate(), 60);
  setFrameRateMode("auto");
  assert.equal(getEffectiveFrameRate(), 60);
});

test("options page exposes the frame-rate toggle, motion warning, and HUD indicator", async () => {
  const [html, menuSource, mainSource, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../css/style.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /data-option-page="3"[\s\S]*data-option="frameRateMode"/);
  assert.match(html, /画面の揺れ[^<]*たいまつの揺らぎ[^<]*自動的にOFF/);
  assert.match(html, /id="fpsIndicator"/);
  assert.match(menuSource, /getEffectiveFrameRate\(\) === 30[\s\S]*screenShakeEnabled = false;[\s\S]*torchFlickerEnabled = false;/);
  assert.match(menuSource, /frameRateMode: menu\.frameRateMode/);
  assert.match(mainSource, /fpsIndicator\.textContent = `\$\{getEffectiveFrameRate\(\)\}fps`/);
  assert.match(css, /\.fps-indicator[\s\S]*border-radius: 999px/);
});
