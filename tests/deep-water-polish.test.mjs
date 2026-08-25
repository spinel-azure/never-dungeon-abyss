import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getIconDrawer } from "../card/icon-registry.js";
import { getBossById } from "../data/bosses.js";
import { getQuestById } from "../data/quests.js";

const battleSource = fs.readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const battleCss = fs.readFileSync(new URL("../css/battle.css", import.meta.url), "utf8");

test("Lightning Armament uses a registered elemental sword icon", () => {
  assert.equal(typeof getIconDrawer("lightning-sword"), "function");
});

test("Jirene rematch and victory presentation use the requested assets and copy", () => {
  const jirene = getBossById("jirene_b79f");
  assert.match(jirene.event.remains, /もうこの水辺に歌声が響くことはないだろう/);
  assert.match(mainSource, /また、私…いえ、妾の歌を…聴きたいのね/);
  assert.match(mainSource, /showNamedItemGetEffect\(\[equipment\?\.name/);
  assert.match(battleSource, /is-jirene[^\n]+jirene_b79f/);
  assert.match(battleCss, /battle-enemy-image\.is-size-large\s*\{[^}]*width:\s*min\(78%,\s*520px\)/s);
});

test("quest 028 reporting unlocks the B80 transfer portal", () => {
  assert.deepEqual(getQuestById("guild_028").reportUnlockFlags, ["transfer_portal_b80f_unlocked"]);
});

test("Mana Booster and DEF overcap presentation are visible", () => {
  assert.match(battleSource, /showBattleNumber\("player", openingBattle\.manaBoosterRecovery, "sp-healing"\)/);
  assert.match(mainSource, /key === "def" && total > 30/);
  assert.match(mainSource, /#43d86f/);
  assert.match(mainSource, /#e6bd35/);
});
