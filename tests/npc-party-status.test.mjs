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
  assert.match(ui, /records\?\.\[npc\.id\]\?\.charge/);
  assert.match(ui, /classList\.toggle\("is-charged", normalized >= 100\)/);
  assert.match(css, /\.npc-status-slot\.is-charged \.npc-charge-gauge/);
  assert.match(css, /animation:npc-charge-ready 1s ease-in-out infinite/);
});

test("NPC charge skill cut-ins use the four battle assets and a sequential 2.5 second presentation", async () => {
  const [html, css, support, battle, main] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("css/battle.css", root), "utf8"),
    readFile(new URL("combat/npc-support.js", root), "utf8"),
    readFile(new URL("js/battle.js", root), "utf8"),
    readFile(new URL("js/main.js", root), "utf8")
  ]);
  assert.match(html, /id="npcChargeCutIn"/);
  for (const image of ["NPC_01.avif", "NPC_02.avif", "NPC_03.avif", "NPC_04.avif"]) {
    assert.match(support, new RegExp(`images/battle_effects/${image}`));
  }
  assert.match(html, /<section id="battleScreen"[\s\S]*?<div id="npcChargeCutIn"[\s\S]*?<div class="battle-enemy-stage">/);
  assert.match(css, /\.npc-charge-cut-in img\s*\{[\s\S]*height: 80%[\s\S]*max-width: 95%/);
  assert.match(support, /message: `\$\{getNpcDefinition\(npcId\)\?\.name\}「\$\{upgradedName \|\| config\.quote\}」`/);
  assert.match(css, /animation: npc-charge-cut-in-run 2\.5s/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(battle, /event\.type === "npcChargeSkill"[\s\S]*await playNpcChargeCutIn\(event\)/);
  assert.match(battle, /await delay\(reduced \? 450 : 2500\)/);
  assert.match(main, /onNpcCharge: \(npcId, charge\) => setNpcPartyCharge/);
});

test("Rebecca defense down is visible on the enemy name without expanding the charge message", async () => {
  const [css, battle] = await Promise.all([
    readFile(new URL("css/battle.css", root), "utf8"),
    readFile(new URL("js/battle.js", root), "utf8")
  ]);

  assert.match(battle, /enemyName\?\.classList\.toggle\("is-defense-down", hasEnemyDefenseDown\(battle\.enemy\)\)/);
  assert.match(battle, /"npc_defense_down"/);
  assert.match(battle, /"charge_defense_down_15"/);
  assert.match(battle, /"charge_defense_down_25"/);
  assert.match(css, /\.battle-enemy-name\.is-defense-down\s*\{[\s\S]*?color: #36a9ff/);
  assert.match(css, /\.battle-enemy-name\.is-defense-down::after\s*\{[\s\S]*?content: "⏬"/);
  assert.match(css, /body\.layout-pc \.message\.is-npc-charge-skill\s*\{[\s\S]*?height: 71px;[\s\S]*?max-height: 71px/);
  assert.match(css, /\.message\.is-npc-charge-skill\s*\{[\s\S]*?white-space: nowrap/);
});

test("NPC management reserves four rows and follows keyboard selection while scrolling", async () => {
  const css = await readFile(new URL("css/town.css", root), "utf8");
  const town = await readFile(new URL("js/town.js", root), "utf8");

  assert.match(css, /\.town-commerce-overlay\.is-npc-management \.town-commerce-list\{height:132px;min-height:132px\}/);
  assert.match(town, /commerceOverlay\.classList\.add\("is-npc-management"\)/);
  assert.match(town, /commerceList\.children\[town\.npcManagementIndex\]\?\.scrollIntoView\?\.\(\{ block: "nearest" \}\)/);
  assert.match(town, /commerceOverlay\.classList\.remove\("is-npc-management"\)/);
  assert.doesNotMatch(town, /を雇用しますか？\\n\$\{npc\.supportDescription\}/);
  assert.match(town, /を雇用しますか？\\n雇用費：\$\{fee\}G　所持金：\$\{character\.gold\}G\\n/);
  assert.match(town, /NPC_HIRE_GREETINGS/);
  assert.match(town, /erika: "あなたに黄金の稲穂の女神が微笑みますように…。"/);
  assert.match(town, /showNpcHireGreeting\(npc\)/);
  assert.match(town, /portrait\.classList\.add\("is-hire-greeting"\)/);
  assert.match(town, /\(\?:：\|「\)/);
  assert.match(css, /\.town-portrait\.is-hire-greeting\{z-index:5/);
});

test("touch selection requires a second tap for NPC hiring and guild quests", async () => {
  const town = await readFile(new URL("js/town.js", root), "utf8");

  assert.match(town, /npcManagementPointerArmedIndex === index[\s\S]*handleNpcManagementInput\("confirm"\)/);
  assert.match(town, /npcManagementPointerArmedIndex = index[\s\S]*renderNpcManagement\(\)/);
  assert.match(town, /questPointerArmedIndex === index[\s\S]*activateSelectedQuest\(\)/);
  assert.match(town, /questPointerArmedIndex = index[\s\S]*renderGuildQuestList\(\)/);
});
