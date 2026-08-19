import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("battle skills hide passives and paginate as two columns of six", async () => {
  const [source, styles, html] = await Promise.all([
    readFile(new URL("../js/skill-overlay.js", import.meta.url), "utf8"),
    readFile(new URL("../css/skill-overlay.css", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);

  assert.match(source, /BATTLE_SKILLS_PER_COLUMN = 6/);
  assert.match(source, /BATTLE_SKILLS_PER_PAGE = BATTLE_SKILLS_PER_COLUMN \* 2/);
  assert.match(source, /context !== "battle" \|\| skill\.actionType !== "passive"/);
  assert.match(source, /is-charge-ready/);
  assert.match(styles, /\.skill-overlay\.is-battle-skills \.skill-overlay-list[\s\S]*repeat\(6,[\s\S]*repeat\(2,/);
  assert.match(styles, /\.skill-overlay-item\.is-charge-ready[\s\S]*#ffe95b/);
  assert.match(html, /data-skill-prev/);
  assert.match(html, /data-skill-next/);
});


test("item and skill overlays remember the last used selection separately by context", async () => {
  const [items, skills] = await Promise.all([
    readFile(new URL("../js/item-overlay.js", import.meta.url), "utf8"),
    readFile(new URL("../js/skill-overlay.js", import.meta.url), "utf8")
  ]);
  for (const source of [items, skills]) {
    assert.match(source, /lastSelectionByContext/);
    assert.match(source, /restoreSelectedIndex/);
    assert.match(source, /\{ id: .*\.id, index: overlay\.selectedIndex \}/);
  }
});

test("battle items paginate as two columns of six without vertical scrolling", async () => {
  const [source, styles, html] = await Promise.all([
    readFile(new URL("../js/item-overlay.js", import.meta.url), "utf8"),
    readFile(new URL("../css/skill-overlay.css", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  assert.match(source, /BATTLE_ITEMS_PER_COLUMN = 6/);
  assert.match(source, /BATTLE_ITEMS_PER_PAGE = BATTLE_ITEMS_PER_COLUMN \* 2/);
  assert.match(source, /Math\.ceil\(overlay\.items\.length \/ BATTLE_ITEMS_PER_PAGE\)/);
  assert.match(styles, /\.skill-overlay\.is-battle-items \.skill-overlay-list[\s\S]*repeat\(6,[\s\S]*repeat\(2,/);
  assert.match(html, /data-item-prev/);
  assert.match(html, /data-item-next/);
});
