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
  assert.match(css, /\.npc-party-status\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /body\.menu-open \.quick-status,body\.menu-open \.npc-party-status/);
  assert.match(ui, /root\.hidden = !NPC_SUPPORT_ENABLED/);
  assert.match(ui, /canHireNpc \? "NPC参加可能" : "――――"/);
  assert.match(ui, /is-unavailable/);
});

test("NPC management reserves four rows and follows keyboard selection while scrolling", async () => {
  const css = await readFile(new URL("css/town.css", root), "utf8");
  const town = await readFile(new URL("js/town.js", root), "utf8");

  assert.match(css, /\.town-commerce-overlay\.is-npc-management \.town-commerce-list\{height:132px;min-height:132px\}/);
  assert.match(town, /commerceOverlay\.classList\.add\("is-npc-management"\)/);
  assert.match(town, /commerceList\.children\[town\.npcManagementIndex\]\?\.scrollIntoView\?\.\(\{ block: "nearest" \}\)/);
  assert.match(town, /commerceOverlay\.classList\.remove\("is-npc-management"\)/);
});
