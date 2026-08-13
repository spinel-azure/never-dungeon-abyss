import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  character.eventFlags.boss_b49f_defeated = true;
  character.eventFlags.boss_b59f_defeated = true;
  character.eventFlags.boss_b69f_defeated = true;
  character.eventFlags.boss_b79f_defeated = true;
  character.eventFlags.boss_b89f_defeated = true;
  character.eventFlags.boss_b99f_defeated = true;
  assert.deepEqual(getUnlockedTransferDestinations(character).map(entry => entry.depth), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
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
