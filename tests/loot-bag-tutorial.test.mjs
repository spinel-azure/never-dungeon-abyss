import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";

test("lot bag tutorial starts unseen only for new saves", () => {
  assert.equal(createInitialCharacter({ name: "NEW", job: "warrior" }).lootBagTutorialSeen, false);
  assert.equal(normalizeCharacter({ ...createInitialCharacter({ name: "OLD", job: "warrior" }), lootBagTutorialSeen: undefined }).lootBagTutorialSeen, true);
});

test("lot bag tutorial highlights the action after a three second lock", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../css/town.css", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(html, /id="lootBagTutorial"/);
  assert.match(html, /「次へ」もしくは「鑑定する」を押してください。/);
  assert.match(html, /class="loot-bag-tutorial-card">？カード/);
  assert.match(html, /class="loot-bag-tutorial-weapon">？武器/);
  assert.match(css, /background:rgba\(0,0,0,\.6\)/);
  assert.match(css, /loot-bag-tutorial-card\{display:inline;color:#ffe45c/);
  assert.match(css, /loot-bag-tutorial-weapon\{display:inline;color:#ff9d2e/);
  assert.match(css, /loot-bag-tutorial-content p\{[^}]*"GameFont"/);
  assert.match(main, /lootIdentifyAction\.disabled = true/);
  assert.match(main, /lootBagTutorialTimer = window\.setTimeout\([\s\S]*?3000\)/);
  assert.match(main, /lootBagTutorialSeen: true/);
});
