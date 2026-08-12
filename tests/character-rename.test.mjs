import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import {
  CHARACTER_NAME_MAX_LENGTH,
  CHARACTER_RENAME_COST,
  normalizeCharacterName,
  renameCharacter
} from "../data/character-name.js";

test("temple renaming changes only the name and fixed fee", () => {
  const character = createInitialCharacter({ name: "OLD", job: "thief" });
  character.gold = 12000;
  character.quests = { active: ["guild_001"] };
  const before = structuredClone(character);
  const result = renameCharacter(character, "  NEW NAME  ");

  assert.equal(result.accepted, true);
  assert.equal(result.cost, CHARACTER_RENAME_COST);
  assert.equal(result.character.name, "NEW NAME");
  assert.equal(result.character.gold, 2000);
  assert.deepEqual(
    { ...result.character, name: before.name, gold: before.gold },
    before
  );
});

test("temple renaming rejects insufficient gold and empty names without charging", () => {
  const poor = createInitialCharacter({ name: "OLD", job: "warrior" });
  poor.gold = CHARACTER_RENAME_COST - 1;
  const insufficient = renameCharacter(poor, "NEW");
  assert.equal(insufficient.accepted, false);
  assert.equal(insufficient.reason, "insufficientGold");
  assert.strictEqual(insufficient.character, poor);
  assert.equal(poor.gold, CHARACTER_RENAME_COST - 1);

  const funded = { ...poor, gold: CHARACTER_RENAME_COST };
  const empty = renameCharacter(funded, "   ");
  assert.equal(empty.accepted, false);
  assert.equal(empty.reason, "emptyName");
  assert.strictEqual(empty.character, funded);
  assert.equal(funded.gold, CHARACTER_RENAME_COST);
});

test("character names retain the registration trim and twelve-character limit", () => {
  assert.equal(normalizeCharacterName("  ABC  "), "ABC");
  assert.equal(normalizeCharacterName("123456789012345"), "123456789012");
  assert.equal(normalizeCharacterName("123456789012").length, CHARACTER_NAME_MAX_LENGTH);
});

test("a renamed character keeps its name through save serialization and normalization", () => {
  const character = createInitialCharacter({ name: "OLD", job: "priest" });
  character.gold = CHARACTER_RENAME_COST;
  const renamed = renameCharacter(character, "NEW").character;
  const loaded = normalizeCharacter(JSON.parse(JSON.stringify(renamed)));
  assert.equal(loaded.name, "NEW");
  assert.equal(loaded.gold, 0);
});

test("rename cancellation precedes the rename callback and successful UI refreshes are wired", async () => {
  const [townSource, mainSource] = await Promise.all([
    readFile(new URL("../js/town.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  const inputStart = townSource.indexOf("function handleTempleRenameInput(action)");
  const inputEnd = townSource.indexOf("function renameCharacterAtTemple()", inputStart);
  const inputHandler = townSource.slice(inputStart, inputEnd);
  assert.ok(inputHandler.indexOf('action === "cancel"') >= 0);
  assert.equal(inputHandler.includes("town.onRename"), false);

  const callbackStart = mainSource.indexOf("function renameCharacterAtTemple(name)");
  const callbackEnd = mainSource.indexOf("function acquireEventCard", callbackStart);
  const callback = mainSource.slice(callbackStart, callbackEnd);
  assert.match(callback, /updateCharacterUi\(\);\s+renderCharacterStatus\(\);\s+saveGame\(\);/);
});
