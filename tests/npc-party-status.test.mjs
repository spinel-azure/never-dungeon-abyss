import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("main screen reserves three empty NPC status slots for future party members", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const css = await readFile(new URL("css/game-menu.css", root), "utf8");
  const ui = await readFile(new URL("js/npc-party-ui.js", root), "utf8");

  assert.match(html, /class="npc-party-status"/);
  assert.equal((html.match(/class="npc-status-slot"/g) || []).length, 3);
  assert.match(html, /data-npc-slot="0"/);
  assert.match(html, /data-npc-slot="1"/);
  assert.match(html, /data-npc-slot="2"/);
  assert.equal((html.match(/class="npc-charge-gauge"/g) || []).length, 3);
  assert.equal((html.match(/data-npc-charge-fill/g) || []).length, 3);
  assert.match(css, /\.npc-party-status\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.npc-charge-gauge\{[^}]*background:#555/);
  assert.match(css, /\.npc-charge-gauge i\{[^}]*background:linear-gradient\(90deg,#8c1018,#ef3038\)/);
  assert.match(css, /body\.menu-open \.quick-status,body\.menu-open \.npc-party-status/);
  assert.match(ui, /root\.hidden = !NPC_SUPPORT_ENABLED/);
  assert.match(ui, /canHireNpc \? "NPC参加可能" : "――――"/);
  assert.match(ui, /is-unavailable/);
  assert.match(ui, /export function setNpcPartyCharge/);
  assert.match(ui, /Math\.max\(0, Math\.min\(100, Number\(charge\) \|\| 0\)\)/);
});

test("NPC management reserves four rows and follows keyboard selection while scrolling", async () => {
  const css = await readFile(new URL("css/town.css", root), "utf8");
  const town = await readFile(new URL("js/town.js", root), "utf8");

  assert.match(css, /\.town-commerce-overlay\.is-npc-management \.town-commerce-list\{height:132px;min-height:132px\}/);
  assert.match(town, /commerceOverlay\.classList\.add\("is-npc-management"\)/);
  assert.match(town, /commerceList\.children\[town\.npcManagementIndex\]\?\.scrollIntoView\?\.\(\{ block: "nearest" \}\)/);
  assert.match(town, /commerceOverlay\.classList\.remove\("is-npc-management"\)/);
});

test("touch selection requires a second tap for NPC hiring and guild quests", async () => {
  const town = await readFile(new URL("js/town.js", root), "utf8");

  assert.match(town, /npcManagementPointerArmedIndex === index[\s\S]*handleNpcManagementInput\("confirm"\)/);
  assert.match(town, /npcManagementPointerArmedIndex = index[\s\S]*renderNpcManagement\(\)/);
  assert.match(town, /questPointerArmedIndex === index[\s\S]*activateSelectedQuest\(\)/);
  assert.match(town, /questPointerArmedIndex = index[\s\S]*renderGuildQuestList\(\)/);
});
