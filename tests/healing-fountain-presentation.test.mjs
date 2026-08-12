import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("healing fountain isolates its jingle, resets presence, and resumes dungeon BGM", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  const start = source.indexOf("async function restAtHealingFountain()");
  const end = source.indexOf("async function stayAtInnStable()", start);
  const fountain = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.ok(fountain.indexOf("stopBgm()") < fountain.indexOf("playSeSequence(\"goodNight\", 1)"));
  assert.match(fountain, /refillTorch\(\);\s+resetPresence\(\);\s+updateCharacterUi\(\);\s+updateHud\(\);\s+saveGame\(\);/);
  assert.ok(fountain.indexOf("startBgm(selectDungeonBgm())") > fountain.indexOf("runSceneTransition"));
});

test("Iron Maiden has a dedicated reduced-motion-safe pendulum presentation", async () => {
  const [battleSource, css] = await Promise.all([
    readFile(new URL("../js/battle.js", import.meta.url), "utf8"),
    readFile(new URL("../css/battle.css", import.meta.url), "utf8")
  ]);

  assert.match(battleSource, /is-iron-maiden[^\n]+iron_maiden_b29f/);
  assert.match(css, /\.battle-enemy-image\.is-iron-maiden\s*\{[^}]*width:\s*min\(70%,\s*450px\)/s);
  assert.match(css, /@keyframes battle-iron-maiden-pendulum/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.battle-enemy-image\.is-iron-maiden[\s\S]*animation:\s*none/);
});
