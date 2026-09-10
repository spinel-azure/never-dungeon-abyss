import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [inputSource, townCss, html] = await Promise.all([
  readFile(new URL("../js/input.js", import.meta.url), "utf8"),
  readFile(new URL("../css/town.css", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8")
]);

test("loot identification results allow vertical touch scrolling without relaxing other touch guards", () => {
  assert.match(inputSource, /!target\.closest\("\.loot-identify-list"\)/);
  assert.match(townCss, /\.loot-identify-list\{[^}]*overflow-y:auto[^}]*overscroll-behavior:contain[^}]*touch-action:pan-y/);
  assert.match(townCss, /\.loot-identify-list\{[^}]*grid-auto-rows:max-content/);
  assert.match(townCss, /\.loot-identify-overlay\{overflow:hidden\}/);
});

test("loot result rows grow with wrapped names and destination descriptions", () => {
  assert.match(townCss, /\.loot-identify-entry\{[^}]*height:auto[^}]*align-items:flex-start[^}]*line-height:1\.35[^}]*white-space:normal/);
  assert.match(townCss, /\.loot-identify-entry>span,\.loot-identify-entry>strong\{[^}]*overflow-wrap:anywhere/);
});

test("the fixed identification action remains outside the scrolling result list", () => {
  assert.match(
    html,
    /<div id="lootIdentifyList" class="loot-identify-list"><\/div>\s*<div class="loot-identify-stage">\s*<button id="lootIdentifyAction"/
  );
});
