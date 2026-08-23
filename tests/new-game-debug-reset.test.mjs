import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("NEW GAME forcibly disables every administrator reveal toggle", async () => {
  const [menu, main] = await Promise.all([
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  const reset = menu.match(/export function resetDebugSettingsForNewGame\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  for (const key of ["torchFuelDisabled", "presenceDisabled", "stairsDownVisible", "npcsVisible", "treasuresVisible"]) {
    assert.match(reset, new RegExp(`menu\\.${key} = false`));
  }
  assert.match(reset, /setTorchFuelDisabled\(false\)/);
  assert.match(reset, /setPresenceDisabled\(false\)/);
  assert.match(reset, /applyMinimapRevealOptions\(\)/);
  assert.match(reset, /persistSettings\(\)/);
  assert.match(main, /function startNewGame\(\) \{\s*resetDebugSettingsForNewGame\(\)/);
});