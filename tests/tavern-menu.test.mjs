import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const townSource = await readFile(new URL("../js/town.js", import.meta.url), "utf8");
const menuSource = await readFile(new URL("../js/menu.js", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("tavern menu reserves the requested five-command layout", () => {
  const tavernCommands = townSource.match(/tavern:\s*\[([\s\S]*?)\n\s*\]/)?.[1] || "";
  const expected = [
    '["npc-hire", "NPC雇用"]',
    '["rumors", "噂話"]',
    '["past-rumors", "過去の噂話"]',
    '["talk", "話す"]',
    '["return", "町に戻る"]'
  ];

  let previousIndex = -1;
  for (const command of expected) {
    const index = tavernCommands.indexOf(command);
    assert.ok(index > previousIndex, `${command} should appear in the requested order`);
    previousIndex = index;
  }
});

test("NPC hiring opens its implemented submenu while past rumors remain available", () => {
  assert.match(
    townSource,
    /npcHire:\s*\[[\s\S]*?"npc-search"[\s\S]*?"npc-roster"[\s\S]*?"npc-hire-return"/
  );
  assert.match(townSource, /if \(command === "npc-hire"\)/);
  assert.match(townSource, /facilityId === "tavern" && id === "past-rumors"/);
});

test("past rumors open a paginated history panel from the tavern", () => {
  assert.match(townSource, /if \(command === "past-rumors"\)[\s\S]*town\.onOpenRumorHistory\(\)/);
  assert.match(menuSource, /export function openRumorHistory\(\)/);
  assert.match(menuSource, /Math\.ceil\(entries\.length \/ 10\)/);
  assert.match(mainSource, /onOpenRumorHistory:\s*openRumorHistory/);
  assert.match(indexSource, /data-menu-view="rumorHistory"/);
  assert.match(indexSource, /data-rumor-history-description/);
});
