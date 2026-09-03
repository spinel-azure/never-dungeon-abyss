import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULT_DEBUG_SETTINGS, normalizeDebugSettingsDefaults } from "../js/menu.js";

test("the requested debug settings are the defaults for data without saved options", () => {
  assert.deepEqual(DEFAULT_DEBUG_SETTINGS, {
    stopwatchVisible: false,
    compassVisible: true,
    readoutVisible: true,
    torchFuelDisabled: false,
    presenceDisabled: false,
    stairsDownVisible: false,
    npcsVisible: false,
    treasuresVisible: false
  });
  const normalized = normalizeDebugSettingsDefaults(null);
  assert.equal(normalized.migrated, true);
  assert.deepEqual(
    Object.fromEntries(Object.keys(DEFAULT_DEBUG_SETTINGS).map(key => [key, normalized.settings[key]])),
    DEFAULT_DEBUG_SETTINGS
  );
});

test("existing settings receive the requested defaults once without resetting unrelated options", () => {
  const normalized = normalizeDebugSettingsDefaults({
    stopwatchVisible: true,
    compassVisible: false,
    readoutVisible: false,
    torchFuelDisabled: true,
    presenceDisabled: true,
    stairsDownVisible: true,
    npcsVisible: true,
    treasuresVisible: true,
    bgmEnabled: false,
    touchMovementMode: "stick"
  });
  assert.equal(normalized.migrated, true);
  assert.equal(normalized.settings.debugDefaultsVersion, 1);
  assert.deepEqual(
    Object.fromEntries(Object.keys(DEFAULT_DEBUG_SETTINGS).map(key => [key, normalized.settings[key]])),
    DEFAULT_DEBUG_SETTINGS
  );
  assert.equal(normalized.settings.bgmEnabled, false);
  assert.equal(normalized.settings.touchMovementMode, "stick");
});

test("a migrated setting keeps later user changes", () => {
  const saved = {
    debugDefaultsVersion: 1,
    stopwatchVisible: true,
    compassVisible: false,
    readoutVisible: false,
    stairsDownVisible: true
  };
  const normalized = normalizeDebugSettingsDefaults(saved);
  assert.equal(normalized.migrated, false);
  assert.deepEqual(normalized.settings, saved);
});

test("NEW GAME reapplies every requested setting and its display hooks", async () => {
  const [menu, main] = await Promise.all([
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  const reset = menu.match(/export function resetDebugSettingsForNewGame\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(reset, /Object\.assign\(menu, DEFAULT_DEBUG_SETTINGS\)/);
  assert.match(reset, /applyDisplayOptions\(\)/);
  assert.match(reset, /setTorchFuelDisabled\(menu\.torchFuelDisabled\)/);
  assert.match(reset, /setPresenceDisabled\(menu\.presenceDisabled\)/);
  assert.match(reset, /applyMinimapRevealOptions\(\)/);
  assert.match(reset, /setStopwatchVisible\(menu\.stopwatchVisible\)/);
  assert.match(reset, /persistSettings\(\)/);
  assert.match(menu, /const normalized = normalizeDebugSettingsDefaults\(stored\)/);
  assert.match(menu, /if \(normalized\.migrated\) persistSettings\(\)/);
  assert.match(menu, /debugDefaultsVersion: DEBUG_DEFAULTS_VERSION/);
  assert.match(main, /function startNewGame\(\) \{\s*resetDebugSettingsForNewGame\(\)/);
});
