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
