import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { getGuildQuestPageSize } from "../js/guild-quest-pagination.js";

test("guild quest page size stays between three and six across layouts", () => {
  assert.equal(getGuildQuestPageSize({ width: 390, height: 600, layout: "mobile" }), 3);
  assert.equal(getGuildQuestPageSize({ width: 430, height: 780, layout: "mobile" }), 4);
  assert.equal(getGuildQuestPageSize({ width: 820, height: 700, layout: "tablet" }), 4);
  assert.equal(getGuildQuestPageSize({ width: 1024, height: 768, layout: "tablet" }), 5);
  assert.equal(getGuildQuestPageSize({ width: 1366, height: 768, layout: "desktop" }), 5);
  assert.equal(getGuildQuestPageSize({ width: 1920, height: 1080, layout: "desktop" }), 6);
});

test("guild quest list keeps pager controls and clips rows inside the notice", async () => {
  const [html, css, townSource] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../css/town.css", import.meta.url), "utf8"),
    readFile(new URL("../js/town.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="guildQuestPager"[\s\S]*data-quest-page="-1"[\s\S]*◀[\s\S]*data-quest-page="1"[\s\S]*▶/);
  assert.match(css, /\.guild-quest-list\{[^}]*overflow:hidden/);
  assert.match(css, /\.guild-quest-pager\{[^}]*bottom:4%/);
  assert.match(townSource, /pager\.hidden = pageCount <= 1/);
  assert.match(townSource, /window\.addEventListener\("resize"[\s\S]*renderGuildQuestList/);
});