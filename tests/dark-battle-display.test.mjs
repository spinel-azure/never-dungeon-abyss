import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("boss and mimic battles conceal enemies when the torch is empty", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(
    source,
    /startBattle\(bossCombatant,\s*\{[\s\S]{0,240}concealed:\s*state\.torchFuel <= 0/
  );
  assert.match(
    source,
    /startBattle\(mimic,\s*\{[\s\S]{0,180}concealed:\s*state\.torchFuel <= 0/
  );
  assert.doesNotMatch(source, /startBattle\(bossCombatant[\s\S]{0,240}concealed:\s*false/);
});

test("concealed enemies retain a blue-white glowing silhouette in darkness", async () => {
  const css = await readFile(new URL("../css/battle.css", import.meta.url), "utf8");
  assert.match(css, /\.battle-enemy-image\.is-concealed\s*\{[\s\S]*?brightness\(0\)[\s\S]*?drop-shadow\(0 0 2px rgba\(225, 252, 255, \.98\)\)[\s\S]*?battle-concealed-glow/);
  assert.match(css, /\.battle-enemy-member \.battle-enemy-member-image\.is-concealed\s*\{[\s\S]*?drop-shadow\(0 0 6px rgba\(128, 235, 255, \.88\)\)/);
});
