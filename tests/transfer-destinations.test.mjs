import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getBossById } from "../data/bosses.js";
import { grantKeyItem } from "../data/key-items.js";

import {
  TRANSFER_DESTINATIONS,
  getUnlockedTransferDestinations,
  isTransferDestinationUnlocked
} from "../data/transfer-destinations.js";

test("transfer destinations are data-driven and expose only unlocked floors", () => {
  const character = { highestDungeonDepthReached: 1, eventFlags: {} };
  assert.deepEqual(getUnlockedTransferDestinations(character), []);
  character.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.deepEqual(getUnlockedTransferDestinations(character).map(entry => entry.depth), [10]);
  character.eventFlags.boss_fallen_mage_b19f_defeated = true;
  assert.deepEqual(getUnlockedTransferDestinations(character).map(entry => entry.depth), [10, 20]);
  assert.equal(isTransferDestinationUnlocked(character, 20), true);
  assert.equal(isTransferDestinationUnlocked(character, 30), false);
  character.eventFlags.boss_iron_maiden_b29f_defeated = true;
  assert.deepEqual(getUnlockedTransferDestinations(character).map(entry => entry.depth), [10, 20, 30]);
  assert.equal(isTransferDestinationUnlocked(character, 30), true);
  character.eventFlags.boss_wicker_man_b39f_defeated = true;
  character.eventFlags.boss_eiskoenigin_b49f_defeated = true;
  character.eventFlags.boss_fleischfresser_b59f_defeated = true;
  character.eventFlags.boss_b69f_defeated = true;
  character.eventFlags.boss_jirene_b79f_defeated = true;
  character.eventFlags.boss_b89f_defeated = true;
  character.eventFlags.boss_b99f_defeated = true;
  assert.deepEqual(getUnlockedTransferDestinations(character).map(entry => entry.depth), [10, 20, 30, 40, 50, 60, 70, 80, 90]);
  assert.equal(isTransferDestinationUnlocked(character, 100), false);
  for (const keyItemId of ["queen_tiara", "queen_earring", "queen_necklace"]) {
    character.keyItems = grantKeyItem(character.keyItems, keyItemId).keyItems;
  }
  assert.deepEqual(getUnlockedTransferDestinations(character).map(entry => entry.depth), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  assert.equal(isTransferDestinationUnlocked(character, 100), true);
  assert.ok(TRANSFER_DESTINATIONS.every(entry => entry.label === `B${entry.depth}F`));
});

test("achievement popup uses the k8x12 font and queues newly achieved records", async () => {
  const [html, css, source] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../css/town.css", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="achievementUnlockedEffect"[^>]*>実績解除</);
  assert.match(css, /\.achievement-unlocked-effect\{[^}]*"PixelFont"/s);
  assert.match(source, /achievementNotificationQueue\.push\(\.\.\.newlyUnlocked\)/);
  assert.match(source, /playSe\("achievementUnlocked"\)/);
  assert.match(source, /document\.body\.append\(achievementUnlockedEffect\)/);
  assert.match(css, /\.achievement-unlocked-effect\{[^}]*border-radius:15px/s);
  assert.match(css, /achievement-unlocked-popup 4\.2s/);
  assert.match(source, /await wait\(4200\)/);
});

test("Eiskoenigin alone receives a reduced-motion-safe multi-sparkle layer", async () => {
  const [html, css, battleSource] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../css/battle.css", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /battle-eiskoenigin-sparkles[^>]*>[\s\S]*?<i><\/i>/);
  assert.match(battleSource, /is-eiskoenigin[^\n]+eiskoenigin_b49f/);
  assert.match(css, /@keyframes battle-eiskoenigin-sparkle/);
  assert.match(css, /prefers-reduced-motion:[\s\S]*battle-eiskoenigin-sparkles/s);
});

test("Glacies and Eiskoenigin use dedicated large boss image sizes", async () => {
  const [css, battleSource] = await Promise.all([
    readFile(new URL("../css/battle.css", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(battleSource, /is-glacies[^\n]+glacies_event_boss/);
  assert.match(css, /battle-enemy-image\.is-size-large\s*\{[^}]*width:\s*min\(78%,\s*520px\)/s);
  assert.match(battleSource, /is-eiskoenigin[^\n]+eiskoenigin_b49f/);
  assert.equal(getBossById("eiskoenigin_b49f").battleSize, "large");
});

test("Fleischfresser uses its dedicated large battle image size", async () => {
  const [css, battleSource] = await Promise.all([
    readFile(new URL("../css/battle.css", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(battleSource, /is-fleischfresser[^\n]+fleischfresser_b59f/);
  assert.match(css, /battle-enemy-image\.is-size-huge-wide\s*\{[^}]*width:\s*min\(90%,\s*600px\)/s);
});

test("Otherworldly Wisdom uses its dedicated large battle image size", async () => {
  const [css, battleSource] = await Promise.all([
    readFile(new URL("../css/battle.css", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(battleSource, /is-otherworldly-wisdom[^\n]+otherworldly_wisdom_b4f/);
  assert.equal(getBossById("otherworldly_wisdom_b4f").battleSize, "huge-wide");
});

test("Todes Scorpio uses a dedicated superboss image size", async () => {
  const [css, battleSource] = await Promise.all([
    readFile(new URL("../css/battle.css", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(battleSource, /is-todes-scorpio[^\n]+todes_scorpio_b64f/);
  assert.equal(getBossById("todes_scorpio_b64f").battleSize, "huge-wide");
  assert.equal(getBossById("sphinx_b69f").battleSize, "huge-wide");
  assert.match(battleSource, /is-sphinx[^\n]+sphinx_b69f/);
});

test("transfer destination UI is separate from the six command slots and paginates by five", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/town.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="transferDestinationOverlay"/);
  assert.match(html, /id="transferDestinationList"/);
  assert.match(source, /const pageSize = 5;/);
  assert.doesNotMatch(source, /entranceButtons\.forEach\(\(button, index\) => \{\s+if \(index < depths\.length\)/);
});

test("closing the transfer UI restores the shared dungeon and battle command area", async () => {
  const source = await readFile(new URL("../js/town.js", import.meta.url), "utf8");
  const showGameCommands = source.match(/function showGameCommands\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(showGameCommands, /town\.commandRoot\.hidden = false;/);
  assert.match(showGameCommands, /town\.transferOverlay\.hidden = true;/);
});

test("Iron Maiden sizing cannot shrink the boss HP meter", async () => {
  const css = await readFile(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(css, /\.battle-boss-hp-meter\s*\{[^}]*flex:\s*0 0 10px;[^}]*box-sizing:\s*border-box;/s);
});
