import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("boss and mimic battles conceal enemies when the torch is empty", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(
    source,
    /startBattle\(createBossCombatant\(boss\),\s*\{[\s\S]{0,180}concealed:\s*state\.torchFuel <= 0/
  );
  assert.match(
    source,
    /startBattle\(mimic,\s*\{[\s\S]{0,180}concealed:\s*state\.torchFuel <= 0/
  );
  assert.doesNotMatch(source, /startBattle\(createBossCombatant\(boss\)[\s\S]{0,160}concealed:\s*false/);
});
