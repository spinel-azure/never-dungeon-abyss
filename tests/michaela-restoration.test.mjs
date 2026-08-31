import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MICHAELA_RESTORATION_DIALOGUE } from "../js/michaela-restoration.js";
import { getKeyItem, grantKeyItem } from "../data/key-items.js";
import { createInitialCharacter } from "../data/classes.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { createBattleState } from "../combat/battle-engine.js";
import { createBattleCompletionSnapshot } from "../js/battle.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the truth staff is a unique unsellable key item", () => {
  const item = getKeyItem("truth_staff");
  assert.equal(item.name, "真実の杖");
  assert.equal(item.sellable, false);
  assert.equal(item.consumable, false);
  const first = grantKeyItem(null, item.id);
  const duplicate = grantKeyItem(first.keyItems, item.id);
  assert.equal(first.gained, true);
  assert.equal(duplicate.gained, false);
  assert.equal(duplicate.reason, "alreadyOwned");
});

test("Michaela restoration preserves all six requested dialogue pages", () => {
  assert.equal(MICHAELA_RESTORATION_DIALOGUE.length, 6);
  assert.match(MICHAELA_RESTORATION_DIALOGUE[0], /カッツェンラントの女王/);
  assert.match(MICHAELA_RESTORATION_DIALOGUE[1], /アカシックレコード/);
  assert.match(MICHAELA_RESTORATION_DIALOGUE[2], /王家の血統/);
  assert.match(MICHAELA_RESTORATION_DIALOGUE[3], /無力な猫の姿/);
  assert.match(MICHAELA_RESTORATION_DIALOGUE[4], /平和の象徴たる真実の杖/);
  assert.match(MICHAELA_RESTORATION_DIALOGUE[5], /カッツェンシュタット/);
});

test("Amayenak victory persists recovery flags and returns to the B100F entrance", () => {
  const main = read("js/main.js");
  assert.match(main, /defeatedEnemyId === "amayenak_b100f"[\s\S]*?!character\?\.eventFlags\?\.michaela_restored/);
  assert.match(main, /truth_staff_obtained: true/);
  assert.match(main, /michaela_restored: true/);
  assert.match(main, /cells\.flat\(\)\.find\(cell => cell\.fixedReturnPoint\)/);
  assert.match(main, /applyFixedFloorWarp\(\{ to: \{ x: returnPoint\.x, y: returnPoint\.y \}, facing: "W" \}\)/);
  assert.match(main, /boss_amayenak_b100f_defeated[\s\S]*?resumeMichaelaRestoration/);
});

test("the real battle completion snapshot reaches the restoration bridge with Amayenak's ID", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const enemy = createBossCombatant(getBossById("amayenak_b100f"));
  const battle = createBattleState({ character, enemy });
  battle.encounterBossId = enemy.id;
  battle.enemy.hp = 0;
  battle.enemy.alive = false;
  battle.outcome = "victory";
  const snapshot = createBattleCompletionSnapshot(battle);
  assert.equal(snapshot.outcome, "victory");
  assert.equal(snapshot.enemy.id, "amayenak_b100f");
  assert.equal(snapshot.defeatedEnemyId, "amayenak_b100f");
  const main = read("js/main.js");
  assert.match(main, /defeatedEnemyId === "amayenak_b100f"/);
  assert.match(main, /void runMichaelaRestoration\(\);\s*return;/);
});

test("restoration overlay uses the cat and both Michaela portraits", () => {
  const html = read("index.html");
  const css = read("css/scene-transition.css");
  assert.match(html, /mikan_silhouette\.avif/);
  assert.match(html, /NPC_01c\.avif/);
  assert.match(html, /NPC_01d\.avif/);
  assert.match(read("js/michaela-restoration.js"), /女王ミカエラ/);
  assert.match(css, /michaela-cat-rising/);
  assert.match(css, /michaela-human-reveal/);
  assert.match(css, /is-crossfade/);
  assert.match(css, /\.michaela-restoration\{position:absolute;inset:0/);
  assert.doesNotMatch(css, /\.michaela-restoration\{position:fixed/);
  assert.match(html, /<div class="viewport">[\s\S]*?<section id="michaelaRestoration"/);
  assert.doesNotMatch(html, /michaelaRestorationDialogue/);
  assert.match(read("js/main.js"), /onMessage: say/);
  assert.match(read("js/michaela-restoration.js"), /classList\.remove\("michaela-message-active"\);\s*onMessage\?\.\(""\)/);
  assert.match(read("css/style.css"), /body\.michaela-message-active \.message/);
});

test("restoration returns silently without an unrelated floor transition message", () => {
  const main = read("js/main.js");
  assert.doesNotMatch(main, /say\("第100層\\n↓\\n奈落入口"\)/);
});

test("only main.js receives the new cache buster", () => {
  const html = read("index.html");
  assert.match(html, /js\/main\.js\?v=20260831-02/);
  assert.doesNotMatch(read("js/main.js"), /from\s+["'][^"']+\?v=/);
});
