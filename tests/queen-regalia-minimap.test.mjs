import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { grantKeyItem, getKeyItem } from "../data/key-items.js";
import { isFullMapRevealActive } from "../js/minimap.js";
import { getQueenRegaliaMinimapEffects } from "../js/queen-regalia-effects.js";

test("the queen regalia grant their separate hidden minimap effects", () => {
  let keyItems = grantKeyItem(null, "queen_tiara").keyItems;
  assert.deepEqual(getQueenRegaliaMinimapEffects(keyItems), {
    npcDetectionActive: true,
    stairsDetectionActive: false,
    treasureDetectionActive: false,
    fullMapRevealActive: false
  });

  keyItems = grantKeyItem(keyItems, "queen_earring").keyItems;
  assert.deepEqual(getQueenRegaliaMinimapEffects(keyItems), {
    npcDetectionActive: true,
    stairsDetectionActive: true,
    treasureDetectionActive: true,
    fullMapRevealActive: false
  });

  keyItems = grantKeyItem(keyItems, "queen_necklace").keyItems;
  assert.equal(getQueenRegaliaMinimapEffects(keyItems).fullMapRevealActive, true);
});

test("the necklace map reveal requires an effective torch", () => {
  assert.equal(isFullMapRevealActive({ torchFuel: 0, torchEffectForced: false, fullMapRevealActive: true }), false);
  assert.equal(isFullMapRevealActive({ torchFuel: 1, torchEffectForced: false, fullMapRevealActive: true }), true);
  assert.equal(isFullMapRevealActive({ torchFuel: 0, torchEffectForced: true, fullMapRevealActive: true }), true);
  assert.equal(isFullMapRevealActive({ torchFuel: 100, torchEffectForced: false, fullMapRevealActive: false }), false);
});

test("the hidden effects do not change the player-facing key-item descriptions", () => {
  for (const id of ["queen_tiara", "queen_earring", "queen_necklace"]) {
    assert.doesNotMatch(getKeyItem(id).description, /ミニマップ|NPC|宝箱|階段|未踏破/);
  }
});

test("B100F minimap blocking remains higher priority than the regalia", async () => {
  const [mainSource, rendererSource, minimapSource] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../js/minimap.js", import.meta.url), "utf8")
  ]);
  assert.match(mainSource, /state\.minimapBlocked = currentDepth === 100/);
  assert.match(mainSource, /npcDetectionActive:[\s\S]*regaliaEffects\.npcDetectionActive/);
  assert.match(mainSource, /stairsDetectionActive:[\s\S]*regaliaEffects\.stairsDetectionActive/);
  assert.match(mainSource, /treasureDetectionActive:[\s\S]*regaliaEffects\.treasureDetectionActive/);
  assert.match(rendererSource, /if \(state\?\.minimapBlocked\) return false/);
  assert.match(minimapSource, /npcDetectionActive = floorDetectionActive \|\| \(effectiveTorchActive && state\.npcDetectionActive\)/);
  assert.match(minimapSource, /isMapVisible = isExplored \|\| fullMapRevealActive/);
  assert.doesNotMatch(minimapSource, /explored\[[^\]]+\]\[[^\]]+\]\s*=\s*true/);
});
